import tempfile
import unittest
from pathlib import Path
from tests.helpers import fixture, write_csv
from weatherlens_backend.datasets import import_dataset
from weatherlens_backend.storage import Store
from weatherlens_backend.analytics import Analytics


class AnalyticsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        fixture(self.root)
        self.store = Store(self.root / 'test.db')

    def analytics(self):
        ds = import_dataset(self.store, self.root, self.root / 'docs')['dataset_id']
        return Analytics(self.store, ds)

    def climate_fixture(self, missing=False):
        write_csv(self.root, 'data/01_master/climate_grid_cells.csv', [dict(cell_id='C1', region='FI_SW', lat=60, lon=22)])
        rows = []
        for scenario, year, temp, rain in [('historical', 2020, 10, 50), ('ssp245', 2041, 12, 30)]:
            for month in [5, 6]:
                if missing and scenario == 'ssp245' and month == 6:
                    continue
                rows.append(dict(cell_id='C1', scenario=scenario, year=year, month=month, tmean_c=temp, precip_mm=rain, pet_mm=40, hot_days_tmax_ge_27=2))
        write_csv(self.root, 'data/04_climate/weather_monthly_1991_2060.csv', rows)

    def test_complete_seasons_compare_temperature_and_summed_rain(self):
        self.climate_fixture()
        result = self.analytics().climate('FI_SW', 'ssp245', 2020, 2020, 2041, 2041, [5, 6])
        self.assertAlmostEqual(result['delta']['mean_temperature_c'], 2)
        self.assertEqual(result['baseline']['seasonal_precipitation_mm'], 100)
        self.assertEqual(result['future']['seasonal_precipitation_mm'], 60)
        self.assertEqual(result['matched_cells'], 1)
        self.assertNotIn('yield_loss', result)

    def test_missing_month_returns_insufficient_coverage(self):
        self.climate_fixture(missing=True)
        result = self.analytics().climate('FI_SW', 'ssp245', 2020, 2020, 2041, 2041, [5, 6])
        self.assertEqual(result['status'], 'insufficient_data')
        self.assertIsNone(result['delta'])

    def test_conflicting_grid_cells_remain_in_regional_coverage(self):
        for other_region in ['FI_SW', 'SE_SOUTH']:
            with self.subTest(other_region=other_region):
                self.climate_fixture()
                write_csv(self.root, 'data/01_master/climate_grid_cells.csv', [dict(cell_id='C1', region='FI_SW', lat=60, lon=22), dict(cell_id='C2', region='FI_SW', lat=60, lon=22), dict(cell_id='C2', region=other_region, lat=61, lon=23)])
                rows = [dict(cell_id=cell, scenario=scenario, year=year, month=month, tmean_c=temp, precip_mm=50, pet_mm=40, hot_days_tmax_ge_27=2) for cell in ['C1', 'C2'] for scenario, year, temp in [('historical', 2020, 10), ('ssp245', 2041, 12)] for month in [5, 6]]
                write_csv(self.root, 'data/04_climate/weather_monthly_1991_2060.csv', rows)
                result = self.analytics().climate('FI_SW', 'ssp245', 2020, 2020, 2041, 2041, [5, 6])
                self.assertEqual(result['status'], 'partial_coverage')
                self.assertEqual(result['matched_cells'], 1)
                self.assertEqual(result['excluded_cells'], ['C2'])
                self.assertEqual(result['coverage']['baseline']['expected_cell_years'], 2)
                self.assertEqual(result['coverage']['baseline']['included_cell_years'], 1)
                self.assertEqual(sum(i['code'] == 'duplicate_conflict' for i in result['issues']), 2)

    def test_missing_grid_id_is_disclosed_as_incomplete_coverage(self):
        self.climate_fixture()
        write_csv(self.root, 'data/01_master/climate_grid_cells.csv', [dict(cell_id='C1', region='FI_SW', lat=60, lon=22), dict(cell_id='', region='FI_SW', lat=61, lon=23)])
        result = self.analytics().climate('FI_SW', 'ssp245', 2020, 2020, 2041, 2041, [5, 6])
        self.assertEqual(result['status'], 'partial_coverage')
        self.assertEqual(result['grid_master_coverage']['unidentified_records'], 1)
        self.assertEqual(result['issues'][0]['code'], 'missing_id')

    def test_all_quarantined_cells_report_insufficient_data_for_each_region(self):
        self.climate_fixture()
        write_csv(self.root, 'data/01_master/climate_grid_cells.csv', [dict(cell_id='C2', region='FI_SW', lat=60, lon=22), dict(cell_id='C2', region='SE_SOUTH', lat=61, lon=23)])
        analytics = self.analytics()
        for region in ['FI_SW', 'SE_SOUTH']:
            with self.subTest(region=region):
                result = analytics.climate(region, 'ssp245', 2020, 2020, 2041, 2041, [5, 6])
                self.assertEqual(result['status'], 'insufficient_data')
                self.assertIsNone(result['delta'])
                self.assertEqual(result['excluded_cells'], ['C2'])
                self.assertEqual(result['coverage']['baseline']['expected_cell_years'], 1)
                self.assertEqual(result['coverage']['baseline']['included_cell_years'], 0)
                self.assertEqual(sum(i['code'] == 'duplicate_conflict' for i in result['issues']), 2)
        with self.assertRaises(ValueError):
            analytics.climate('ABSENT', 'ssp245', 2020, 2020, 2041, 2041, [5, 6])

    def test_region_with_only_missing_grid_ids_returns_coverage_issues(self):
        self.climate_fixture()
        write_csv(self.root, 'data/01_master/climate_grid_cells.csv', [dict(cell_id='', region='FI_SW', lat=60, lon=22)])
        result = self.analytics().climate('FI_SW', 'ssp245', 2020, 2020, 2041, 2041, [5, 6])
        self.assertEqual(result['status'], 'insufficient_data')
        self.assertIsNone(result['baseline'])
        self.assertEqual(result['grid_master_coverage']['unidentified_records'], 1)
        self.assertEqual(result['issues'][0]['code'], 'missing_id')

    def test_invalid_period_and_duplicate_months_rejected(self):
        self.climate_fixture()
        a = self.analytics()
        for args in [(2020, 2019, 2041, 2041, [5]), (2020, 2020, 2041, 2041, [5, 5])]:
            with self.assertRaises(ValueError):
                a.climate('FI_SW', 'ssp245', *args)

    def test_measurement_is_not_abatement_and_comparison_not_a_portfolio_sum(self):
        result = self.analytics().compare(['L20', 'L27'], 'Improve freight evidence')
        self.assertEqual(result['actions'][1]['physical_abatement'], False)
        self.assertIsNone(result['portfolio_abatement_tco2e'])
        self.assertEqual(result['actions'][0]['local_effect_status'], 'not_assessed')

    def test_nature_monitoring_is_not_company_attributed(self):
        write_csv(self.root, 'data/01_master/parcels.csv', [dict(parcel_id='P1', farm_id='F1', catchment_id='CA1', area_ha=5, p_test_mgl_latest='')])
        write_csv(self.root, 'data/03_farming/parcel_crop_history_and_plan.csv', [dict(parcel_id='P1', year=2025, crop='pea')])
        write_csv(self.root, 'data/06_nature/catchments.csv', [dict(catchment_id='CA1', region='FI_SW', ecological_status_class='poor', p_sensitivity=1.6)])
        write_csv(self.root, 'data/06_nature/monitored_catchment_loads.csv', [dict(catchment_id='CA1', year=2025, total_p_load_kg=100, total_n_load_kg=500, method='Monitoring')])
        result = self.analytics().nature(2025)
        item = result['catchments'][0]
        self.assertEqual(item['registered_parcel_area_ha'], 5)
        self.assertEqual(item['parcels_missing_soil_p_test'], 1)
        self.assertIsNone(item['apetit_p_to_water_kg'])
        self.assertEqual(item['monitoring_context'][0]['values']['total_p_load_kg'], '100')

    def test_missing_nature_crop_year_does_not_mean_zero_pressure(self):
        self.assertEqual(self.analytics().nature(2025)['status'], 'insufficient_data')

    def test_conflicting_parcel_year_is_not_counted_under_both_crops(self):
        write_csv(self.root, 'data/01_master/parcels.csv', [dict(parcel_id='P1', farm_id='F1', catchment_id='CA1', area_ha=5, p_test_mgl_latest='')])
        write_csv(self.root, 'data/03_farming/parcel_crop_history_and_plan.csv', [dict(parcel_id='P1', year=2025, crop='pea'), dict(parcel_id='P1', year=2025, crop='carrot')])
        write_csv(self.root, 'data/06_nature/catchments.csv', [dict(catchment_id='CA1', region='FI_SW', ecological_status_class='poor')])
        for crop in ['pea', 'carrot']:
            result = self.analytics().nature(2025, crop)
            self.assertEqual(result['status'], 'insufficient_data')
            self.assertTrue(result['issues'])

    def test_orphan_parcel_and_catchment_joins_are_reported(self):
        write_csv(self.root, 'data/01_master/parcels.csv', [dict(parcel_id='P1', farm_id='F1', catchment_id='UNKNOWN', area_ha=5, p_test_mgl_latest='')])
        write_csv(self.root, 'data/03_farming/parcel_crop_history_and_plan.csv', [dict(parcel_id='P1', year=2025, crop='pea'), dict(parcel_id='MISSING', year=2025, crop='pea')])
        write_csv(self.root, 'data/06_nature/catchments.csv', [dict(catchment_id='CA1', region='FI_SW', ecological_status_class='poor')])
        result = self.analytics().nature(2025)
        self.assertEqual(result['status'], 'insufficient_data')
        self.assertEqual(result['coverage']['matched_parcels'], 0)
        self.assertEqual(result['coverage']['selected_parcels'], 2)
        self.assertEqual({i['code'] for i in result['issues']}, {'missing_parcel_master', 'missing_catchment'})
