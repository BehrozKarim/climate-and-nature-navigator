from math import asin, cos, radians, sin, sqrt
import unicodedata
from .freight import number, valid_factor
from .navigator_common import model, unique


MODES = {'truck': ('EF-TKM-TRUCK', 'truck'), 'truck-reefer': ('EF-TKM-TRUCK-REEFER', 'truck-reefer'), 'truck-hvo': ('EF-TKM-TRUCK-HVO', 'truck'), 'rail': ('EF-TKM-RAIL', 'rail'), 'ship-bulk': ('EF-TKM-SHIP-BULK', 'ship-bulk'), 'ship-reefer': ('EF-TKM-SHIP-REEFER', 'ship-reefer'), 'ropax': ('EF-TKM-ROPAX', 'ropax')}


def key(text):
    return ''.join(c for c in unicodedata.normalize('NFKD', text.strip().casefold()) if not unicodedata.combining(c))


def distance(a, b):
    lat1, lat2 = radians(a['lat']), radians(b['lat'])
    value = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin(radians(b['lon'] - a['lon']) / 2) ** 2
    return 12742 * asin(sqrt(min(1, max(0, value))))


class RouteService:
    def __init__(self, store, dataset_id):
        self.store, self.ds = store, dataset_id
        store.dataset(dataset_id)
        self.model = model('routing')

    def catalog(self):
        factors, issues = unique(self.store.rows(self.ds, 'factors'), ('ef_id',))
        lookup = {r['values']['ef_id']: r for r in factors}
        modes = []
        for mode, (factor_id, family) in MODES.items():
            if factor_id in lookup:
                factor = lookup[factor_id]
                modes.append({'id': mode, 'factor_id': factor_id, 'factor_kgco2e_per_tkm': float(valid_factor(factor, family)), 'name': factor['values'].get('name'), 'source': factor['source']})
        return {'dataset_id': self.ds, 'places': self.model['parameters']['places'], 'presets': [p | {'estimated': True, 'distance_basis': 'prototype_preset_estimate'} for p in self.model['parameters']['presets']], 'modes': modes, 'model': self.model, 'issues': issues, 'externally_verified': False}

    def lookup(self, origin, destination):
        places = self.model['parameters']['places']
        aliases = {key(name): p for p in places for name in [p['id'], p['name'], *p['aliases']]}
        a, b = aliases.get(key(origin)), aliases.get(key(destination))
        if a is None or b is None:
            raise ValueError('Unknown origin or destination; choose a known place or enter explicit shipment legs')
        if a['id'] == b['id'] or distance(a, b) < .01:
            raise ValueError('Origin and destination must differ')
        def leg(x, y, sea=False):
            mode = 'ropax' if sea and {x['group'], y['group']} == {'FI', 'SE'} else 'ship-bulk' if sea else 'truck'
            multiplier = self.model['parameters']['sea_great_circle_multiplier' if sea else 'road_great_circle_multiplier']
            return {'origin': x['name'], 'destination': y['name'], 'mode': mode, 'distance_km': round(distance(x, y) * multiplier, 1), 'points': [[x['lat'], x['lon']], [y['lat'], y['lon']]], 'distance_basis': 'great_circle_estimate'}
        if a['group'] == b['group']:
            legs = [leg(a, b)]
        else:
            pa = min((p for p in places if p['group'] == a['group'] and p['port']), key=lambda p: distance(p, b))
            pb = min((p for p in places if p['group'] == b['group'] and p['port']), key=lambda p: distance(p, a))
            legs = ([leg(a, pa)] if distance(a, pa) > 2 else []) + [leg(pa, pb, True)] + ([leg(pb, b)] if distance(pb, b) > 2 else [])
        return {'origin': a, 'destination': b, 'legs': legs, 'estimated': True, 'externally_verified': False, 'model': self.model, 'limitations': ['Great-circle uplifts and port choices are illustrative, not navigable routes or verified services.', 'Replace distances with a licensed road/maritime provider or reviewed source before operational use.']}

    def calculate_trip(self, mass_t=None, legs=None, preset_id=None, material=''):
        if preset_id is not None:
            if legs is not None:
                raise ValueError('Choose a preset or explicit legs, not both')
            preset = next((p for p in self.model['parameters']['presets'] if p['id'] == preset_id), None)
            if preset is None:
                raise ValueError('Unknown route preset')
            legs = preset['legs']
            mass_t = preset['mass_t'] if mass_t is None else mass_t
            material = material or preset['material']
        mass = number(mass_t, 'mass_t')
        if mass <= 0 or mass > 1000000 or not legs or not 1 <= len(legs) <= 10:
            raise ValueError('Use positive mass up to 1,000,000 t and 1–10 route legs')
        factors, issues = unique(self.store.rows(self.ds, 'factors'), ('ef_id',))
        lookup = {r['values']['ef_id']: r for r in factors}
        lines = []
        total = number(0)
        activity = number(0)
        for index, leg in enumerate(legs):
            mode = leg.get('mode')
            if mode not in MODES:
                raise ValueError('Unsupported freight mode')
            factor_id, family = MODES[mode]
            if factor_id not in lookup:
                raise ValueError('Factor missing or ambiguous for the requested mode')
            factor = valid_factor(lookup[factor_id], family)
            km = number(leg.get('distance_km'), 'distance_km')
            if not 0 < km <= 100000:
                raise ValueError('Leg distance must be positive and at most 100,000 km')
            tkm = mass * km
            kg = tkm * factor
            total += kg
            activity += tkm
            lines.append({'leg_index': index, 'origin': leg.get('origin', ''), 'destination': leg.get('destination', ''), 'mode': mode, 'distance_km': float(km), 'mass_t': float(mass), 'tonne_kilometres': float(tkm), 'kgco2e': float(kg), 'factor_id': factor_id, 'factor_kgco2e_per_tkm': float(factor), 'factor_source': lookup[factor_id]['source'], 'factor_version': lookup[factor_id]['values'].get('version'), 'distance_basis': 'prototype_preset_estimate' if preset_id else leg.get('distance_basis', 'user_entered_unverified'), 'distance_verification': 'unverified_model_preset' if preset_id else 'unverified_client_input', 'points': leg.get('points', []), 'source': {'kind': 'model_preset' if preset_id else 'request_input', 'preset_id': preset_id, 'field': f'legs[{index}]'}})
        return {'dataset_id': self.ds, 'method_version': 'navigator-shipment-leg-wtw-v1', 'status': 'calculated_estimate', 'material': material, 'mass_t': float(mass), 'total_kgco2e': float(total), 'total_tco2e': float(total / 1000), 'kgco2e_per_tonne_delivered': float(total / mass), 'tonne_kilometres': float(activity), 'lines': lines, 'issues': issues, 'model': self.model, 'externally_verified_route': False, 'limitations': ['Factor arithmetic is deterministic; distances are estimates or unverified user inputs.', 'No shipment inventory is changed by this trip calculation.']}
