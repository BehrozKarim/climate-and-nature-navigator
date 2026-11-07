"""Export reproducible, public synthetic starting results; never user review/chat state."""
from datetime import datetime, timezone
from pathlib import Path
import json
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from weatherlens_backend.config import Settings, load_environment
from weatherlens_backend.storage import Store
from weatherlens_backend.navigator_common import model
from weatherlens_backend.navigator_context import NavigatorContext
from weatherlens_backend.navigator_overview import overview
from weatherlens_backend.navigator_pathways import PathwayService
from weatherlens_backend.navigator_climate import ClimateRiskService
from weatherlens_backend.navigator_nature import NatureSensitivityService
from weatherlens_backend.navigator_routes import RouteService
from weatherlens_backend.navigator_presentation import geography, freight_preview, calculation_version


def stable(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


def main():
    load_environment()
    store = Store(Settings().database)
    datasets = store.datasets()
    if not datasets:
        raise SystemExit('Import the supplied synthetic snapshot first.')
    ds = datasets[0]['dataset_id']
    context = NavigatorContext(store, ds)
    resources = {'geography': geography(store, ds), 'catalog': context.catalog(), 'freight-catalog': RouteService(store, ds).catalog()}
    for restated in (False, True):
        data = context.inventory(2024, restated)
        # Dispositions are local mutable analyst state, not a public seed asset.
        for finding in data['quality_findings']:
            finding['resolution'] = 'unverified'
        resources[f'inventory:2024:{str(restated).lower()}'] = data
    for scenario in ('ssp126', 'ssp245', 'ssp585'):
        for year in (2030, 2040, 2050):
            data = overview(store, ds, scenario, year)
            data['attention'] = {'review_items': [], 'unresolved_findings': None, 'numerical_blockers': None}
            resources[f'overview:{scenario}:{year}'] = data
        inputs = {'physical_scenario': scenario, 'year': 2040, 'selection_mode': 'manual', 'start_years': {}}
        resources['pathways:' + stable(inputs)] = PathwayService(store, ds).calculate(**inputs)
    for crop in context.catalog()['crops']:
        result = ClimateRiskService(store, ds).calculate(crop_id=crop)
        result.pop('grid_cells', None)  # Grid visualization is intentionally not in the UI.
        resources['climate:' + crop] = result
    resources['nature:2025'] = NatureSensitivityService(store, ds).calculate()
    geo = geography(store, ds, 2025, True)
    for point in geo['parcels']:
        point['values'] = {key: value for key, value in point['values'].items() if key in ('parcel_id', 'farm_id', 'catchment_id', 'area_ha')}
    resources['nature-geography-2025'] = geo
    for hvo in (False, True):
        inputs = {'year': 2025, **({'alternative_factor_id': 'EF-TKM-TRUCK-HVO', 'adoption': 1} if hvo else {})}
        result = freight_preview(store, ds, **inputs)
        samples = {}
        for line in result['lines']:
            samples.setdefault((line['scope3_category'], line['mode']), line)
        result['lines'] = list(samples.values())
        result['cached_summary'] = True
        result['line_detail_note'] = 'Aggregate includes all eligible rows. One original example per category/mode is cached for inspection; full evidence is obtained from the backend when saving.'
        resources['freight-annual:' + stable(inputs)] = result
    route = RouteService(store, ds).lookup('turku', 'helsinki')
    resources['route:turku:helsinki'] = route
    inputs = {'mass_t': 24, 'legs': route['legs']}
    resources['trip:' + stable(inputs)] = {
        'current': RouteService(store, ds).calculate_trip(**inputs),
        'hvo': RouteService(store, ds).calculate_trip(mass_t=24, legs=[leg | {'mode': 'truck-hvo' if leg['mode'] == 'truck' else leg['mode']} for leg in route['legs']])}
    metadata, indices = [], {}
    def pack(value):
        if isinstance(value, list):
            return [pack(item) for item in value]
        if not isinstance(value, dict):
            return value
        if isinstance(value.get('source'), dict) and value['source'].get('table') == 'parcels' and 'lat' in value and 'values' in value:
            v = value['values']
            return {'$parcel': [value['id'], value['lon'], value['lat'], v.get('catchment_id'), v.get('farm_id'), v.get('area_ha'), pack(value['source'])]}
        if all(key in value for key in ('dataset_id', 'table', 'file_sha256')) and set(value) <= {'dataset_id', 'table', 'file', 'file_sha256', 'row_number', 'record_id'}:
            shared = {key: item for key, item in value.items() if key not in ('row_number', 'record_id')}
            key = stable(shared)
            if key not in indices:
                indices[key] = len(metadata)
                metadata.append(shared)
            return {'$source': [indices[key], value.get('row_number'), value.get('record_id')]}
        return {key: pack(item) for key, item in value.items()}
    packed = pack(resources)
    target = Path(__file__).resolve().parents[2] / 'frontend/src/data/initial-snapshot.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps({'schema': 2, 'dataset_id': ds, 'model_hash': calculation_version(),
                                  'generated_at': datetime.now(timezone.utc).isoformat(),
                                  'attribution': 'Synthetic challenge data, Since AI ry, CC BY 4.0. Excludes original workbook, documents, conversations and analyst review state.',
                                  'source_metadata': metadata, 'resources': packed}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'Exported {len(resources)} source-backed initial resources; {target.stat().st_size:,} bytes. No user review/chat state included.')


if __name__ == '__main__':
    main()
