from tests.navigator_fixture import NavigatorCase
from tests.helpers import write_csv
from weatherlens_backend.datasets import import_dataset
from weatherlens_backend.navigator_climate import ClimateRiskService


class ClimateRiskTests(NavigatorCase):
    def test_actual_warming_drives_declared_sensitivity_and_historical_price_cost(self):
        result = ClimateRiskService(self.store, self.ds).calculate('ssp245', 2040, 'pea_fi', 1000)
        self.assertAlmostEqual(result['selected']['summer_warming_c'], 2)
        self.assertAlmostEqual(result['selected']['yield_change_pct_estimate'], -3.92)
        self.assertAlmostEqual(result['replacement']['shortfall_t_estimate'], 39.2)
        self.assertAlmostEqual(result['replacement']['incremental_import_cost_eur_estimate'], 1960)
        self.assertEqual(result['replacement']['price_year'], 2026)
        self.assertFalse(result['trained_or_validated_forecast'])
        self.assertEqual(len(result['grid_cells']), 2)
        self.assertEqual(len(result['timeline']), 108)
        self.assertAlmostEqual(result['sourcing_hedge']['FI_SW']['yield_change_pct_estimate'], -3.92)
        self.assertAlmostEqual(result['sourcing_hedge']['SE_SKANE']['yield_change_pct_estimate'], -8.38)

    def test_historical_year_is_identical_for_all_physical_scenarios(self):
        service = ClimateRiskService(self.store, self.ds)
        low = service.calculate('ssp126', 2025, 'pea_fi', 1000)
        high = service.calculate('ssp585', 2025, 'pea_fi', 1000)
        self.assertEqual(low['selected'], high['selected'])
        self.assertEqual(low['weather_scenario_used'], 'historical')

    def test_incomplete_monthly_season_returns_unavailable_impact(self):
        path = self.root / 'data/04_climate/weather_monthly_1991_2060.csv'
        import csv
        with path.open(encoding='utf-8') as stream:
            rows = list(csv.DictReader(stream))
        rows = [r for r in rows if not (r['cell_id'] == 'C1' and r['scenario'] == 'ssp245' and r['year'] == '2040' and r['month'] == '8')]
        write_csv(self.root, 'data/04_climate/weather_monthly_1991_2060.csv', rows)
        ds = import_dataset(self.store, self.root, self.root / 'docs')['dataset_id']
        result = ClimateRiskService(self.store, ds).calculate('ssp245', 2040, 'pea_fi', 1000)
        self.assertEqual(result['status'], 'insufficient_data')
        self.assertIsNone(result['selected'])
        self.assertIsNone(result['replacement'])
