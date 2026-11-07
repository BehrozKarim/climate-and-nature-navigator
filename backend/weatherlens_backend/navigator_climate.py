from calendar import monthrange
from collections import defaultdict
from functools import lru_cache
from statistics import mean
from .navigator_common import model, numeric, table_source, unique
from .storage import Store


@lru_cache(maxsize=2)
def climate_cube(database, dataset_id, config_sha256):
    store = Store(database)
    parameters = model('climate')['parameters']
    raw_grid = store.rows(dataset_id, 'climate_grid_cells')
    grid, issues = unique(raw_grid, ('cell_id',))
    cells = {}
    for row in grid:
        try:
            lat, lon = numeric(row['values'].get('lat'), negative=True), numeric(row['values'].get('lon'), negative=True)
            if not -90 <= lat <= 90 or not -180 <= lon <= 180:
                raise ValueError('Invalid grid coordinate')
            cells[row['values']['cell_id']] = {'cell_id': row['values']['cell_id'], 'region': row['values'].get('region'), 'lat': lat, 'lon': lon, 'source': row['source']}
        except ValueError as exc:
            issues.append({'code': 'invalid_grid_coordinate', 'message': str(exc), 'source': row['source']})
    grouped = defaultdict(dict)
    invalid = set()
    months = set(parameters['months'])
    for row in store.rows(dataset_id, 'climate_monthly'):
        v = row['values']
        try:
            year, month = int(v['year']), int(v['month'])
            cell, scenario = v['cell_id'], v['scenario']
        except (ValueError, KeyError):
            continue
        if cell not in cells or month not in months:
            continue
        key = (cell, scenario, year)
        if month in grouped[key]:
            invalid.add(key)
            issues.append({'code': 'duplicate_climate_month', 'source': row['source']})
            continue
        try:
            values = {'temperature': numeric(v.get('tmean_c'), negative=True), 'precip': numeric(v.get('precip_mm')), 'pet': numeric(v.get('pet_mm')), 'hot_days': numeric(v.get('hot_days_tmax_ge_27')), 'days': monthrange(year, month)[1]}
            if not -100 <= values['temperature'] <= 70 or values['hot_days'] > values['days']:
                raise ValueError('Climate indicator outside supported range')
            grouped[key][month] = values
        except ValueError as exc:
            invalid.add(key)
            issues.append({'code': 'invalid_climate_month', 'message': str(exc), 'source': row['source']})
    annual = {}
    for key, observed in grouped.items():
        if key in invalid or set(observed) != months:
            continue
        summer = [observed[m] for m in parameters['summer_months']]
        annual[key] = {'summer_temperature_c': sum(v['temperature'] * v['days'] for v in summer) / sum(v['days'] for v in summer), 'seasonal_hot_days': sum(v['hot_days'] for v in observed.values()), 'seasonal_precipitation_mm': sum(v['precip'] for v in observed.values()), 'seasonal_pet_mm': sum(v['pet'] for v in observed.values()), 'water_deficit_mm': max(0, sum(v['pet'] - v['precip'] for v in observed.values()))}
    start, end = parameters['baseline_years']
    baseline = {}
    for cell in cells:
        observations = [(year, annual[(cell, 'historical', year)]) for year in range(start, end + 1) if (cell, 'historical', year) in annual]
        if observations:
            baseline[cell] = {'summer_temperature_c': mean(v['summer_temperature_c'] for _, v in observations), 'included_years': [y for y, _ in observations]}
    return {'cells': cells, 'raw_grid': raw_grid, 'annual': annual, 'baseline': baseline, 'issues': issues}


class ClimateRiskService:
    def __init__(self, store, dataset_id):
        self.store, self.ds = store, dataset_id
        store.dataset(dataset_id)
        self.model = model('climate')

    def calculate(self, physical_scenario='ssp245', year=2040, crop_id='pea_fi', volume_t=1000):
        p = self.model['parameters']
        if physical_scenario not in ('ssp126', 'ssp245', 'ssp585') or crop_id not in p['crops'] or isinstance(year, bool) or not isinstance(year, int) or not 2025 <= year <= 2060:
            raise ValueError('Choose a supported crop/scenario and year in 2025–2060')
        volume = numeric(volume_t, 'volume_t')
        if not 0 < volume <= 10000000:
            raise ValueError('Volume must be positive and at most 10,000,000 t')
        cube = climate_cube(str(self.store.path.resolve()), self.ds, self.model['config_sha256'])
        crop = p['crops'][crop_id]
        region = crop['region']
        # No fitted crop-response coefficients are supplied. Expose weather evidence
        # without converting design-reference sensitivities into yield predictions.
        response = None
        expected = {r['values']['cell_id'] for r in cube['raw_grid'] if r['values'].get('region') == region and r['values'].get('cell_id')}
        unidentified = sum(not r['values'].get('cell_id') for r in cube['raw_grid'] if r['values'].get('region') == region)
        def points(scenario, y, selected_region=None):
            weather = 'historical' if y <= 2026 else scenario
            output = []
            for cell, meta in cube['cells'].items():
                if selected_region is not None and meta['region'] != selected_region:
                    continue
                value, baseline = cube['annual'].get((cell, weather, y)), cube['baseline'].get(cell)
                if value is None or baseline is None:
                    continue
                output.append(meta | value | {'summer_warming_c': value['summer_temperature_c'] - baseline['summer_temperature_c'], 'baseline_years_included': baseline['included_years'], 'climate_filter': {'cell_id': cell, 'scenario': weather, 'year': y, 'months': p['months']}})
            return output
        def summary(scenario, y, selected_region=region, response_coefficient=response):
            rows = points(scenario, y, selected_region)
            if not rows:
                return None
            warming = mean(r['summer_warming_c'] for r in rows)
            return {'summer_warming_c': warming, 'seasonal_hot_days': mean(r['seasonal_hot_days'] for r in rows), 'water_deficit_mm': mean(r['water_deficit_mm'] for r in rows), 'yield_change_pct_estimate': None, 'matched_cells': len(rows), 'baseline_cell_years_included': sum(len(r['baseline_years_included']) for r in rows)}
        selected = summary(physical_scenario, year)
        grid = points(physical_scenario, year)
        for point in grid:
            point['yield_change_pct_estimate'] = None
        timeline = [{'scenario': scenario, 'year': y, 'values': summary(scenario, y)} for scenario in ('ssp126', 'ssp245', 'ssp585') for y in range(2025, 2061)]
        hedge = {}
        for pea_id in ('pea_fi', 'pea_se'):
            pea = p['crops'][pea_id]
            coefficient = None
            hedge[pea['region']] = summary(physical_scenario, year, pea['region'], coefficient)
        prices, price_issues = unique([r for r in self.store.rows(self.ds, 'contract_prices_and_replacement_premiums') if r['values'].get('item') == crop['price_item'] and int(r['values'].get('year', 0)) <= year], ('year', 'item'))
        price = max(prices, key=lambda r: int(r['values']['year'])) if prices else None
        replacement = None
        if selected is not None and selected['yield_change_pct_estimate'] is not None and price is not None:
            loss = max(0, -selected['yield_change_pct_estimate']) / 100 * volume
            unit_price = numeric(price['values'].get('contract_price_eur_t'))
            premium = numeric(price['values'].get('replacement_import_premium_frac'))
            replacement = {'volume_basis_t': volume, 'shortfall_t_estimate': loss, 'incremental_import_cost_eur_estimate': loss * unit_price * premium, 'contract_price_eur_t': unit_price, 'replacement_premium_fraction': premium, 'price_year': int(price['values']['year']), 'price_basis': 'latest_supplied_price_at_or_before_selected_year_not_a_future_price_forecast', 'source': price['source']}
        complete_baseline = (p['baseline_years'][1] - p['baseline_years'][0] + 1) * len(expected)
        full = selected is not None and selected['matched_cells'] == len(expected) and selected['baseline_cell_years_included'] == complete_baseline and not unidentified
        return {'dataset_id': self.ds, 'method_version': 'navigator-supplied-monthly-exposure-v2', 'status': ('calculated_exposure' if full else 'partial_coverage') if selected else 'insufficient_data', 'physical_scenario': physical_scenario, 'weather_scenario_used': 'historical' if year <= 2026 else physical_scenario, 'year': year, 'crop_id': crop_id, 'crop': crop, 'selected': selected, 'replacement': replacement, 'price_context': price, 'timeline': timeline, 'grid_cells': grid, 'sourcing_hedge': hedge, 'coverage': {'expected_region_cells': len(expected), 'included_region_cells': selected['matched_cells'] if selected else 0, 'unidentified_grid_records': unidentified, 'expected_baseline_cell_years': complete_baseline, 'included_baseline_cell_years': selected['baseline_cell_years_included'] if selected else 0}, 'model': self.model, 'trained_or_validated_forecast': False, 'issues': cube['issues'] + price_issues, 'sources': [table_source(self.store, self.ds, 'climate_monthly', baseline_years=p['baseline_years'], selected_year=year, months=p['months']), table_source(self.store, self.ds, 'climate_grid_cells')], 'limitations': ['Climate indicators use complete monthly seasons and equal cell weights.', '2025–2026 use historical weather identically across SSP choices; scenario weather starts in 2027.', 'Yield forecasts and replacement losses are unavailable: no fitted or validated crop-response model is supplied.', 'Hot days and PET-minus-precipitation are exposure indicators; the latter is not SPEI or measured water availability.', 'Price context is the latest supplied record at or before the selected year; it is not a future-price or business-loss forecast.']}
