from .analytics import Analytics
from .navigator_common import model
from .navigator_context import NavigatorContext


class PathwayService:
    def __init__(self, store, dataset_id):
        self.store, self.ds = store, dataset_id
        self.context = NavigatorContext(store, dataset_id)
        self.model = model('pathway')

    def calculate(self, physical_scenario='ssp245', year=2040, action_ids=None, selection_mode='manual', transition_scenario=None):
        p = self.model['parameters']
        if selection_mode not in ('manual', 'all', 'cheapest') or not isinstance(year, int) or isinstance(year, bool) or not p['assumed_base_year'] <= year <= p['end_year']:
            raise ValueError('Choose manual/all/cheapest and a pathway year in 2025–2050')
        if selection_mode != 'manual' and action_ids:
            raise ValueError('Explicit action IDs apply only to manual selection')
        source = self.context.inventory(p['proxy_inventory_year'])['selected']
        if source['status'] != 'published_source_context':
            return {'dataset_id': self.ds, 'status': 'insufficient_data', 'reason': 'Published proxy inventory unavailable', 'series': [], 'model': self.model, 'target_compliance_validated': False}
        s12 = source['scopes']['scope1'] + source['scopes']['scope2_market']
        s1, s2 = source['scopes']['scope1'], source['scopes']['scope2_market']
        s3 = source['scopes']['scope3']
        catalogue = Analytics(self.store, self.ds).actions()
        actions = {a['lever_id']: a for a in catalogue['actions']}
        invalid = {}
        for a in actions.values():
            missing = [k for k in ('abatement_tco2e_2030_design', 'capex_eur', 'opex_delta_eur_per_yr', 'earliest_start', 'ramp_years') if a[k] is None]
            if a['earliest_start'] is not None and a['earliest_start'] != int(a['earliest_start']):
                missing.append('integer_earliest_start')
            if a['ramp_years'] is not None and a['ramp_years'] < 1:
                missing.append('positive_ramp_years')
            if a['lever_type'] not in ('data', 'structural') and a['scope'] not in ('scope1', 'scope2', 'measurement') and not a['scope'].startswith('scope3'):
                missing.append('supported_physical_scope')
            if missing:
                invalid[a['lever_id']] = missing
                catalogue['issues'].append({'code': 'incomplete_action_data', 'severity': 'error', 'source': a['source'], 'action_id': a['lever_id'], 'fields': missing, 'message': 'Action excluded; missing or invalid quantities are not zero'})
        def physical(a):
            return a['lever_id'] not in invalid and a['lever_type'] not in ('data', 'structural') and a['scope'] not in ('measurement', 'structural') and a['abatement_tco2e_2030_design'] > 0
        def ramp(a, y):
            return max(0, min(1, (y - a['earliest_start'] + 1) / a['ramp_years']))
        def target(y):
            elapsed = y - p['assumed_base_year']
            near = s12 * max(p['long_term_fraction'], 1 - p['scope12_linear_rate'] * elapsed)
            transition = p['scope3_transition_year']
            if y <= transition:
                frac = 1 - p['scope3_linear_rate'] * elapsed
            else:
                at_transition = 1 - p['scope3_linear_rate'] * (transition - p['assumed_base_year'])
                frac = at_transition + (p['long_term_fraction'] - at_transition) * (y - transition) / (p['end_year'] - transition)
            return near + s3 * max(p['long_term_fraction'], frac)
        def effects(ids, y):
            amounts = {i: actions[i]['abatement_tco2e_2030_design'] * ramp(actions[i], y) for i in ids if physical(actions[i])}
            gross = sum(amounts.values())
            adjustments = []
            for group in p['overlap_groups']:
                members = sorted(set(group['action_ids']) & amounts.keys())
                if len(members) < 2:
                    continue
                retained = max(members, key=lambda i: (amounts[i], i))
                removed = sum(amounts[i] for i in members if i != retained)
                adjustments.append({'group': group['id'], 'action_ids': members, 'retained_action_id': retained, 'discarded_tco2e': removed, 'rule': 'maximum_annual_group_abatement'})
                for i in members:
                    if i != retained:
                        amounts[i] = 0
            raw1 = sum(v for i, v in amounts.items() if actions[i]['scope'] == 'scope1')
            raw2 = sum(v for i, v in amounts.items() if actions[i]['scope'] == 'scope2')
            raw3 = sum(v for i, v in amounts.items() if actions[i]['scope'].startswith('scope3'))
            cut1, cut2, cut3 = min(s1, raw1), min(s2, raw2), min(s3, raw3)
            return {'gross_catalogue_abatement_tco2e': gross, 'adjusted_abatement_tco2e': cut1 + cut2 + cut3, 'scope1_tco2e': s1 - cut1, 'scope2_market_tco2e': s2 - cut2, 'scope12_tco2e': s12 - cut1 - cut2, 'scope3_tco2e': s3 - cut3, 'emissions_tco2e': s12 + s3 - cut1 - cut2 - cut3, 'overlap_adjustments': adjustments, 'discarded_by_scope_floor_tco2e': raw1 + raw2 + raw3 - cut1 - cut2 - cut3}
        minimum = s12 + s3 - target(2030)
        if selection_mode == 'all':
            selected = sorted(set(actions) - invalid.keys())
        elif selection_mode == 'cheapest':
            selected = []
            candidates = sorted((a for a in actions.values() if physical(a) and a['indicative_cost_eur_per_tco2e'] is not None), key=lambda a: (a['indicative_cost_eur_per_tco2e'], a['lever_id']))
            for a in candidates:
                current = effects(selected, 2030)['adjusted_abatement_tco2e']
                if current >= minimum:
                    break
                trial = selected + [a['lever_id']]
                if effects(trial, 2030)['adjusted_abatement_tco2e'] > current:
                    selected = trial
        else:
            selected = [i for i in p['default_actions'] if i in actions and i not in invalid] if action_ids is None else list(action_ids)
        if len(selected) > 30 or len(set(selected)) != len(selected) or any(i not in actions for i in selected):
            raise ValueError('Select up to 30 distinct known action IDs')
        if set(selected) & invalid.keys():
            raise ValueError('Selected action has missing or invalid catalogue quantities; inspect the catalogue issues')
        series = []
        for y in range(p['assumed_base_year'], p['end_year'] + 1):
            row = effects(selected, y)
            row.update(year=y, target_tco2e=target(y), gap_tco2e=row['emissions_tco2e'] - target(y))
            series.append(row)
        current = next(r for r in series if r['year'] == year)
        at2030 = next(r for r in series if r['year'] == 2030)
        scenario = self.context.scenario(physical_scenario, year, transition_scenario)
        price = scenario['values']['carbon_price_eur_t']
        macc = sorted([a | {'selected': a['lever_id'] in selected, 'selectable': a['lever_id'] not in invalid, 'missing_fields': invalid.get(a['lever_id'], []), 'physical_abatement': physical(a)} for a in actions.values()], key=lambda a: (a['indicative_cost_eur_per_tco2e'] is None, a['indicative_cost_eur_per_tco2e'] or 0, a['lever_id']))
        return {'dataset_id': self.ds, 'method_version': 'navigator-illustrative-pathway-v2', 'status': 'partial_coverage' if invalid else 'illustrative_model_requires_review', 'baseline': {'inventory_year': source['year'], 'assumed_base_year': p['assumed_base_year'], 'scope1_tco2e': s1, 'scope2_market_tco2e': s2, 'scope12_tco2e': s12, 'scope3_tco2e': s3, 'total_tco2e': s12 + s3, 'source': source['source']}, 'selection': {'action_ids': selected, 'excluded_action_ids': sorted(invalid), 'mode': selection_mode, 'algorithm': 'greedy_adjusted_marginal_2030_abatement' if selection_mode == 'cheapest' else 'explicit_selection', 'minimum_2030_reduction_tco2e': minimum, 'minimum_reached': at2030['adjusted_abatement_tco2e'] >= minimum, 'shortfall_2030_tco2e': max(0, minimum - at2030['adjusted_abatement_tco2e'])}, 'series': series, 'selected_year': current, 'macc': macc, 'costs': {'upfront_capex_eur': sum(actions[i]['capex_eur'] for i in selected), 'annual_opex_delta_eur': sum(actions[i]['opex_delta_eur_per_yr'] * ramp(actions[i], year) for i in selected), 'hypothetical_avoided_carbon_cost_eur': current['adjusted_abatement_tco2e'] * price if price is not None else None, 'cost_basis': 'Catalogue values; selected opex scales with implementation ramp, capex is planned upfront budget'}, 'scenario': scenario, 'model': self.model, 'target_compliance_validated': False, 'issues': catalogue['issues'], 'limitations': ['Published 2024 proxy and assumed 2025 base require structural and expert review.', 'Illustrative target rates are source-package assumptions, not a verified SBTi/FLAG compliance assessment.', 'Fixed activity and flat abatement after ramp; no BAU, decay or supplier feasibility model.', 'Known overlaps use conservative maxima; other interactions remain unassessed.', 'Scope 1 and Scope 2 actions have separate emissions floors; cross-scope transfers need a dedicated model.', 'Incomplete actions are unavailable; all/greedy/default selections disclose their exclusion.', 'MACC retains catalogue design values, distinct from adjusted annual portfolio effects.', 'Carbon-price exposure is hypothetical, not guaranteed cash savings or carbon credit revenue.']}
