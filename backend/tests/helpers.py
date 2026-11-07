import csv
from pathlib import Path


def write_csv(root: Path, relative: str, rows: list[dict]):
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def fixture(root: Path):
    write_csv(root, 'data/01_master/emission_factor_library.csv', [
        dict(ef_id='EF-TKM-TRUCK', name='Truck', unit='tkm', kgco2e_per_unit='0.092', version='2025', reference_source='Test factor', value_status='synthetic'),
        dict(ef_id='EF-TKM-TRUCK-HVO', name='HVO truck', unit='tkm', kgco2e_per_unit='0.020', version='2025', reference_source='Test factor', value_status='synthetic'),
        dict(ef_id='EF-TKM-SHIP-BULK', name='Vessel', unit='tkm', kgco2e_per_unit='0.013', version='2025', reference_source='Test factor', value_status='synthetic'),
    ])
    write_csv(root, 'data/02_raw_feeds/shipments.csv', [dict(shipment_id='SH1', year='2025', direction='inbound', ref_doc='PO1', ef_id='EF-TKM-TRUCK', mode='truck', t='10', km='100', tkm='1000')])
    write_csv(root, 'data/05_scenarios/decarbonisation_levers.csv', [
        dict(lever_id='L20', name='Truck HVO', scope='scope3_cat4_cat9', flag='False', lever_type='logistics', abatement_tco2e_2030_design='3200', capex_eur='0', opex_delta_eur_per_yr='650000', lifetime_yr='1', earliest_start='2027', ramp_years='3', confidence='high', co_benefits='', trade_offs='Feedstock sustainability', indicative_cost_eur_per_tco2e='203', value_status='design estimate'),
        dict(lever_id='L27', name='Improve measurement', scope='measurement', flag='False', lever_type='data', abatement_tco2e_2030_design='0', capex_eur='0', opex_delta_eur_per_yr='80000', lifetime_yr='1', earliest_start='2027', ramp_years='2', confidence='high', co_benefits='Accuracy', trade_offs='Not real abatement', indicative_cost_eur_per_tco2e='', value_status='design estimate'),
    ])


def source_row(values, number=2, table='shipments'):
    return {'values': {k: str(v) for k, v in values.items()}, 'source': {'dataset_id': 'test', 'table': table, 'row_number': number, 'record_id': values.get('shipment_id', values.get('ef_id', str(number))), 'file_sha256': 'test-hash'}}
