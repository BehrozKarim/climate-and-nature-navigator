from tests.helpers import fixture, write_csv
import tempfile
import unittest
from pathlib import Path
from weatherlens_backend.storage import Store
from weatherlens_backend.datasets import import_dataset


def navigator_fixture(root):
    fixture(root)
    write_csv(root, 'data/05_scenarios/published_inventory_history.csv', [dict(year=2023, scope1=60, scope2_market=40, scope3=900, scope3_restated=800, note='Restatement supplied'), dict(year=2024, scope1=60, scope2_market=40, scope3=900, scope3_restated='', note='Published')])
    write_csv(root, 'data/05_scenarios/draft_report_summary_2025.csv', [dict(year=2025, line=line, tco2e=value, status='preliminary') for line, value in [('scope1', 1000), ('scope2_market', 800), ('scope3', 90000), ('total_market_based', 80000)]])
    transitions = []
    for scenario, proxy, prices in [('net_zero_2050', 'ssp126', [80, 160, 380, 650]), ('ndcs', 'ssp245', [80, 100, 145, 185]), ('current_policies', 'ssp585', [80, 82, 90, 100])]:
        for year, carbon, index in zip([2025, 2030, 2040, 2050], prices, [1, 1.2, 1.4, 1.5]):
            transitions.append(dict(scenario=scenario, physical_pathway_proxy=proxy, ngfs_category='illustrative', narrative='Fixture', year=year, carbon_price_eur_t=carbon, n_fertiliser_price_index=index, diesel_price_index=index, electricity_price_eur_mwh=60, eu_ets2_fuel_price_eur_t=10, plant_based_demand_index=1, frozen_veg_import_premium_pct=5, value_status='illustrative'))
    write_csv(root, 'data/05_scenarios/transition_scenarios.csv', transitions)
    write_csv(root, 'data/01_master/suppliers.csv', [dict(supplier_id='SUP1', supplier_name='Supplier one', country='FI', provides_pcf='True', sbti_status='targets_set'), dict(supplier_id='SUP2', supplier_name='Supplier two', country='SE', provides_pcf='False', sbti_status='none')])
    write_csv(root, 'data/01_master/farm_registry.csv', [dict(farm_id='F1', region='FI_SW', country='FI', lat=60, lon=22, contract_crops='pea')])
    write_csv(root, 'data/01_master/parcels.csv', [dict(parcel_id='P1', farm_id='F1', catchment_id='CA1', area_ha=10, lat=60, lon=22, p_test_mgl_latest=''), dict(parcel_id='P2', farm_id='F1', catchment_id='CA2', area_ha=20, lat=61, lon=23, p_test_mgl_latest=4)])
    write_csv(root, 'data/03_farming/parcel_crop_history_and_plan.csv', [dict(parcel_id='P1', farm_id='F1', year=2025, crop='pea'), dict(parcel_id='P2', farm_id='F1', year=2025, crop='pea')])
    write_csv(root, 'data/06_nature/catchments.csv', [dict(catchment_id='CA1', region='FI_SW', ecological_status_class='good', receiving_water_type='lake', p_sensitivity=1, field_area_total_ha=10000, catchment_area_km2=100), dict(catchment_id='CA2', region='FI_SW', ecological_status_class='poor', receiving_water_type='river', p_sensitivity=1, field_area_total_ha=20000, catchment_area_km2=200)])
    write_csv(root, 'data/06_nature/origin_state_of_nature_indicative.csv', [dict(origin_country='FI', commodity='pea', baseline_water_stress_cat_indicative=1, source_note='Indicative fixture')])
    write_csv(root, 'data/01_master/climate_grid_cells.csv', [dict(cell_id='C1', region='FI_SW', lat=60, lon=22), dict(cell_id='C2', region='SE_SKANE', lat=56, lon=13)])
    climate = []
    for cell in ['C1', 'C2']:
        for scenario, years, temperature in [('historical', list(range(1991, 2021)) + [2025, 2026], 10), ('ssp126', range(2027, 2061), 11), ('ssp245', range(2027, 2061), 12), ('ssp585', range(2027, 2061), 14)]:
            for year in years:
                for month in [5, 6, 7, 8]:
                    climate.append(dict(cell_id=cell, scenario=scenario, year=year, month=month, tmean_c=temperature, precip_mm=50, pet_mm=70, hot_days_tmax_ge_27=2))
    write_csv(root, 'data/04_climate/weather_monthly_1991_2060.csv', climate)
    write_csv(root, 'data/05_scenarios/contract_prices_and_replacement_premiums.csv', [dict(year=2026, item=item, contract_price_eur_t=100, replacement_import_premium_frac=.5, note='Historical fixture') for item in ['pea', 'pea_SE', 'potato', 'carrot', 'turnip_rape']])
    actions = []
    for key, scope, abatement, cost, opex, capex in [('L01', 'scope1', 20, 1, 10, 100), ('L13', 'scope3_cat1', 200, 1, 200, 0), ('L14', 'scope3_cat1', 100, 1.5, 150, 0), ('L20', 'scope3_cat4_cat9', 100, 2, 200, 0), ('L21', 'scope3_cat4', 50, -1, -50, 0), ('L27', 'measurement', 0, '', 80, 0)]:
        actions.append(dict(lever_id=key, name=key, scope=scope, flag='False', lever_type='data' if key == 'L27' else 'energy', abatement_tco2e_2030_design=abatement, capex_eur=capex, opex_delta_eur_per_yr=opex, lifetime_yr=10, earliest_start=2027, ramp_years=2, confidence='medium', co_benefits='', trade_offs='', indicative_cost_eur_per_tco2e=cost, value_status='design estimate'))
    write_csv(root, 'data/05_scenarios/decarbonisation_levers.csv', actions)
    framework = root / 'data/07_frameworks/framework_digest.md'
    framework.parent.mkdir(parents=True, exist_ok=True)
    framework.write_text('Framework targets use documented assumptions. Freight evidence needs review.', encoding='utf-8')


class NavigatorCase(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        navigator_fixture(self.root)
        self.store = Store(self.root / 'db.sqlite')
        self.ds = import_dataset(self.store, self.root, self.root / 'docs')['dataset_id']
