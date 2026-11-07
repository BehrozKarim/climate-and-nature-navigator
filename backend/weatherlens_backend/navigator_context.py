from collections import Counter
import json
from .navigator_common import finding, model, numeric, table_source, unique


SCREENS = ['overview', 'inventory', 'freight', 'pathways', 'climate', 'nature', 'review']
ENTITY_TABLES = ('farm_registry', 'suppliers', 'shipments', 'actions', 'catchments', 'factors', 'sites', 'parcels')
TRANSITION_VALUES = ('carbon_price_eur_t', 'eu_ets2_fuel_price_eur_t', 'electricity_price_eur_mwh', 'n_fertiliser_price_index', 'diesel_price_index', 'plant_based_demand_index', 'frozen_veg_import_premium_pct')
SCOPES = ('scope1', 'scope2_market', 'scope3')


class NavigatorContext:
    def __init__(self, store, dataset_id):
        self.store, self.ds = store, dataset_id
        self.manifest = store.dataset(dataset_id)

    def catalog(self):
        transitions, issues = unique(self.store.rows(self.ds, 'transition_scenarios'), ('scenario', 'year'))
        by_name = {}
        for r in transitions:
            v = r['values']
            item = by_name.setdefault(v['scenario'], {'id': v['scenario'], 'physical_proxy': v.get('physical_pathway_proxy'), 'narrative': v.get('narrative'), 'years': []})
            item['years'].append(int(v['year']))
        return {'dataset_id': self.ds, 'screens': SCREENS, 'physical_scenarios': ['ssp126', 'ssp245', 'ssp585'], 'horizon_years': [2030, 2040, 2050], 'transition_scenarios': list(by_name.values()), 'defaults': model('scenario')['parameters']['defaults'], 'crops': model('climate')['parameters']['crops'], 'issues': issues, 'model_sections': ['scenario', 'pathway', 'climate', 'nature', 'routing']}

    def scenario(self, physical_scenario, year, transition_scenario=None):
        defaults = model('scenario')
        if physical_scenario not in defaults['parameters']['defaults'] or not isinstance(year, int) or isinstance(year, bool):
            raise ValueError('Choose a supported physical scenario and integer horizon year')
        transition = transition_scenario or defaults['parameters']['defaults'][physical_scenario]
        raw = [r for r in self.store.rows(self.ds, 'transition_scenarios') if r['values'].get('scenario') == transition]
        rows, issues = unique(raw, ('scenario', 'year'))
        quarantined_rows = {i['source']['row_number'] for i in issues if i['code'] == 'duplicate_conflict'}
        quarantined_years = {int(r['values']['year']) for r in raw if r['source']['row_number'] in quarantined_rows}
        anchors = sorted((int(r['values']['year']), r) for r in rows)
        if not anchors or not anchors[0][0] <= year <= anchors[-1][0]:
            raise ValueError('Transition scenario unavailable at this year; extrapolation is disabled')
        lower = max((a for a in anchors if a[0] <= year), key=lambda a: a[0])
        upper = min((a for a in anchors if a[0] >= year), key=lambda a: a[0])
        if any(lower[0] <= y <= upper[0] for y in quarantined_years):
            raise ValueError('Conflicting transition anchors make this year or interpolation interval unavailable')
        weight = 0 if lower[0] == upper[0] else (year - lower[0]) / (upper[0] - lower[0])
        values = {}
        for key in TRANSITION_VALUES:
            lo, hi = lower[1]['values'].get(key), upper[1]['values'].get(key)
            values[key] = numeric(lo, key) * (1 - weight) + numeric(hi, key) * weight if lo not in ('', None) and hi not in ('', None) else None
        sources = [lower[1]['source']] + ([upper[1]['source']] if upper[0] != lower[0] else [])
        return {'dataset_id': self.ds, 'method_version': 'navigator-transition-interpolation-v2', 'physical_scenario': physical_scenario, 'transition_scenario': transition, 'year': year, 'values': values, 'anchor_years': sorted({lower[0], upper[0]}), 'interpolated': lower[0] != upper[0], 'matches_supplied_physical_proxy': lower[1]['values'].get('physical_pathway_proxy') == physical_scenario, 'sources': sources, 'issues': issues, 'model': defaults, 'value_status': 'illustrative_transition_scenario', 'limitations': ['Physical and transition scenarios are distinct choices; the preset is an illustrative association.', 'Prices and indices are supplied synthetic scenario values, not verified forecasts or trading prices.', 'Linear interpolation within provided anchors; no extrapolation or bridging conflicting anchors.']}

    def quality_findings(self):
        history, _ = unique(self.store.rows(self.ds, 'published_inventory_history'), ('year',))
        drafts, _ = unique(self.store.rows(self.ds, 'draft_report_summary_2025'), ('year', 'line'))
        output = []
        for year in sorted({int(r['values']['year']) for r in drafts}):
            comparison = [r for r in history if int(r['values']['year']) < year]
            prior = max(comparison, key=lambda r: int(r['values']['year'])) if comparison else None
            lines = {r['values']['line']: r for r in drafts if int(r['values']['year']) == year}
            for scope in SCOPES:
                if scope not in lines or prior is None:
                    continue
                value = numeric(lines[scope]['values']['tco2e'])
                previous = numeric(prior['values'].get(scope))
                if previous > 0 and value / previous > 10:
                    output.append(finding(self.ds, 'draft_scope_outlier', f'{year} {scope} is more than ten times the latest published comparison; inspect units and boundary changes.', [lines[scope]['source'], prior['source']], scope=scope, year=year, ratio=value / previous, prior_year=int(prior['values']['year'])))
            if all(k in lines for k in (*SCOPES, 'total_market_based')):
                total = sum(numeric(lines[k]['values']['tco2e']) for k in SCOPES)
                reported = numeric(lines['total_market_based']['values']['tco2e'])
                if abs(total - reported) > .01:
                    output.append(finding(self.ds, 'draft_total_mismatch', 'Draft reported total differs from the sum of its scope lines.', [lines[k]['source'] for k in (*SCOPES, 'total_market_based')], year=year, scope_sum_tco2e=total, reported_total_tco2e=reported))
        return output

    def inventory(self, year=2024, restated=False):
        history, issues = unique(self.store.rows(self.ds, 'published_inventory_history'), ('year',))
        drafts, draft_issues = unique(self.store.rows(self.ds, 'draft_report_summary_2025'), ('year', 'line'))
        findings = self.quality_findings()
        def published(row):
            v = row['values']
            applied = restated and v.get('scope3_restated') not in ('', None)
            scopes = {s: numeric(v.get('scope3_restated') if applied and s == 'scope3' else v.get(s), s) for s in SCOPES}
            return {'year': int(v['year']), 'scopes': scopes, 'total_tco2e': sum(scopes.values()), 'restatement_applied': applied, 'status': 'published_source_context', 'source': row['source'], 'note': v.get('note')}
        records = sorted([published(r) for r in history], key=lambda r: r['year'])
        selected = next((r for r in records if r['year'] == year), None)
        lines = {r['values']['line']: r for r in drafts if int(r['values']['year']) == year}
        if lines:
            scopes = {s: numeric(lines[s]['values']['tco2e'], s) if s in lines else None for s in SCOPES}
            complete = all(v is not None for v in scopes.values())
            selected = {'year': year, 'scopes': scopes, 'scope_sum_tco2e': sum(scopes.values()) if complete else None, 'reported_total_tco2e': numeric(lines['total_market_based']['values']['tco2e']) if 'total_market_based' in lines else None, 'total_tco2e': None, 'status': 'blocked' if any(f['detail']['year'] == year and f['blocking'] for f in findings) else 'preliminary', 'source_status': 'preliminary', 'restatement_applied': False, 'sources': [r['source'] for r in lines.values()]}
        if selected is None:
            selected = {'year': year, 'status': 'unavailable', 'scopes': None, 'total_tco2e': None, 'restatement_applied': False}
        suppliers, supplier_issues = unique(self.store.rows(self.ds, 'suppliers'), ('supplier_id',))
        counts = Counter(r['values'].get('sbti_status') or 'unknown' for r in suppliers)
        supplier_source = table_source(self.store, self.ds, 'suppliers')
        supplier_stats = {'status': 'partial_coverage' if supplier_issues else 'available', 'total': len(suppliers), 'provides_pcf': sum(r['values'].get('provides_pcf', '').lower() == 'true' for r in suppliers), 'sbti_status_counts': dict(counts), 'country_count': len({r['values'].get('country') for r in suppliers}), 'source': supplier_source}
        if supplier_source['file_sha256'] is None:
            supplier_stats.update(status='unavailable', total=None, provides_pcf=None, sbti_status_counts=None, country_count=None)
        return {'dataset_id': self.ds, 'selected': selected, 'history': records, 'available_years': sorted({r['year'] for r in records} | {int(r['values']['year']) for r in drafts}), 'quality_findings': findings, 'feeds': [{'table': t['table'], 'file': t['path'], 'row_count': t['rows'], 'file_sha256': t['sha256'], 'validation_status': 'imported_not_domain_validated'} for t in self.manifest['tables']], 'suppliers': supplier_stats, 'structural_events': self.store.rows(self.ds, 'structural_events'), 'issues': issues + draft_issues + supplier_issues, 'limitations': ['Published values are source context, not a reconstructed inventory.', 'Draft anomaly findings are deterministic warnings; their cause is not proven to be a unit error.', 'Confirming or dismissing a finding does not fix a source value or remove numerical blockers.', 'Supplier-PCF JSON is not imported or independently validated; availability is from the supplier master.']}

    def search(self, query, limit=20):
        query = query.strip()
        if not query or len(query) > 200 or not 1 <= limit <= 50:
            raise ValueError('Search needs 1–200 characters and limit 1–50')
        escaped = query.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
        records = []
        with self.store.connect() as db:
            for table in ENTITY_TABLES:
                rows = db.execute("SELECT row_number,record_id,payload FROM records WHERE dataset_id=? AND table_name=? AND payload LIKE ? ESCAPE '\\' ORDER BY (lower(record_id)=?) DESC,row_number LIMIT ?", (self.ds, table, '%' + escaped + '%', query.lower(), limit)).fetchall()
                for row in rows:
                    resolved = self.store.source(self.ds, table, row['row_number'])
                    records.append({'table': table, 'record_id': row['record_id'], 'label': row['record_id'], 'values': resolved['values'], 'source': resolved['source']})
        records.sort(key=lambda r: (r['record_id'].lower() != query.lower(), r['table'], r['record_id']))
        return {'dataset_id': self.ds, 'query': query, 'limit': limit, 'records': records[:limit], 'truncated': len(records) > limit, 'screens': [s for s in SCREENS if query.lower() in s], 'places': [p for p in model('routing')['parameters']['places'] if query.lower() in ' '.join([p['id'], p['name'], *p['aliases']]).lower()]}

    def record(self, table, record_id):
        if table not in ENTITY_TABLES:
            raise KeyError('Entity table is not available for Navigator traces')
        with self.store.connect() as db:
            rows = db.execute('SELECT row_number FROM records WHERE dataset_id=? AND table_name=? AND record_id=? ORDER BY row_number LIMIT 51', (self.ds, table, record_id)).fetchall()
        if not rows:
            raise KeyError('Record not found')
        records = [self.store.source(self.ds, table, r['row_number']) for r in rows[:50]]
        variants = {json.dumps(r['values'], sort_keys=True) for r in records}
        return {'dataset_id': self.ds, 'table': table, 'record_id': record_id, 'status': 'ambiguous' if len(variants) > 1 else 'source_record', 'records': records, 'truncated': len(rows) > 50}
