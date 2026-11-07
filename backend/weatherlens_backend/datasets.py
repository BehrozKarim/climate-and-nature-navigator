import csv
import hashlib
import io
import json
from pathlib import Path

from .storage import Store, encode, now


IMPORTER_VERSION = 'snapshot-v3'
ALIASES = {'emission_factor_library': 'factors', 'decarbonisation_levers': 'actions', 'weather_monthly_1991_2060': 'climate_monthly', 'parcel_crop_history_and_plan': 'parcel_crops', 'erp_purchase_lines_2021_2025': 'purchases'}
FOLDERS = ('01_master', '02_raw_feeds', '03_farming', '04_climate', '05_scenarios', '06_nature', '07_frameworks')
KEYS = ('shipment_id', 'ef_id', 'lever_id', 'parcel_id', 'farm_id', 'site_id', 'supplier_id', 'cell_id', 'catchment_id', 'doc_no', 'event_id', 'booking_id', 'delivery_id')
PRIMARY_KEYS = {'shipments': ('shipment_id',), 'factors': ('ef_id',), 'actions': ('lever_id',), 'purchases': ('doc_no', 'line_no'), 'parcel_crops': ('parcel_id', 'year'), 'climate_monthly': ('cell_id', 'scenario', 'year', 'month'), 'foodhills_odlingsdata_se': ('odlar_id', 'skördeår', 'gröda')}


def file_hash(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for part in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(part)
    return digest.hexdigest()


def import_dataset(store: Store, dataset_root: Path, document_root: Path) -> dict:
    dataset_root, document_root = Path(dataset_root).resolve(), Path(document_root).resolve()
    required = ('data/02_raw_feeds/shipments.csv', 'data/01_master/emission_factor_library.csv')
    if any(not (dataset_root / name).is_file() for name in required):
        raise ValueError('Configured dataset root must contain shipments and emission_factor_library CSV files')
    files = []
    for folder in FOLDERS:
        for path in sorted((dataset_root / 'data' / folder).glob('*.csv')):
            if path.is_symlink() or not path.resolve().is_relative_to(dataset_root):
                raise ValueError('Dataset symlinks are not supported')
            files.append((path, 'csv', path.relative_to(dataset_root).as_posix()))
    for parent, prefix in [(dataset_root / 'docs', 'package/docs'), (dataset_root / 'data' / '07_frameworks', 'package/data/07_frameworks'), (document_root, 'briefs')]:
        for path in sorted(parent.glob('*')):
            if path.is_file() and path.suffix.lower() in ('.md', '.txt'):
                if path.is_symlink():
                    raise ValueError('Document symlinks are not supported')
                files.append((path, 'document', prefix + '/' + path.name))
    indexed = [(path, kind, name, file_hash(path)) for path, kind, name in files]
    identity = encode({'importer': IMPORTER_VERSION, 'files': [(k, n, h) for _, k, n, h in indexed]})
    dataset_id = 'ds_' + hashlib.sha256(identity.encode()).hexdigest()
    try:
        return store.dataset(dataset_id)
    except KeyError:
        pass
    manifest = {'dataset_id': dataset_id, 'created_at': now(), 'importer_version': IMPORTER_VERSION, 'synthetic': True, 'tables': [], 'documents': [], 'limitations': ['Daily parquet, supplier PCF JSON and original workbook are not imported by this CSV/document snapshot.', 'Snapshot presence does not establish input correctness or a complete GHG inventory.']}
    with store.connect() as db:
        db.execute('BEGIN IMMEDIATE')
        present = db.execute('SELECT manifest FROM datasets WHERE id=?', (dataset_id,)).fetchone()
        if present:
            return json.loads(present[0])
        db.execute('INSERT INTO datasets VALUES (?,?,?)', (dataset_id, manifest['created_at'], encode(manifest)))
        for path, kind, name, digest in indexed:
            if path.stat().st_size > 128 * 1024 * 1024:
                raise ValueError('Source exceeds the 128 MiB per-file import limit')
            content = path.read_bytes()
            if hashlib.sha256(content).hexdigest() != digest:
                raise ValueError('Source changed while importing; retry to create a consistent snapshot')
            text = content.decode('utf-8-sig')
            if kind == 'document':
                doc_id = 'doc_' + hashlib.sha256(name.encode()).hexdigest()[:20]
                unverified = 'unverified' in name.lower() or 'transcript' in name.lower()
                db.execute('INSERT INTO documents VALUES (?,?,?,?,?,?)', (dataset_id, doc_id, name, digest, unverified, text))
                manifest['documents'].append({'doc_id': doc_id, 'path': name, 'sha256': digest, 'unverified': unverified})
                continue
            table = ALIASES.get(path.stem, path.stem)
            delimiter = ';' if table == 'foodhills_odlingsdata_se' else ','
            reader = csv.DictReader(io.StringIO(text, newline=''), delimiter=delimiter)
            if not reader.fieldnames or len(reader.fieldnames) != len(set(reader.fieldnames)):
                raise ValueError(f'Missing or duplicate CSV columns: {name}')
            db.execute('INSERT INTO sources VALUES (?,?,?,?,?,?)', (dataset_id, table, name, digest, encode(reader.fieldnames), 0))
            batch, count = [], 0
            for index, row in enumerate(reader, 2):
                if None in row or any(v is None for v in row.values()):
                    raise ValueError(f'Malformed CSV record: {name}, record {index}')
                if not any(row.values()):
                    continue
                key_fields = PRIMARY_KEYS.get(table, tuple(k for k in KEYS if row.get(k))[:1])
                record_id = ':'.join(row[k] for k in key_fields if row.get(k)) or str(index)
                year_text = row.get('year', row.get('skördeår', row.get('consumption_year', row.get('posting_date', '')[:4])))
                year = int(year_text) if year_text.isdigit() else None
                batch.append((dataset_id, table, index, record_id, year, encode(row)))
                count += 1
                if len(batch) == 2000:
                    db.executemany('INSERT INTO records VALUES (?,?,?,?,?,?)', batch)
                    batch.clear()
            if batch:
                db.executemany('INSERT INTO records VALUES (?,?,?,?,?,?)', batch)
            db.execute('UPDATE sources SET row_count=? WHERE dataset_id=? AND table_name=?', (count, dataset_id, table))
            manifest['tables'].append({'table': table, 'path': name, 'sha256': digest, 'rows': count, 'columns': reader.fieldnames, 'csv_delimiter': delimiter, 'values': 'original strings; decimal commas preserved for Swedish grower data', 'encoding_replacement_characters': text.count('\ufffd')})
        db.execute('UPDATE datasets SET manifest=? WHERE id=?', (encode(manifest), dataset_id))
    return manifest
