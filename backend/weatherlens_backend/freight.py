"""Deterministic shipment-leg accounting. Never a complete corporate inventory."""
from collections import defaultdict
from decimal import Decimal, InvalidOperation
import json


METHOD = 'freight-tonnes-km-wtw-v2'
MODE_FACTORS = {'truck': {'EF-TKM-TRUCK', 'EF-TKM-TRUCK-REEFER', 'EF-TKM-TRUCK-HVO'}, 'vessel': {'EF-TKM-SHIP-BULK', 'EF-TKM-SHIP-REEFER'}, 'ferry': {'EF-TKM-ROPAX'}, 'rail': {'EF-TKM-RAIL'}}
MODE_FACTORS.update({'truck-reefer': {'EF-TKM-TRUCK-REEFER'}, 'ship-bulk': {'EF-TKM-SHIP-BULK'}, 'ship-reefer': {'EF-TKM-SHIP-REEFER'}, 'ropax': {'EF-TKM-ROPAX'}})
MODE_ALIASES = {'truck-reefer': 'truck', 'ship-bulk': 'vessel', 'ship-reefer': 'vessel', 'ropax': 'ferry'}


def number(value, name='value', allow_negative=False):
    try:
        value = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise ValueError(f'{name} must be a finite number') from None
    if not value.is_finite() or value.copy_abs() > Decimal('1e15') or (not allow_negative and value < 0):
        raise ValueError(f'{name} must be finite, nonnegative and within supported bounds')
    return value


def deduplicate(rows, key):
    groups, valid, issues = defaultdict(list), [], []
    for row in rows:
        value = row['values'].get(key)
        if not value:
            issues.append({'code': 'missing_id', 'severity': 'error', 'source': row['source'], 'message': f'Missing {key}; row excluded'})
        else:
            groups[value].append(row)
    for group in groups.values():
        variants = {json.dumps(r['values'], sort_keys=True) for r in group}
        if len(variants) > 1:
            issues.extend({'code': 'duplicate_conflict', 'severity': 'error', 'source': r['source'], 'message': f'Conflicting {key}; every row with this ID is excluded'} for r in group)
        else:
            valid.append(group[0])
            issues.extend({'code': 'duplicate_exact', 'severity': 'warning', 'source': r['source'], 'message': 'Exact repeated record excluded; first occurrence retained'} for r in group[1:])
    return valid, issues


def valid_factor(row, mode):
    values = row['values']
    if values.get('unit') != 'tkm':
        raise ValueError('Freight factor unit must be tkm')
    if values.get('ef_id') not in MODE_FACTORS.get(mode, set()):
        raise ValueError('Factor is incompatible with shipment mode')
    return number(values.get('kgco2e_per_unit'), 'factor')


def calculate_freight(shipments, factors, year, direction=None, alternative_factor_id=None, adoption=0):
    if isinstance(year, bool) or not isinstance(year, int) or not 1900 <= year <= 2100:
        raise ValueError('A valid integer year is required')
    if direction not in (None, 'inbound', 'outbound'):
        raise ValueError('Direction must be inbound or outbound')
    fraction = number(adoption, 'adoption')
    if fraction > 1 or (fraction and not alternative_factor_id):
        raise ValueError('Adoption must be 0–1 and a factor is required for nonzero adoption')
    clean_factors, factor_issues = deduplicate(factors, 'ef_id')
    lookup = {r['values']['ef_id']: r for r in clean_factors}
    alternative = None
    if alternative_factor_id:
        if alternative_factor_id not in lookup:
            raise ValueError('Alternative factor is missing or ambiguous')
        alternative = valid_factor(lookup[alternative_factor_id], 'truck')
        if alternative_factor_id == 'EF-TKM-TRUCK-REEFER':
            raise ValueError('This sensitivity compares ambient-truck fuels, not refrigeration service changes')
    clean, all_issues = deduplicate(shipments, 'shipment_id')
    selected_sources = {r['source']['row_number'] for r in shipments if str(r['values'].get('year')) == str(year) and (direction is None or r['values'].get('direction') == direction)}
    issues = factor_issues + [i for i in all_issues if i['source']['row_number'] in selected_sources]
    unassignable = []
    for row in shipments:
        value = row['values']
        year_text = str(value.get('year', ''))
        unknown_year = not year_text.isdigit() or not 1900 <= int(year_text) <= 2100
        unknown_direction = year_text == str(year) and value.get('direction') not in ('inbound', 'outbound')
        if unknown_year or (unknown_direction and direction is not None):
            unassignable.append(row)
            issues.append({'code': 'unassignable_selection', 'severity': 'warning', 'source': row['source'], 'message': 'Missing/invalid year or direction prevents allocation to the selected scope; excluded from this subtotal'})
    lines = []
    for row in clean:
        v, source = row['values'], row['source']
        if source['row_number'] not in selected_sources:
            continue
        try:
            if v.get('direction') not in ('inbound', 'outbound'):
                raise ValueError('Unsupported shipment direction')
            ef_id, source_mode = v.get('ef_id'), v.get('mode')
            mode = MODE_ALIASES.get(source_mode, source_mode)
            if ef_id not in lookup:
                raise ValueError('Factor is missing or has conflicting duplicate definitions')
            factor = valid_factor(lookup[ef_id], source_mode)
            tonnes, km = number(v.get('t'), 'tonnes'), number(v.get('km'), 'kilometres')
            tkm = tonnes * km
            if tkm > Decimal('1e18'):
                raise ValueError('Shipment activity exceeds supported bounds')
            try:
                recorded = number(v.get('tkm'), 'recorded tkm')
                different = abs(recorded - tkm) > max(Decimal('.02'), tkm * Decimal('.000001'))
            except ValueError:
                different = True
            if different:
                issues.append({'code': 'tkm_recomputed', 'severity': 'warning', 'source': source, 'message': 'Used tonnes × kilometres; recorded tkm differs or is invalid', 'recorded_tkm': v.get('tkm'), 'calculated_tkm': float(tkm)})
            baseline = tkm * factor / 1000
            eligible = mode == 'truck' and ef_id != 'EF-TKM-TRUCK-REEFER' and alternative is not None
            applied = (1 - fraction) * factor + fraction * alternative if eligible else factor
            scenario = tkm * applied / 1000
            lines.append({'shipment_id': v['shipment_id'], 'year': year, 'direction': v['direction'], 'scope3_category': 4 if v['direction'] == 'inbound' else 9, 'mode': mode, 'source_mode': source_mode, 'ref_doc': v.get('ref_doc'), 'tonnes': float(tonnes), 'kilometres': float(km), 'tonne_kilometres': float(tkm), 'factor_id': ef_id, 'factor_kgco2e_per_tkm': float(factor), 'factor_version': lookup[ef_id]['values'].get('version'), 'factor_reference': lookup[ef_id]['values'].get('reference_source'), 'baseline_tco2e': float(baseline), 'scenario_tco2e': float(scenario), 'source': source, 'factor_source': lookup[ef_id]['source'], 'alternative_factor_source': lookup[alternative_factor_id]['source'] if eligible else None})
        except ValueError as exc:
            issues.append({'code': 'invalid_shipment', 'severity': 'error', 'source': source, 'message': str(exc)})
    baseline = sum(Decimal(str(r['baseline_tco2e'])) for r in lines)
    scenario = sum(Decimal(str(r['scenario_tco2e'])) for r in lines)
    grouped = defaultdict(lambda: {'baseline_tco2e': 0., 'scenario_tco2e': 0., 'legs': 0})
    for line in lines:
        entry = grouped[f"category_{line['scope3_category']}:{line['mode']}"]
        entry['baseline_tco2e'] += line['baseline_tco2e']
        entry['scenario_tco2e'] += line['scenario_tco2e']
        entry['legs'] += 1
    return {'method_version': METHOD, 'scope': 'freight_only', 'synthetic': True, 'status': 'calculated_with_exclusions' if lines and len(selected_sources) != len(lines) else (('calculated_with_warnings' if issues else 'calculated') if lines else 'insufficient_data'), 'year': year, 'direction': direction, 'unit': 'tCO2e', 'baseline_tco2e': float(baseline) if lines else None, 'scenario_tco2e': float(scenario) if lines else None, 'difference_tco2e': float(baseline - scenario) if lines else None, 'input_rows': len(selected_sources), 'included_rows': len(lines), 'excluded_rows': len(selected_sources) - len(lines), 'unassignable_rows': len(unassignable), 'scenario_eligible_rows': sum(r['alternative_factor_source'] is not None for r in lines), 'groups': dict(grouped), 'lines': lines, 'issues': issues, 'assumptions': {'distance_basis': 'recorded distance; no route verification', 'activity_basis': 'recomputed tonnes × kilometres', 'adoption_fraction': float(fraction), 'alternative_factor_id': alternative_factor_id, 'what_if': 'fixed activity, mixed ambient-truck factor; no cost or feasibility model'}, 'limitations': ['Freight legs only, not a full Scope 1–3 inventory.', 'Temperature-controlled trucks retain their original factor: no refrigerated HVO factor is supplied.', 'No origin, destination, port or route geometry is provided; missing legs cannot be reconstructed.', 'Factor values are synthetic; the library version is retained, not a verified applicability date.', 'Sensitivity savings do not establish fuel availability, procurement cost, feedstock sustainability or investment viability.']}


def purchase_coverage(purchases, freight_lines, materials, year):
    nonphysical = {r['values']['material_id'] for r in materials if r['values'].get('material_group') in ('service', 'capex')}
    matched = {r.get('ref_doc') for r in freight_lines if r['direction'] == 'inbound'}
    receipts = {}
    for row in purchases:
        v = row['values']
        if str(v.get('posting_date', ''))[:4] != str(year) or v.get('movement_type') == '122' or v.get('material_id') in nonphysical:
            continue
        try:
            if number(v.get('quantity'), 'receipt quantity') <= 0:
                continue
        except ValueError:
            continue
        if v.get('doc_no'):
            receipts.setdefault(v['doc_no'], row['source'])
    missing = [{'doc_no': doc, 'source': source} for doc, source in receipts.items() if doc not in matched]
    return {'receipt_document_count': len(receipts), 'matched_to_calculated_inbound_legs': len(receipts) - len(missing), 'unmatched_receipt_document_count': len(missing), 'unmatched_receipt_documents': missing[:100], 'examples_truncated': len(missing) > 100, 'confirmed_missing_leg_count': None, 'interpretation': 'Unmatched positive physical-receipt document is a coverage warning, not proof of a missing route leg. Credit notes, services and capex are excluded. Matched documents may still lack additional legs.'}
