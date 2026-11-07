from calendar import monthrange
from collections import defaultdict
from statistics import mean

from .freight import number, deduplicate


class Analytics:
    def __init__(self, store, dataset_id):
        self.store, self.dataset_id = store, dataset_id
        store.dataset(dataset_id)

    def actions(self):
        rows, issues = deduplicate(self.store.rows(self.dataset_id, 'actions'), 'lever_id')
        output = []
        for row in rows:
            values = dict(row['values'])
            for key in ('abatement_tco2e_2030_design', 'capex_eur', 'opex_delta_eur_per_yr', 'lifetime_yr', 'earliest_start', 'ramp_years', 'indicative_cost_eur_per_tco2e'):
                raw = values.get(key)
                values[key] = float(number(raw, key, allow_negative=key in ('opex_delta_eur_per_yr', 'indicative_cost_eur_per_tco2e'))) if raw not in ('', None) else None
            values.update(source=row['source'], physical_abatement=values.get('scope') != 'measurement' and values.get('lever_type') != 'data', local_effect_status='not_assessed', value_basis='synthetic_catalogue_design_estimate', period_basis='2030 design value; annual versus cumulative interpretation not independently verified', scope_basis='catalogue programme scope; local programme size unassessed')
            output.append(values)
        return {'actions': output, 'issues': issues, 'synthetic': True}

    def compare(self, action_ids, objective):
        if not objective.strip() or not 1 <= len(action_ids) <= 6 or len(set(action_ids)) != len(action_ids):
            raise ValueError('Provide a nonempty objective and 1–6 distinct action IDs')
        lookup = {a['lever_id']: a for a in self.actions()['actions']}
        if any(action not in lookup for action in action_ids):
            raise ValueError('Unknown or ambiguous action ID')
        return {'dataset_id': self.dataset_id, 'objective': objective, 'actions': [lookup[a] for a in action_ids], 'portfolio_abatement_tco2e': None, 'relevance_assessed': False, 'limitations': ['Catalogue exploration, not an automatically justified shortlist or ranked recommendation.', 'Explain each action’s relevance to the objective before proposing it.', 'Costs and benefits retain their catalogue scope; overlap and local effectiveness are unassessed.', 'Negative annual opex denotes a saving, separate from upfront investment.']}

    def inventory_context(self):
        return {'dataset_id': self.dataset_id, 'status': 'partial_coverage', 'calculated_coverage': ['Scope 3 category 4 inbound freight legs', 'Scope 3 category 9 outbound freight legs'], 'not_calculated': ['Scope 1 combustion/refrigerants', 'Scope 2 market and location inventories', 'Scope 3 farming, purchased goods/services and remaining categories', 'Organisational-boundary restatements and FLAG split'], 'published_history': self.store.rows(self.dataset_id, 'published_inventory_history'), 'structural_events': self.store.rows(self.dataset_id, 'structural_events'), 'limitations': ['Published history is source context, not a recomputed inventory or the synthetic answer key.', 'Partial freight totals must not be presented as company-wide emissions.']}

    def climate(self, region, scenario, baseline_start=1991, baseline_end=2020, future_start=2041, future_end=2060, months=None):
        months = months or [5, 6, 7, 8]
        if scenario not in ('ssp126', 'ssp245', 'ssp585') or not 1991 <= baseline_start <= baseline_end <= 2026 or not 2027 <= future_start <= future_end <= 2060:
            raise ValueError('Use a historical baseline in 1991–2026 and SSP future in 2027–2060')
        if len(set(months)) != len(months) or any(isinstance(m, bool) or not isinstance(m, int) or m < 1 or m > 12 for m in months):
            raise ValueError('Months must be distinct integers from 1 to 12')
        raw_grid = self.store.rows(self.dataset_id, 'climate_grid_cells')
        regional_ids = {r['values']['cell_id'] for r in raw_grid if r['values'].get('region') == region and r['values'].get('cell_id')}
        regional_rows = {r['source']['row_number'] for r in raw_grid if r['values'].get('region') == region or r['values'].get('cell_id') in regional_ids}
        grid, grid_issues = deduplicate(raw_grid, 'cell_id')
        issues = [i for i in grid_issues if i['source']['row_number'] in regional_rows]
        unidentified_records = sum(i['code'] == 'missing_id' for i in issues)
        cells = {r['values']['cell_id'] for r in grid if r['values'].get('region') == region}
        if not regional_rows:
            raise ValueError('Unknown region')
        grouped = defaultdict(dict)
        invalid = set()
        for row in self.store.rows(self.dataset_id, 'climate_monthly'):
            v = row['values']
            try:
                year, month = int(v['year']), int(v['month'])
                cell, kind = v['cell_id'], v['scenario']
            except (KeyError, ValueError):
                continue
            period = 'baseline' if kind == 'historical' and baseline_start <= year <= baseline_end else 'future' if kind == scenario and future_start <= year <= future_end else None
            if cell not in cells or month not in months or period is None:
                continue
            key = (period, cell, year)
            if month in grouped[key]:
                invalid.add(key)
                continue
            try:
                values = {'mean_temperature_c': float(number(v['tmean_c'], allow_negative=True)), 'seasonal_precipitation_mm': float(number(v['precip_mm'])), 'seasonal_pet_mm': float(number(v['pet_mm'])), 'seasonal_hot_days': float(number(v['hot_days_tmax_ge_27'])), 'days': monthrange(year, month)[1]}
                if not -100 <= values['mean_temperature_c'] <= 70 or values['seasonal_hot_days'] > values['days']:
                    raise ValueError('Out-of-range climate indicator')
                grouped[key][month] = values
            except (KeyError, ValueError):
                invalid.add(key)
        complete = defaultdict(list)
        for (period, cell, year), observed in grouped.items():
            if (period, cell, year) in invalid or set(observed) != set(months):
                continue
            days = sum(v['days'] for v in observed.values())
            aggregate = {'mean_temperature_c': sum(v['mean_temperature_c'] * v['days'] for v in observed.values()) / days}
            for name in ('seasonal_precipitation_mm', 'seasonal_pet_mm', 'seasonal_hot_days'):
                aggregate[name] = sum(v[name] for v in observed.values())
            complete[(period, cell)].append((year, aggregate))
        common = sorted(c for c in cells if complete[('baseline', c)] and complete[('future', c)])
        coverage = {period: {'expected_cell_years': len(regional_ids) * (end - start + 1), 'included_cell_years': sum(len(complete[(period, c)]) for c in common), 'included_years_by_cell': {c: sorted(y for y, _ in complete[(period, c)]) for c in common}} for period, start, end in [('baseline', baseline_start, baseline_end), ('future', future_start, future_end)]}
        summaries = {}
        for period in ('baseline', 'future'):
            summaries[period] = {name: mean(mean(a[name] for _, a in complete[(period, c)]) for c in common) for name in ('mean_temperature_c', 'seasonal_precipitation_mm', 'seasonal_pet_mm', 'seasonal_hot_days')} if common else None
        source = next((s for s in self.store.sources(self.dataset_id) if s['table_name'] == 'climate_monthly'), None)
        return {'dataset_id': self.dataset_id, 'region': region, 'scenario': scenario, 'months': months, 'baseline_period': [baseline_start, baseline_end], 'future_period': [future_start, future_end], 'method_version': 'monthly-complete-season-equal-cell-v2', 'status': ('calculated' if not unidentified_records and all(v['expected_cell_years'] == v['included_cell_years'] for v in coverage.values()) else 'partial_coverage') if common else 'insufficient_data', 'matched_cells': len(common), 'excluded_cells': sorted(regional_ids - set(common)), 'grid_master_coverage': {'registered_cell_ids': len(regional_ids), 'unambiguous_cell_ids': len(cells), 'quarantined_cell_ids': sorted(regional_ids - cells), 'unidentified_records': unidentified_records}, 'issues': issues, 'coverage': coverage, **summaries, 'delta': {k: summaries['future'][k] - summaries['baseline'][k] for k in summaries['baseline']} if common else None, 'source': {'table': 'climate_monthly', 'file_sha256': source['sha256'] if source else None, 'filters': {'region': region, 'scenario': scenario, 'months': months, 'cell_ids': common}}, 'limitations': ['Synthetic monthly climate indicators; not a probabilistic forecast.', 'Only complete cell-year seasons contribute; matched cells are weighted equally.', 'Quarantined regional grid IDs remain in expected coverage; missing grid IDs are reported separately.', 'Temperature is day-weighted within a season; rainfall/PET/hot days are seasonal totals averaged across years.', 'Climate exposure does not quantify crop-yield loss, water availability or financial damage.']}

    def nature(self, year=2025, crop=None):
        plans = self.store.rows(self.dataset_id, 'parcel_crops', year=year)
        keyed = [r | {'values': r['values'] | {'_parcel_year': f"{r['values']['parcel_id']}:{r['values']['year']}" if r['values'].get('parcel_id') else ''}} for r in plans]
        clean_plans, issues = deduplicate(keyed, '_parcel_year')
        selected = {r['values']['parcel_id']: r for r in clean_plans if crop is None or r['values'].get('crop') == crop}
        parcel_ids = set(selected)
        parcels, parcel_issues = deduplicate(self.store.rows(self.dataset_id, 'parcels'), 'parcel_id')
        catchments, catchment_issues = deduplicate(self.store.rows(self.dataset_id, 'catchments'), 'catchment_id')
        issues.extend(parcel_issues + catchment_issues)
        known_catchments = {r['values']['catchment_id'] for r in catchments}
        known_parcels = {r['values']['parcel_id'] for r in parcels}
        for missing in sorted(parcel_ids - known_parcels):
            issues.append({'code': 'missing_parcel_master', 'source': selected[missing]['source'], 'message': 'Selected parcel lacks an unambiguous parcel master record'})
        grouped = defaultdict(list)
        for row in parcels:
            v = row['values']
            if v.get('parcel_id') in parcel_ids:
                try:
                    area = float(number(v.get('area_ha'), 'area_ha'))
                    if v.get('catchment_id') not in known_catchments:
                        issues.append({'code': 'missing_catchment', 'source': row['source'], 'message': 'Selected parcel cannot be joined to an unambiguous catchment'})
                        continue
                    grouped[v.get('catchment_id')].append((row, area))
                except ValueError:
                    issues.append({'code': 'invalid_area', 'source': row['source']})
        monitored = defaultdict(list)
        for row in self.store.rows(self.dataset_id, 'monitored_catchment_loads', year=year):
            monitored[row['values']['catchment_id']].append(row)
        output = []
        for catchment in catchments:
            v = catchment['values']
            records = grouped[v['catchment_id']]
            output.append({'catchment_id': v['catchment_id'], 'region': v.get('region'), 'ecological_status': v.get('ecological_status_class'), 'p_sensitivity': v.get('p_sensitivity'), 'registered_parcel_area_ha': round(sum(a for _, a in records), 4), 'parcel_count': len(records), 'parcels_missing_soil_p_test': sum(not r['values'].get('p_test_mgl_latest', '').strip() for r, _ in records), 'monitoring_context': monitored[v['catchment_id']], 'apetit_p_to_water_kg': None, 'apetit_n_to_water_kg': None, 'priority_rank': None, 'source': catchment['source']})
        matched = sum(len(rows) for rows in grouped.values())
        return {'dataset_id': self.dataset_id, 'year': year, 'crop': crop, 'status': ('partial_coverage' if issues or matched != len(parcel_ids) else 'context_only') if matched and output else 'insufficient_data', 'coverage': {'selected_parcels': len(parcel_ids), 'matched_parcels': matched, 'excluded_plan_records': len(plans) - len(clean_plans)}, 'catchments': output, 'issues': issues, 'method_version': 'nature-context-v2', 'source_tables': ['catchments', 'parcels', 'parcel_crops', 'monitored_catchment_loads'], 'limitations': ['Monitored outlet loads include non-contract land and natural background; they are not Apetit-attributed loads.', 'Registered parcel area is context, not a nutrient-pressure estimate or biodiversity score.', 'Conflicting parcel-year assignments and unresolved parcel/catchment joins are excluded and disclosed.', 'No SBTN pressure × state priority is calculated without a validated attributed-load model.']}
