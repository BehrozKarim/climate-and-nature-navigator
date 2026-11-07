from tests.navigator_fixture import NavigatorCase
from weatherlens_backend.navigator_pathways import PathwayService
from tests.helpers import write_csv
from weatherlens_backend.datasets import import_dataset


class PathwayTests(NavigatorCase):
    def pathway(self, actions, **kwargs):
        return PathwayService(self.store, self.ds).calculate('ssp126', 2030, action_ids=actions, **kwargs)

    def test_target_proxy_and_annual_ramp_are_independent_known_values(self):
        result = self.pathway(['L20'])
        self.assertEqual(result['baseline']['inventory_year'], 2024)
        self.assertEqual(result['baseline']['assumed_base_year'], 2025)
        self.assertAlmostEqual(result['selected_year']['target_tco2e'], 866.5)
        by_year = {r['year']: r for r in result['series']}
        self.assertEqual(by_year[2026]['adjusted_abatement_tco2e'], 0)
        self.assertEqual(by_year[2027]['adjusted_abatement_tco2e'], 50)
        self.assertEqual(by_year[2028]['adjusted_abatement_tco2e'], 100)
        self.assertFalse(result['target_compliance_validated'])

    def test_overlap_is_conservative_and_measurement_has_no_physical_saving(self):
        result = self.pathway(['L13', 'L14', 'L27'])
        self.assertEqual(result['selected_year']['gross_catalogue_abatement_tco2e'], 300)
        self.assertEqual(result['selected_year']['adjusted_abatement_tco2e'], 200)
        self.assertEqual(result['selected_year']['emissions_tco2e'], 800)
        self.assertEqual(result['selected_year']['overlap_adjustments'][0]['discarded_tco2e'], 100)
        self.assertEqual(result['costs']['annual_opex_delta_eur'], 430)
        self.assertIn('config_sha256', result['model'])

    def test_greedy_and_all_selection_preserve_costs_and_report_heuristic(self):
        service = PathwayService(self.store, self.ds)
        result = service.calculate('ssp126', 2030, selection_mode='cheapest')
        self.assertIn('L21', result['selection']['action_ids'])
        self.assertNotIn('L27', result['selection']['action_ids'])
        self.assertTrue(result['selection']['minimum_reached'])
        self.assertEqual(result['selection']['algorithm'], 'greedy_adjusted_marginal_2030_abatement')
        saving = self.pathway(['L21'])
        self.assertEqual(saving['costs']['annual_opex_delta_eur'], -50)
        with self.assertRaises(ValueError):
            self.pathway(['missing'])

    def updated_actions(self, changes):
        import csv
        path = self.root / 'data/05_scenarios/decarbonisation_levers.csv'
        with path.open(encoding='utf-8') as stream:
            rows = list(csv.DictReader(stream))
        write_csv(self.root, 'data/05_scenarios/decarbonisation_levers.csv', [r | changes if r['lever_id'] == 'L01' else r for r in rows])
        return import_dataset(self.store, self.root, self.root / 'docs')['dataset_id']

    def test_incomplete_selected_action_is_rejected_instead_of_zero_cost_effect(self):
        ds = self.updated_actions({'capex_eur': '', 'opex_delta_eur_per_yr': '', 'abatement_tco2e_2030_design': ''})
        service = PathwayService(self.store, ds)
        with self.assertRaises(ValueError):
            service.calculate('ssp126', 2030, action_ids=['L01'])
        result = service.calculate('ssp126', 2030, selection_mode='all')
        self.assertNotIn('L01', result['selection']['action_ids'])
        self.assertIn('L01', result['selection']['excluded_action_ids'])
        self.assertEqual(result['status'], 'partial_coverage')
        self.assertTrue(result['issues'])

    def test_scope_one_action_cannot_remove_scope_two_emissions(self):
        ds = self.updated_actions({'abatement_tco2e_2030_design': '100'})
        result = PathwayService(self.store, ds).calculate('ssp126', 2030, action_ids=['L01'])
        selected = result['selected_year']
        self.assertEqual(selected['adjusted_abatement_tco2e'], 60)
        self.assertEqual(selected['scope1_tco2e'], 0)
        self.assertEqual(selected['scope2_market_tco2e'], 40)
        self.assertEqual(selected['discarded_by_scope_floor_tco2e'], 40)
