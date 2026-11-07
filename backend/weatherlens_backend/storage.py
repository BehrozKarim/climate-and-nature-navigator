from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
import json
import sqlite3
from uuid import uuid4


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def encode(value) -> str:
    return json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(',', ':'))


SCHEMA = '''
CREATE TABLE IF NOT EXISTS datasets(id TEXT PRIMARY KEY, created_at TEXT NOT NULL, manifest TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sources(dataset_id TEXT NOT NULL REFERENCES datasets(id), table_name TEXT NOT NULL, path TEXT NOT NULL, sha256 TEXT NOT NULL, columns_json TEXT NOT NULL, row_count INTEGER NOT NULL, PRIMARY KEY(dataset_id,table_name));
CREATE TABLE IF NOT EXISTS records(dataset_id TEXT NOT NULL, table_name TEXT NOT NULL, row_number INTEGER NOT NULL, record_id TEXT NOT NULL, year INTEGER, payload TEXT NOT NULL, PRIMARY KEY(dataset_id,table_name,row_number), FOREIGN KEY(dataset_id,table_name) REFERENCES sources(dataset_id,table_name));
CREATE INDEX IF NOT EXISTS records_year ON records(dataset_id,table_name,year);
CREATE TABLE IF NOT EXISTS documents(dataset_id TEXT NOT NULL REFERENCES datasets(id), doc_id TEXT NOT NULL, path TEXT NOT NULL, sha256 TEXT NOT NULL, unverified INTEGER NOT NULL, content TEXT NOT NULL, PRIMARY KEY(dataset_id,doc_id));
CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, dataset_id TEXT NOT NULL REFERENCES datasets(id), kind TEXT NOT NULL, created_at TEXT NOT NULL, inputs TEXT NOT NULL, output TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS decisions(id TEXT PRIMARY KEY, dataset_id TEXT NOT NULL REFERENCES datasets(id), version INTEGER NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS decision_revisions(decision_id TEXT NOT NULL REFERENCES decisions(id), version INTEGER NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(decision_id,version));
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT, decision_id TEXT NOT NULL REFERENCES decisions(id), version INTEGER NOT NULL, event TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL, detail TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS navigator_reviews(id TEXT PRIMARY KEY, dataset_id TEXT NOT NULL REFERENCES datasets(id), target_type TEXT NOT NULL, target_id TEXT NOT NULL, version INTEGER NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(dataset_id,target_type,target_id));
CREATE TABLE IF NOT EXISTS navigator_review_events(id INTEGER PRIMARY KEY AUTOINCREMENT, review_id TEXT NOT NULL REFERENCES navigator_reviews(id), version INTEGER NOT NULL, event TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL, detail TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS navigator_quality(dataset_id TEXT NOT NULL REFERENCES datasets(id), finding_id TEXT NOT NULL, version INTEGER NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(dataset_id,finding_id));
CREATE TABLE IF NOT EXISTS navigator_quality_events(id INTEGER PRIMARY KEY AUTOINCREMENT, dataset_id TEXT NOT NULL, finding_id TEXT NOT NULL, version INTEGER NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL, detail TEXT NOT NULL, FOREIGN KEY(dataset_id,finding_id) REFERENCES navigator_quality(dataset_id,finding_id));
CREATE TABLE IF NOT EXISTS navigator_conversations(id TEXT PRIMARY KEY, dataset_id TEXT NOT NULL REFERENCES datasets(id), title TEXT NOT NULL, version INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS navigator_messages(id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT NOT NULL REFERENCES navigator_conversations(id), turn INTEGER NOT NULL, role TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(conversation_id,turn,role));
CREATE INDEX IF NOT EXISTS navigator_reviews_dataset ON navigator_reviews(dataset_id,status,updated_at);
CREATE INDEX IF NOT EXISTS navigator_messages_conversation ON navigator_messages(conversation_id,id);
'''


class Store:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute('PRAGMA journal_mode=WAL')
            db.executescript(SCHEMA)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(str(self.path), timeout=30)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA foreign_keys=ON')
        try:
            yield db
            db.commit()
        except BaseException:
            db.rollback()
            raise
        finally:
            db.close()

    def dataset(self, dataset_id):
        with self.connect() as db:
            item = db.execute('SELECT manifest FROM datasets WHERE id=?', (dataset_id,)).fetchone()
        if not item:
            raise KeyError('Dataset not found')
        return json.loads(item['manifest'])

    def datasets(self):
        with self.connect() as db:
            return [json.loads(r['manifest']) for r in db.execute('SELECT manifest FROM datasets ORDER BY created_at DESC')]

    def sources(self, dataset_id):
        self.dataset(dataset_id)
        with self.connect() as db:
            return [dict(r) | {'columns': json.loads(r['columns_json'])} for r in db.execute('SELECT * FROM sources WHERE dataset_id=? ORDER BY table_name', (dataset_id,))]

    def rows(self, dataset_id, table, year=None, limit=None, offset=0):
        self.dataset(dataset_id)
        with self.connect() as db:
            source = db.execute('SELECT * FROM sources WHERE dataset_id=? AND table_name=?', (dataset_id, table)).fetchone()
            if source is None:
                return []
            query = 'SELECT * FROM records WHERE dataset_id=? AND table_name=?'
            params = [dataset_id, table]
            if year is not None:
                query += ' AND year=?'
                params.append(year)
            query += ' ORDER BY row_number'
            if limit is not None:
                query += ' LIMIT ? OFFSET ?'
                params.extend([limit, offset])
            return [{'values': json.loads(r['payload']), 'source': {'dataset_id': dataset_id, 'table': table, 'row_number': r['row_number'], 'record_id': r['record_id'], 'file': source['path'], 'file_sha256': source['sha256']}} for r in db.execute(query, params)]

    def count(self, dataset_id, table, year=None):
        self.dataset(dataset_id)
        query = 'SELECT count(*) FROM records WHERE dataset_id=? AND table_name=?'
        params = [dataset_id, table]
        if year is not None:
            query += ' AND year=?'
            params.append(year)
        with self.connect() as db:
            return db.execute(query, params).fetchone()[0]

    def documents(self, dataset_id):
        self.dataset(dataset_id)
        with self.connect() as db:
            return [dict(r) | {'text': r['content'], 'unverified': bool(r['unverified'])} for r in db.execute('SELECT * FROM documents WHERE dataset_id=? ORDER BY path', (dataset_id,))]

    def source(self, dataset_id, table, row_number):
        self.dataset(dataset_id)
        with self.connect() as db:
            row = db.execute('SELECT payload,record_id FROM records WHERE dataset_id=? AND table_name=? AND row_number=?', (dataset_id, table, row_number)).fetchone()
            file = db.execute('SELECT path,sha256 FROM sources WHERE dataset_id=? AND table_name=?', (dataset_id, table)).fetchone()
        if row is None or file is None:
            raise KeyError('Source row not found')
        return {'values': json.loads(row['payload']), 'source': {'dataset_id': dataset_id, 'table': table, 'row_number': row_number, 'record_id': row['record_id'], 'file': file['path'], 'file_sha256': file['sha256']}}

    def save_run(self, dataset_id, kind, inputs, output, on_saved=None):
        self.dataset(dataset_id)
        run_id = 'run_' + uuid4().hex
        created = now()
        with self.connect() as db:
            db.execute('INSERT INTO runs VALUES (?,?,?,?,?,?)', (run_id, dataset_id, kind, created, encode(inputs), encode(output)))
            if on_saved is not None:
                on_saved(db, {'id': run_id, 'dataset_id': dataset_id, 'kind': kind, 'created_at': created, 'inputs': inputs, 'output': output})
        return self.run(run_id)

    def run(self, run_id):
        with self.connect() as db:
            row = db.execute('SELECT * FROM runs WHERE id=?', (run_id,)).fetchone()
        if row is None:
            raise KeyError('Calculation run not found')
        return dict(row) | {'inputs': json.loads(row['inputs']), 'output': json.loads(row['output'])}
