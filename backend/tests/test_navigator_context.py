from tests.navigator_fixture import NavigatorCase
from weatherlens_backend.navigator_context import NavigatorContext
from tests.helpers import write_csv
from weatherlens_backend.datasets import import_dataset


class ContextTests(NavigatorCase):
    def setUp(self):
        super().setUp()
        self.context = NavigatorContext(self.store, self.ds)

    def test_transition_interpolation_and_explicit_independent_choice(self):
        result = self.context.scenario('ssp126', 2035)
        self.assertEqual(result['transition_scenario'], 'net_zero_2050')
        self.assertEqual(result['values']['carbon_price_eur_t'], 270)
        self.assertEqual(result['anchor_years'], [2030, 2040])
        self.assertEqual(len(result['sources']), 2)
        independent = self.context.scenario('ssp585', 2040, 'net_zero_2050')
        self.assertFalse(independent['matches_supplied_physical_proxy'])
        with self.assertRaises(ValueError):
            self.context.scenario('ssp126', 2060)

    def test_inventory_uses_supplied_restatement_and_blocks_bad_draft(self):
        result = self.context.inventory(2023, True)
        self.assertEqual(result['selected']['total_tco2e'], 900)
        self.assertTrue(result['selected']['restatement_applied'])
        draft = self.context.inventory(2025)
        self.assertEqual(draft['selected']['status'], 'blocked')
        self.assertEqual(draft['selected']['scope_sum_tco2e'], 91800)
        self.assertEqual(draft['selected']['reported_total_tco2e'], 80000)
        self.assertEqual(len(draft['quality_findings']), 4)
        self.assertTrue(all(f['source_refs'] for f in draft['quality_findings']))

    def test_real_feed_counts_and_supplier_statistics(self):
        result = self.context.inventory(2024)
        self.assertEqual(result['selected']['total_tco2e'], 1000)
        self.assertEqual(result['suppliers']['total'], 2)
        self.assertEqual(result['suppliers']['provides_pcf'], 1)
        self.assertEqual(result['suppliers']['sbti_status_counts']['targets_set'], 1)
        shipment = next(f for f in result['feeds'] if f['table'] == 'shipments')
        self.assertEqual(shipment['row_count'], 1)
        self.assertEqual(shipment['validation_status'], 'imported_not_domain_validated')

    def test_search_and_trace_resolve_actual_snapshot_rows(self):
        result = self.context.search('F1', 10)
        record = next(r for r in result['records'] if r['table'] == 'farm_registry')
        self.assertEqual(record['source']['dataset_id'], self.ds)
        trace = self.context.record('farm_registry', 'F1')
        self.assertEqual(trace['records'][0]['values']['farm_id'], 'F1')
        with self.assertRaises(KeyError):
            self.context.record('farm_registry', 'absent')
        self.assertEqual(self.context.search('no-such-record', 10)['records'], [])

    def test_conflicting_transition_anchor_cannot_be_bridged_by_interpolation(self):
        import csv
        path = self.root / 'data/05_scenarios/transition_scenarios.csv'
        with path.open(encoding='utf-8') as stream:
            rows = list(csv.DictReader(stream))
        duplicate = next(r for r in rows if r['scenario'] == 'net_zero_2050' and r['year'] == '2030')
        rows.append(duplicate | {'carbon_price_eur_t': '999'})
        write_csv(self.root, 'data/05_scenarios/transition_scenarios.csv', rows)
        ds = import_dataset(self.store, self.root, self.root / 'docs')['dataset_id']
        context = NavigatorContext(self.store, ds)
        for year in [2028, 2030, 2035]:
            with self.subTest(year=year), self.assertRaises(ValueError):
                context.scenario('ssp126', year)
        self.assertEqual(context.scenario('ssp126', 2040)['values']['carbon_price_eur_t'], 380)

    def test_missing_supplier_feed_is_unknown_instead_of_zero_suppliers(self):
        (self.root / 'data/01_master/suppliers.csv').unlink()
        ds = import_dataset(self.store, self.root, self.root / 'docs')['dataset_id']
        suppliers = NavigatorContext(self.store, ds).inventory(2024)['suppliers']
        self.assertEqual(suppliers['status'], 'unavailable')
        self.assertIsNone(suppliers['total'])
        self.assertIsNone(suppliers['provides_pcf'])
