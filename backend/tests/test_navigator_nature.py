from tests.navigator_fixture import NavigatorCase
from weatherlens_backend.navigator_nature import NatureSensitivityService


class NatureSensitivityTests(NavigatorCase):
    def test_contract_area_drives_loads_not_total_catchment_fields(self):
        result = NatureSensitivityService(self.store, self.ds).calculate(2025)
        self.assertEqual(result['contract_area_ha'], 30)
        self.assertAlmostEqual(result['totals']['baseline_p_kg_estimate'], 25.5)
        self.assertAlmostEqual(result['totals']['baseline_n_kg_estimate'], 420)
        self.assertEqual(result['top_catchments'][0]['catchment_id'], 'CA2')
        self.assertAlmostEqual(result['top_catchments'][0]['priority_score_estimate'], 3)
        self.assertFalse(result['company_attribution_validated'])

    def test_sliders_use_fixed_unmitigated_median_denominators(self):
        result = NatureSensitivityService(self.store, self.ds).calculate(2025, catch_crop_pct=20, mineral_n_reduction_pct=10, buffer_strips=True)
        self.assertAlmostEqual(result['totals']['p_kg_estimate'], 20.145)
        self.assertAlmostEqual(result['totals']['n_kg_estimate'], 361.2)
        self.assertAlmostEqual(result['normalization']['baseline_p_median_kg'], 12.75)
        self.assertAlmostEqual(result['top_catchments'][0]['priority_score_estimate'], 2.44)

    def test_missing_plan_year_does_not_silently_reuse_2025(self):
        result = NatureSensitivityService(self.store, self.ds).calculate(2050)
        self.assertEqual(result['status'], 'insufficient_data')
        self.assertIsNone(result['totals'])
        self.assertEqual(result['top_catchments'], [])
