"""Snapshot-derived geography and read-only freight context for the UI."""
from .freight import calculate_freight, purchase_coverage
from .navigator_common import numeric, table_source, unique
from statistics import quantiles
from pathlib import Path
import hashlib


def calculation_version():
    root = Path(__file__).parent
    names = ['navigator_context.py', 'navigator_presentation.py', 'navigator_pathways.py', 'navigator_climate.py', 'navigator_nature.py', 'navigator_overview.py', 'navigator_routes.py', 'navigator_models.json', 'freight.py', 'analytics.py', 'schemas.py']
    return hashlib.sha256(b''.join((root / name).read_bytes().replace(b'\r\n', b'\n') for name in names)).hexdigest()


def geography(store, dataset_id, year=2025, include_parcels=False):
    store.dataset(dataset_id)
    result, issues = {}, []
    plans, plan_issues = unique(store.rows(dataset_id, 'parcel_crops', year=year), ('parcel_id', 'year')) if include_parcels else ([], [])
    selected_parcels = {row['values']['parcel_id'] for row in plans}
    issues.extend(plan_issues)
    for table, key in [('farm_registry', 'farm_id'), ('sites', 'site_id'), ('parcels', 'parcel_id')]:
        if table == 'parcels' and not include_parcels:
            result[table] = []
            continue
        records, problems = unique(store.rows(dataset_id, table), (key,))
        issues.extend(problems)
        points = []
        for record in records:
            if table == 'parcels' and record['values'].get(key) not in selected_parcels:
                continue
            try:
                values = record['values']
                lat, lon = numeric(values.get('lat'), negative=True), numeric(values.get('lon'), negative=True)
                if not -90 <= lat <= 90 or not -180 <= lon <= 180:
                    raise ValueError('Invalid coordinates')
                points.append({'id': values[key], 'lat': lat, 'lon': lon, 'values': values, 'source': record['source']})
            except ValueError as exc:
                issues.append({'code': 'invalid_map_coordinate', 'source': record['source'], 'message': str(exc)})
        # Detect gross coordinate outliers (including swapped lat/lon) from the
        # source population. Never silently repair or move a registered point.
        groups = {}
        for point in points:
            groups.setdefault(point['values'].get('country') or 'all', []).append(point)
        quarantined = set()
        for group in groups.values():
            if len(group) < 8:
                continue
            for axis in ('lat', 'lon'):
                q1, _, q3 = quantiles([point[axis] for point in group], n=4, method='inclusive')
                spread = q3 - q1
                if spread <= 0:
                    continue
                for point in group:
                    if point[axis] < q1 - 3 * spread or point[axis] > q3 + 3 * spread:
                        quarantined.add(point['id'])
        for point in points:
            if point['id'] in quarantined:
                issues.append({'code': 'coordinate_outlier', 'source': point['source'], 'message': 'Registered coordinates fall outside the source population 3-IQR envelope; omitted from the map without correction'})
        result[table] = [point for point in points if point['id'] not in quarantined]
    with store.connect() as db:
        years = [r['year'] for r in db.execute("SELECT DISTINCT year FROM records WHERE dataset_id=? AND table_name='parcel_crops' AND year IS NOT NULL ORDER BY year", (dataset_id,))]
    return {'dataset_id': dataset_id, 'parcel_plan_year': year if include_parcels else None, **result, 'parcel_plan_years': years, 'issues': issues,
            'sources': [table_source(store, dataset_id, table) for table in result],
            'limitations': ['Registered coordinates are source context, not modelled field-level yield predictions.', 'Parcel points are registered locations, not surveyed field or catchment boundaries.', 'Groups with at least eight points use a source-derived 3-IQR coordinate outlier screen (by country where supplied). Outliers are omitted from map extents, never silently corrected. This heuristic requires source review.']}


def freight_preview(store, dataset_id, year, direction=None, alternative_factor_id=None, adoption=0):
    output = calculate_freight(store.rows(dataset_id, 'shipments'), store.rows(dataset_id, 'factors'), year, direction, alternative_factor_id, adoption)
    output['purchase_coverage'] = purchase_coverage(store.rows(dataset_id, 'purchases', year=year), output['lines'], store.rows(dataset_id, 'materials'), year) if direction != 'outbound' else None
    with store.connect() as db:
        output['available_years'] = [r['year'] for r in db.execute("SELECT DISTINCT year FROM records WHERE dataset_id=? AND table_name='shipments' AND year IS NOT NULL ORDER BY year", (dataset_id,))]
    output['dataset_id'] = dataset_id
    output['sources'] = [table_source(store, dataset_id, 'shipments', year=year, direction=direction), table_source(store, dataset_id, 'factors')]
    return output
