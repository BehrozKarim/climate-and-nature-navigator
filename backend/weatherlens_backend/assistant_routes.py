"""Bounded, read-only route context for chat; arithmetic stays in RouteService."""
import re

from .navigator_routes import RouteService, key


def freight_context(store, dataset_id, question):
    service = RouteService(store, dataset_id)
    text = key(question)
    hits, from_place, to_place = [], None, None
    for place in service.model['parameters']['places']:
        aliases = [key(name) for name in [place['id'], place['name'], *place['aliases']]]
        pattern = r'\b(?:' + '|'.join(re.escape(name) for name in sorted(set(aliases), key=len, reverse=True)) + r')\b'
        match = re.search(pattern, text)
        if match:
            hits.append((match.start(), place))
        if re.search(r'\bfrom\s+(?:the\s+)?' + pattern, text):
            from_place = place
        if re.search(r'\bto\s+(?:the\s+)?' + pattern, text):
            to_place = place
    intent = bool(re.search(r'\b(distance|route|journey)\b|\bfrom\b.+\bto\b', text))
    if not intent and not (len(hits) >= 2 and re.search(r'\b(freight|emissions?|cargo|transport|truck)\b', text)):
        return None, []
    model = service.model
    parameters = model['parameters']
    citations = [{
        'citation_id': 'routing:' + model['config_sha256'], 'dataset_id': dataset_id,
        'path': 'Routing model (illustrative)', 'source_kind': 'model', 'model': model,
        'unverified': True,
        'excerpt': f"Coordinate-based distance estimate. Road uplift {parameters['road_great_circle_multiplier']}; sea uplift {parameters['sea_great_circle_multiplier']}. Port choices and display routes are illustrative; no external routing service verified them. Model configuration: {model['config_sha256']}.",
    }]
    if len(hits) != 2:
        return {'kind': 'freight_question', 'status': 'needs_locations', 'message': 'Ask for one origin and one destination from the supported locations.', 'supported_locations': [p['name'] for p in parameters['places']]}, citations
    ordered = [p for _, p in sorted(hits, key=lambda hit: hit[0])]
    origin, destination = (from_place, to_place) if from_place and to_place else ordered
    if origin['id'] == destination['id']:
        return {'kind': 'freight_question', 'status': 'needs_locations', 'message': 'Origin and destination must differ.'}, citations
    route = service.lookup(origin['id'], destination['id'])
    legs = route['legs']
    facts = {'kind': 'freight_question', 'origin': origin['name'], 'destination': destination['name'], 'distance_km': round(sum(leg['distance_km'] for leg in legs), 1), 'legs': legs, 'status': 'distance_estimate', 'externally_verified': False, 'limitations': route['limitations'], 'model': model}
    masses = re.findall(r'(?<![\w.])(-?\d+(?:[.,]\d+)?)\s*(?:t\b|tonnes?\b|tons?\b)', text)
    if not masses:
        facts['mass_t'] = None
        facts['emissions_status'] = 'Cargo mass is required to calculate total emissions.'
        return facts, citations
    if len(masses) != 1 or not 0 < float(masses[0].replace(',', '.')) <= 1000000:
        facts.update(status='needs_mass', message='Supply one positive cargo mass up to 1,000,000 tonnes.')
        return facts, citations
    if re.search(r'\b(ship|vessel|sea|ferry|rail|reefer|refrigerated|hvo)\b', text):
        facts.update(status='needs_mode_selection', message='Use the Freight form to specify each leg and the requested transport mode; do not apply the default truck estimate to this request.')
        return facts, citations
    mass = float(masses[0].replace(',', '.'))
    trip = service.calculate_trip(mass_t=mass, legs=legs)
    facts.update(status='calculated_estimate', mass_t=mass, total_kgco2e=trip['total_kgco2e'], total_tco2e=trip['total_tco2e'], calculated_legs=trip['lines'], method_version=trip['method_version'], mode_assumption='Dry truck on road legs; maritime legs use the lookup model. Operational route and mode feasibility are unverified.')
    seen = set()
    for line in trip['lines']:
        source = line['factor_source']
        identity = 'factor:' + source['file_sha256'] + ':' + str(source['row_number'])
        if identity in seen:
            continue
        seen.add(identity)
        citations.append({'citation_id': identity, 'dataset_id': dataset_id, 'path': source['file'], 'source_kind': 'source_row', 'source': source, 'line_start': source['row_number'], 'line_end': source['row_number'], 'unverified': True, 'excerpt': f"{line['factor_id']}: {line['factor_kgco2e_per_tkm']} kg CO2e per tonne-km; factor version {line['factor_version']}."})
    return facts, citations
