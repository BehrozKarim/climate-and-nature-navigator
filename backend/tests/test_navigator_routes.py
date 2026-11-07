from tests.navigator_fixture import NavigatorCase
from weatherlens_backend.navigator_routes import RouteService


class RouteTests(NavigatorCase):
    def routes(self):
        return RouteService(self.store, self.ds)

    def test_manual_trip_has_exact_factor_arithmetic_and_unverified_distance(self):
        result = self.routes().calculate_trip(10, [{'origin': 'A', 'destination': 'B', 'distance_km': 100, 'mode': 'truck'}])
        self.assertAlmostEqual(result['total_kgco2e'], 92)
        self.assertEqual(result['tonne_kilometres'], 1000)
        self.assertEqual(result['lines'][0]['distance_basis'], 'user_entered_unverified')
        self.assertEqual(result['lines'][0]['factor_source']['dataset_id'], self.ds)

    def test_route_lookup_is_estimated_and_rejects_unknown_or_same_alias(self):
        result = self.routes().lookup('Riga port', 'Kantvik mill')
        self.assertTrue(result['estimated'])
        self.assertFalse(result['externally_verified'])
        self.assertTrue(all(l['distance_basis'] == 'great_circle_estimate' for l in result['legs']))
        for origin, destination in [('unknown', 'Riga'), ('Säkylä', 'Sakyla')]:
            with self.assertRaises(ValueError):
                self.routes().lookup(origin, destination)

    def test_preset_and_mode_validation(self):
        result = self.routes().calculate_trip(None, preset_id='lv')
        self.assertAlmostEqual(result['total_kgco2e'], 2400 * (48 * .092 + 372 * .013))
        self.assertEqual(result['lines'][0]['distance_basis'], 'prototype_preset_estimate')
        for mass, legs in [(0, [{'distance_km': 10, 'mode': 'truck'}]), (10, [{'distance_km': 10, 'mode': 'aircraft'}])]:
            with self.assertRaises(ValueError):
                self.routes().calculate_trip(mass, legs)
