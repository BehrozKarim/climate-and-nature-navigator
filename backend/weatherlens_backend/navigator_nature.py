from statistics import median
from .analytics import Analytics
from .navigator_common import model, numeric, table_source


class NatureSensitivityService:
    def __init__(self, store, dataset_id):
        self.store, self.ds = store, dataset_id
        store.dataset(dataset_id)
        self.model = model('nature')

    def calculate(self, year=2025, crop=None, catch_crop_pct=0, mineral_n_reduction_pct=0, buffer_strips=False):
        catch = numeric(catch_crop_pct, 'catch_crop_pct')
        nitrogen = numeric(mineral_n_reduction_pct, 'mineral_n_reduction_pct')
        if isinstance(year, bool) or not isinstance(year, int) or not 1900 <= year <= 2100 or not 0 <= catch <= 60 or not 0 <= nitrogen <= 30 or not isinstance(buffer_strips, bool):
            raise ValueError('Use a valid year, catch crops 0–60%, mineral N reduction 0–30% and a boolean buffer choice')
        p = self.model['parameters']
        context = Analytics(self.store, self.ds).nature(year, crop)
        available = context['status'] != 'insufficient_data'
        positive = [r['registered_parcel_area_ha'] for r in context['catchments'] if r['registered_parcel_area_ha'] > 0] if available else []
        medp = median(a * p['p_kg_per_ha'] for a in positive) if positive else None
        medn = median(a * p['n_kg_per_ha'] for a in positive) if positive else None
        fp = max(p['minimum_load_fraction'], 1 - catch / 100 * p['catch_crop_p_effect'] - (p['buffer_p_effect'] if buffer_strips else 0))
        fn = max(p['minimum_load_fraction'], 1 - catch / 100 * p['catch_crop_n_effect'] - nitrogen / 100 * p['mineral_n_effect'])
        output, issues = [], list(context['issues'])
        for row in context['catchments']:
            area = row['registered_parcel_area_ha']
            basep, basen = area * p['p_kg_per_ha'], area * p['n_kg_per_ha']
            loadp, loadn = basep * fp, basen * fn
            weight = p['state_weights'].get(row['ecological_status'])
            try:
                sensitivity = numeric(row['p_sensitivity'], 'p_sensitivity')
            except ValueError:
                sensitivity = None
            score = (loadp / medp + .5 * loadn / medn) * weight * sensitivity if medp and medn and weight is not None and sensitivity is not None else None
            if score is None and available:
                issues.append({'code': 'priority_unavailable', 'source': row['source'], 'message': 'Priority requires positive baseline medians and valid ecological state/sensitivity'})
            output.append(row | {'contract_area_ha': area if available else None, 'p_kg_estimate': loadp if available else None, 'n_kg_estimate': loadn if available else None, 'baseline_p_kg_estimate': basep if available else None, 'baseline_n_kg_estimate': basen if available else None, 'priority_score_estimate': score, 'rank': None})
        ranked = sorted((r for r in output if r['priority_score_estimate'] is not None), key=lambda r: (-r['priority_score_estimate'], r['catchment_id']))
        for index, row in enumerate(ranked, 1):
            row['rank'] = index
        totals = {'p_kg_estimate': sum(r['p_kg_estimate'] for r in output), 'n_kg_estimate': sum(r['n_kg_estimate'] for r in output), 'baseline_p_kg_estimate': sum(r['baseline_p_kg_estimate'] for r in output), 'baseline_n_kg_estimate': sum(r['baseline_n_kg_estimate'] for r in output), 'p_change_pct': (fp - 1) * 100, 'n_change_pct': (fn - 1) * 100} if available and positive else None
        return {'dataset_id': self.ds, 'method_version': 'navigator-contract-area-nutrient-sensitivity-v1', 'status': ('partial_coverage' if context['status'] == 'partial_coverage' or issues else 'illustrative_model_requires_review') if totals else 'insufficient_data', 'year': year, 'crop': crop, 'contract_area_ha': sum(r['registered_parcel_area_ha'] for r in context['catchments']) if available else None, 'controls': {'catch_crop_pct': catch, 'mineral_n_reduction_pct': nitrogen, 'buffer_strips': buffer_strips}, 'totals': totals, 'normalization': {'baseline_p_median_kg': medp, 'baseline_n_median_kg': medn, 'positive_area_catchments': len(positive), 'rule': 'Fixed unmitigated medians; zero-area catchments excluded from medians'}, 'catchments': output, 'top_catchments': ranked[:8], 'origins': self.store.rows(self.ds, 'origin_state_of_nature_indicative'), 'coverage': context['coverage'], 'issues': issues, 'model': self.model, 'company_attribution_validated': False, 'sources': [table_source(self.store, self.ds, 'parcel_crops', year=year, crop=crop), table_source(self.store, self.ds, 'parcels'), table_source(self.store, self.ds, 'catchments')], 'limitations': ['Per-ha load and mitigation coefficients are illustrative prototype assumptions, not a calibrated delivery/retention model.', 'Area is selected-year contract parcel area, not all fields in the catchment.', 'Scores use the package pressure × state formula, but estimated loads do not establish validated SBTN priorities.', 'Monitored catchment loads remain context; they include unrelated land and natural background.', 'A missing parcel-plan year is unavailable; no earlier year is silently substituted.']}
