import unittest
from tests.helpers import source_row
from weatherlens_backend.freight import calculate_freight, purchase_coverage


class FreightTests(unittest.TestCase):
    def setUp(self):
        self.leg = dict(shipment_id='S1', year=2025, direction='inbound', ref_doc='P1', ef_id='EF-TKM-TRUCK', mode='truck', t=10, km=100, tkm=1000)
        self.factors = [source_row(dict(ef_id='EF-TKM-TRUCK', unit='tkm', kgco2e_per_unit='.092', version='2025'), table='factors'), source_row(dict(ef_id='EF-TKM-TRUCK-HVO', unit='tkm', kgco2e_per_unit='.020', version='2025'), 3, 'factors')]

    def compute(self, rows=None, **kw):
        return calculate_freight(rows or [source_row(self.leg)], self.factors, 2025, **kw)

    def test_independent_arithmetic_and_same_activity_sensitivity(self):
        result = self.compute(alternative_factor_id='EF-TKM-TRUCK-HVO', adoption=.5)
        self.assertAlmostEqual(result['baseline_tco2e'], .092)
        self.assertAlmostEqual(result['scenario_tco2e'], .056)
        self.assertAlmostEqual(result['difference_tco2e'], .036)
        self.assertEqual(result['lines'][0]['scope3_category'], 4)
        self.assertEqual(result['lines'][0]['factor_source']['table'], 'factors')
        self.assertEqual(result['scope'], 'freight_only')

    def test_exact_duplicate_counts_once(self):
        result = self.compute([source_row(self.leg), source_row(self.leg, 3)])
        self.assertEqual(len(result['lines']), 1)
        self.assertAlmostEqual(result['baseline_tco2e'], .092)
        self.assertIn('duplicate_exact', [i['code'] for i in result['issues']])

    def test_conflict_quarantines_every_row_regardless_of_order(self):
        rows = [source_row(self.leg), source_row(self.leg | {'t': 20}, 3)]
        for ordered in [rows, rows[::-1]]:
            result = self.compute(ordered)
            self.assertEqual(result['lines'], [])
            self.assertIsNone(result['baseline_tco2e'])
            self.assertEqual(result['excluded_rows'], 2)

    def test_conflicting_factors_quarantine_affected_shipments(self):
        self.factors.append(source_row(dict(ef_id='EF-TKM-TRUCK', unit='tkm', kgco2e_per_unit='.2', version='2025'), 4, 'factors'))
        self.assertIsNone(self.compute()['baseline_tco2e'])

    def test_invalid_and_missing_factors_do_not_become_zero_emissions(self):
        for change in [{'t': '-1'}, {'km': 'NaN'}, {'t': 'inf'}, {'t': '1e1000000'}, {'ef_id': 'unknown'}, {'mode': 'vessel'}, {'direction': 'unknown'}]:
            with self.subTest(change=change):
                result = self.compute([source_row(self.leg | change)])
                self.assertIsNone(result['baseline_tco2e'])
                self.assertEqual(result['excluded_rows'], 1)

    def test_factor_unit_and_nonfinite_factor_are_rejected(self):
        for change in [{'unit': 'kg'}, {'kgco2e_per_unit': 'nan'}, {'kgco2e_per_unit': '-1'}]:
            old = self.factors[0]
            self.factors[0] = source_row(old['values'] | change, table='factors')
            self.assertIsNone(self.compute()['baseline_tco2e'])
            self.factors[0] = old

    def test_recorded_tkm_discrepancy_has_explicit_correction(self):
        result = self.compute([source_row(self.leg | {'tkm': 9000})])
        self.assertAlmostEqual(result['baseline_tco2e'], .092)
        self.assertIn('tkm_recomputed', [i['code'] for i in result['issues']])

    def test_invalid_what_if_is_rejected(self):
        for args in [{'adoption': 1.1}, {'adoption': float('nan')}, {'adoption': .5}, {'alternative_factor_id': 'UNKNOWN', 'adoption': .5}]:
            with self.subTest(args=args), self.assertRaises(ValueError):
                self.compute(**args)

    def test_vessel_leg_stays_in_scenario_and_outbound_is_category_nine(self):
        self.factors.append(source_row(dict(ef_id='EF-TKM-SHIP-BULK', unit='tkm', kgco2e_per_unit='.013', version='2025'), 4, 'factors'))
        rows = [source_row(self.leg), source_row(self.leg | {'shipment_id': 'S2', 'mode': 'vessel', 'ef_id': 'EF-TKM-SHIP-BULK', 'direction': 'outbound'}, 3)]
        result = self.compute(rows, alternative_factor_id='EF-TKM-TRUCK-HVO', adoption=1)
        self.assertAlmostEqual(result['baseline_tco2e'], .105)
        self.assertAlmostEqual(result['scenario_tco2e'], .033)
        self.assertEqual(result['lines'][1]['scope3_category'], 9)

    def test_unassignable_year_and_direction_are_coverage_warnings(self):
        rows = [source_row(self.leg), source_row(self.leg | {'shipment_id': 'S2', 'year': 'invalid'}, 3), source_row(self.leg | {'shipment_id': 'S3', 'direction': 'unknown'}, 4)]
        result = self.compute(rows, direction='inbound')
        self.assertEqual(result['unassignable_rows'], 2)
        self.assertNotEqual(result['status'], 'calculated')
        self.assertAlmostEqual(result['baseline_tco2e'], .092)

    def test_purchase_match_gap_is_warning_not_invented_missing_leg(self):
        purchases = [source_row(dict(doc_no='P1', posting_date='2025-01-01', quantity=10, movement_type='101', material_id='M1'), 2, 'purchases'), source_row(dict(doc_no='P2', posting_date='2025-01-01', quantity=20, movement_type='101', material_id='M1'), 3, 'purchases'), source_row(dict(doc_no='CREDIT', posting_date='2025-01-01', quantity=-10, movement_type='122', material_id='M1'), 4, 'purchases')]
        coverage = purchase_coverage(purchases, self.compute()['lines'], [], 2025)
        self.assertEqual(coverage['unmatched_receipt_document_count'], 1)
        self.assertEqual(coverage['unmatched_receipt_documents'][0]['doc_no'], 'P2')
        self.assertIsNone(coverage['confirmed_missing_leg_count'])

    def test_actual_package_modes_are_included_without_inventing_reefer_hvo_factor(self):
        cases = [('truck-reefer', 'EF-TKM-TRUCK-REEFER', '.118', 'truck'), ('ship-bulk', 'EF-TKM-SHIP-BULK', '.013', 'vessel'), ('ship-reefer', 'EF-TKM-SHIP-REEFER', '.021', 'vessel'), ('ropax', 'EF-TKM-ROPAX', '.060', 'ferry')]
        for mode, ef, value, normalized in cases:
            self.factors.append(source_row(dict(ef_id=ef, unit='tkm', kgco2e_per_unit=value, version='2025'), len(self.factors) + 2, 'factors'))
            result = self.compute([source_row(self.leg | {'mode': mode, 'ef_id': ef})], alternative_factor_id='EF-TKM-TRUCK-HVO', adoption=1)
            self.assertEqual(result['included_rows'], 1, mode)
            self.assertEqual(result['lines'][0]['mode'], normalized)
            self.assertAlmostEqual(result['baseline_tco2e'], float(value))
            self.assertAlmostEqual(result['scenario_tco2e'], float(value))
