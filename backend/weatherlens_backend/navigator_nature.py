from .analytics import Analytics
from .navigator_common import model, table_source


class NatureSensitivityService:
    def __init__(self, store, dataset_id):
        self.store, self.ds = store, dataset_id
        store.dataset(dataset_id)
        self.model = model('nature')

    def calculate(self, year=2025, crop=None, catch_crop_pct=0, mineral_n_reduction_pct=0, buffer_strips=False):
        if catch_crop_pct != 0 or mineral_n_reduction_pct != 0 or buffer_strips:
            raise ValueError('Mitigation estimates are unavailable: no calibrated attributed-load or intervention model is supplied')
        if isinstance(year, bool) or not isinstance(year, int) or not 1900 <= year <= 2100:
            raise ValueError('Choose a valid parcel-plan year')
        context = Analytics(self.store, self.ds).nature(year, crop)
        available = context['status'] != 'insufficient_data'
        rows = [row | {'contract_area_ha': row['registered_parcel_area_ha'] if available else None,
                       'p_kg_estimate': None, 'n_kg_estimate': None, 'priority_score_estimate': None, 'rank': None}
                for row in context['catchments']]
        return {'dataset_id': self.ds, 'method_version': 'navigator-source-contract-nature-context-v3',
                'status': context['status'], 'year': year, 'crop': crop,
                'contract_area_ha': sum(row['registered_parcel_area_ha'] for row in rows) if available else None,
                'totals': None, 'catchments': rows, 'top_catchments': [],
                'origins': self.store.rows(self.ds, 'origin_state_of_nature_indicative'),
                'coverage': context['coverage'], 'issues': context['issues'], 'model': self.model,
                'company_attribution_validated': False,
                'sources': [table_source(self.store, self.ds, table, year=year if table in ('parcel_crops', 'monitored_catchment_loads') else None)
                            for table in ['parcel_crops', 'parcels', 'catchments', 'monitored_catchment_loads', 'origin_state_of_nature_indicative']],
                'limitations': context['limitations'] + ['Design-reference per-hectare coefficients and mitigation sliders have been removed. No unsupported attributed nutrient load or priority is generated.']}
