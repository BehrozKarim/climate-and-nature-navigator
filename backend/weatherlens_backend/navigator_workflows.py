import hashlib
import json
from uuid import uuid4
from .assistant import answer
from .decisions import Conflict
from .navigator_context import NavigatorContext
from .storage import encode, now


def declared_actor(actor):
    if not isinstance(actor, str) or not actor.strip() or len(actor) > 160:
        raise ValueError('Provide a declared actor name of 1–160 characters')
    return actor.strip()


def page_bounds(limit, offset):
    if not isinstance(limit, int) or not isinstance(offset, int) or not 1 <= limit <= 500 or not 0 <= offset <= 1000000:
        raise ValueError('Use limit 1–500 and offset 0–1,000,000')


class ReviewService:
    def __init__(self, store, dataset_id):
        self.store, self.ds = store, dataset_id
        store.dataset(dataset_id)

    def _identity(self, kind, target):
        return 'review_' + hashlib.sha256(encode([self.ds, kind, target]).encode()).hexdigest()[:32]

    def _insert(self, db, item):
        item = item | {'id': self._identity(item['target_type'], item['target_id']), 'dataset_id': self.ds, 'version': 1, 'identity_assurance': 'declared_unverified', 'review_scope': 'prototype_workflow_only', 'updated_at': now()}
        inserted = db.execute('INSERT OR IGNORE INTO navigator_reviews VALUES (?,?,?,?,?,?,?,?)', (item['id'], self.ds, item['target_type'], item['target_id'], 1, item['status'], encode(item), item['updated_at'])).rowcount
        if inserted:
            db.execute('INSERT INTO navigator_review_events(review_id,version,event,actor,created_at,detail) VALUES (?,?,?,?,?,?)', (item['id'], 1, 'registered', 'Navigator deterministic service', item['updated_at'], encode({'status': item['status'], 'target_type': item['target_type'], 'target_id': item['target_id']})))
        return item['id']

    def _run_item(self, run):
        output = run['output']
        blocked = output.get('status') in ('insufficient_data', 'blocked')
        return {'target_type': 'run', 'target_id': run['id'], 'run_id': run['id'], 'title': f"{run['kind']} calculation", 'owner': 'Sustainability team', 'status': 'blocked' if blocked else 'draft', 'source_status': output.get('status'), 'blocking_reasons': ['Calculation has insufficient or blocked evidence'] if blocked else [], 'lineage': [{'kind': 'calculation', 'run_id': run['id'], 'method_version': output.get('method_version'), 'inputs': run['inputs']}], 'assumptions': output.get('limitations', []), 'review': None}

    def save_run(self, kind, inputs, output):
        run = self.store.save_run(self.ds, kind, inputs, output, on_saved=lambda db, item: self._insert(db, self._run_item(item)))
        return run | {'review_item_id': self._identity('run', run['id'])}

    def register_run(self, run_id):
        run = self.store.run(run_id)
        if run['dataset_id'] != self.ds:
            raise ValueError('Review run belongs to another snapshot')
        with self.store.connect() as db:
            self._insert(db, self._run_item(run))
        return self.get(self._identity('run', run_id))

    def prepare(self):
        inventory = NavigatorContext(self.store, self.ds).inventory()
        items = []
        for f in inventory['quality_findings']:
            items.append({'target_type': 'quality_finding', 'target_id': f['id'], 'finding_id': f['id'], 'title': f['message'], 'owner': 'Sustainability team', 'status': 'blocked' if f['blocking'] else 'draft', 'source_status': 'preliminary', 'blocking_reasons': [f['message']] if f['blocking'] else [], 'lineage': [{'kind': 'source_row', 'source': s} for s in f['source_refs']], 'assumptions': ['Analyst dispositions do not correct raw source records.'], 'review': None})
        if inventory['history']:
            published = max(inventory['history'], key=lambda r: r['year'])
            items.append({'target_type': 'published_inventory', 'target_id': str(published['year']), 'title': f"Published inventory {published['year']}", 'owner': 'Sustainability team', 'status': 'published_source_context', 'source_status': 'published', 'blocking_reasons': [], 'lineage': [{'kind': 'source_row', 'source': published['source']}], 'assumptions': ['Published source context is distinct from local expert approval.'], 'review': None})
        for row in inventory['structural_events'][:100]:
            v = row['values']
            if v.get('type') not in ('acquisition', 'divestment'):
                continue
            items.append({'target_type': 'structural_event', 'target_id': str(row['source']['row_number']), 'title': str(v.get('event', 'Structural event'))[:300], 'owner': 'Sustainability team', 'status': 'draft', 'source_status': 'source_context_requires_assessment', 'blocking_reasons': [], 'lineage': [{'kind': 'source_row', 'source': row['source']}], 'assumptions': ['Organisational-boundary recalculation is not implemented by registering this item.'], 'review': None})
        with self.store.connect() as db:
            run_ids = [r['id'] for r in db.execute('SELECT id FROM runs WHERE dataset_id=? ORDER BY created_at DESC LIMIT 100', (self.ds,))]
        items.extend(self._run_item(self.store.run(r)) for r in run_ids)
        with self.store.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            for item in items:
                self._insert(db, item)
        return {'dataset_id': self.ds, 'review_queue': self.list(), 'existing_run_registration_limit': 100, 'notifications_sent': False}

    def get(self, review_id):
        with self.store.connect() as db:
            row = db.execute('SELECT payload FROM navigator_reviews WHERE id=? AND dataset_id=?', (review_id, self.ds)).fetchone()
        if row is None:
            raise KeyError('Review item not found in this snapshot')
        return json.loads(row['payload'])

    def list(self, status='all', limit=50, offset=0):
        page_bounds(limit, offset)
        filters = {'all': '1', 'waiting': "status IN ('draft','changes_requested')", 'blocked': "json_array_length(json_extract(payload,'$.blocking_reasons'))>0", 'approved': "status IN ('approved_for_demo','published_source_context')", 'draft': "status='draft'", 'changes_requested': "status='changes_requested'"}
        if status not in filters:
            raise ValueError('Unknown review filter')
        where = 'dataset_id=? AND ' + filters[status]
        with self.store.connect() as db:
            total = db.execute('SELECT count(*) FROM navigator_reviews WHERE ' + where, (self.ds,)).fetchone()[0]
            rows = db.execute('SELECT payload FROM navigator_reviews WHERE ' + where + ' ORDER BY updated_at DESC,id LIMIT ? OFFSET ?', (self.ds, limit, offset)).fetchall()
            counts = {r['status']: r['n'] for r in db.execute('SELECT status,count(*) n FROM navigator_reviews WHERE dataset_id=? GROUP BY status', (self.ds,))}
        return {'dataset_id': self.ds, 'items': [json.loads(r['payload']) for r in rows], 'total': total, 'limit': limit, 'offset': offset, 'status_counts': counts}

    def act(self, review_id, expected_version, outcome, reviewer, notes):
        actor = declared_actor(reviewer)
        if outcome not in ('approve', 'request_changes') or not isinstance(notes, str) or not 1 <= len(notes.strip()) <= 4000:
            raise ValueError('Review needs an outcome and a note of 1–4,000 characters')
        with self.store.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT payload FROM navigator_reviews WHERE id=? AND dataset_id=?', (review_id, self.ds)).fetchone()
            if row is None:
                raise KeyError('Review item not found')
            item = json.loads(row['payload'])
            if item['version'] != expected_version:
                raise Conflict('Review item changed; reload before retrying')
            if outcome == 'approve' and item['blocking_reasons']:
                raise Conflict('Numerical or coverage blockers require corrected source data and a new assessment')
            if outcome == 'approve' and item['target_type'] == 'published_inventory':
                raise Conflict('Published source context is informational, not a local approval request')
            prior = item['status']
            item.update(version=expected_version + 1, status='approved_for_demo' if outcome == 'approve' else 'changes_requested', updated_at=now(), review={'reviewer': actor, 'notes': notes.strip(), 'outcome': outcome, 'reviewed_version': expected_version, 'identity_assurance': 'declared_unverified'})
            db.execute('UPDATE navigator_reviews SET version=?,status=?,payload=?,updated_at=? WHERE id=?', (item['version'], item['status'], encode(item), item['updated_at'], review_id))
            db.execute('INSERT INTO navigator_review_events(review_id,version,event,actor,created_at,detail) VALUES (?,?,?,?,?,?)', (review_id, item['version'], 'reviewed', actor, item['updated_at'], encode({'prior_status': prior, 'status': item['status'], 'review': item['review'], 'notification_sent': False})))
        return item

    def audit(self, review_id, limit=100, offset=0):
        self.get(review_id)
        page_bounds(limit, offset)
        with self.store.connect() as db:
            total = db.execute('SELECT count(*) FROM navigator_review_events WHERE review_id=?', (review_id,)).fetchone()[0]
            rows = db.execute('SELECT * FROM navigator_review_events WHERE review_id=? ORDER BY id LIMIT ? OFFSET ?', (review_id, limit, offset)).fetchall()
        return {'total': total, 'limit': limit, 'offset': offset, 'events': [dict(r) | {'detail': json.loads(r['detail']), 'identity_assurance': 'declared_unverified'} for r in rows]}

    def events(self, limit=100, offset=0):
        page_bounds(limit, offset)
        with self.store.connect() as db:
            rows = db.execute("SELECT e.id,e.review_id AS item_id,e.version,e.event,e.actor,e.created_at,e.detail,'review' AS kind FROM navigator_review_events e JOIN navigator_reviews r ON r.id=e.review_id WHERE r.dataset_id=? UNION ALL SELECT id,finding_id AS item_id,version,'finding_disposition',actor,created_at,detail,'quality' FROM navigator_quality_events WHERE dataset_id=? ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?", (self.ds, self.ds, limit, offset)).fetchall()
        return {'limit': limit, 'offset': offset, 'events': [dict(r) | {'detail': json.loads(r['detail']), 'identity_assurance': 'declared_unverified'} for r in rows]}

    def findings(self):
        findings = NavigatorContext(self.store, self.ds).quality_findings()
        with self.store.connect() as db:
            dispositions = {r['finding_id']: json.loads(r['payload']) for r in db.execute('SELECT finding_id,payload FROM navigator_quality WHERE dataset_id=?', (self.ds,))}
        return [f | dispositions.get(f['id'], {}) for f in findings]

    def resolve_finding(self, finding_id, expected_version, outcome, actor, note):
        actor = declared_actor(actor)
        if outcome not in ('confirm', 'dismiss') or not isinstance(note, str) or not 1 <= len(note.strip()) <= 4000:
            raise ValueError('Finding disposition needs confirm/dismiss and a note')
        current = next((f for f in NavigatorContext(self.store, self.ds).quality_findings() if f['id'] == finding_id), None)
        if current is None:
            raise KeyError('Finding not present in this snapshot')
        with self.store.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT version FROM navigator_quality WHERE dataset_id=? AND finding_id=?', (self.ds, finding_id)).fetchone()
            if (row['version'] if row else 0) != expected_version:
                raise Conflict('Finding disposition changed; reload before retrying')
            payload = {'resolution': 'confirmed' if outcome == 'confirm' else 'dismissed', 'version': expected_version + 1, 'actor': actor, 'note': note.strip(), 'updated_at': now(), 'identity_assurance': 'declared_unverified'}
            db.execute('INSERT INTO navigator_quality VALUES (?,?,?,?) ON CONFLICT(dataset_id,finding_id) DO UPDATE SET version=excluded.version,payload=excluded.payload', (self.ds, finding_id, payload['version'], encode(payload)))
            db.execute('INSERT INTO navigator_quality_events(dataset_id,finding_id,version,actor,created_at,detail) VALUES (?,?,?,?,?,?)', (self.ds, finding_id, payload['version'], actor, payload['updated_at'], encode(payload)))
        return current | payload

    def quality_audit(self, finding_id, limit=100, offset=0):
        if not any(f['id'] == finding_id for f in NavigatorContext(self.store, self.ds).quality_findings()):
            raise KeyError('Finding not present')
        page_bounds(limit, offset)
        with self.store.connect() as db:
            rows = db.execute('SELECT * FROM navigator_quality_events WHERE dataset_id=? AND finding_id=? ORDER BY id LIMIT ? OFFSET ?', (self.ds, finding_id, limit, offset)).fetchall()
        return {'limit': limit, 'offset': offset, 'events': [dict(r) | {'detail': json.loads(r['detail'])} for r in rows]}

    def export(self, review_id):
        item = self.get(review_id)
        audit = self.audit(review_id, 500)
        run = self.store.run(item['run_id']) if item.get('run_id') else None
        return {'review_item': item, 'run': run, 'audit': audit, 'audit_truncated': audit['total'] > 500, 'limitations': ['Declared reviewer identity and prototype approval only; no investment or production authority.']}


class ConversationService:
    def __init__(self, store, settings=None):
        self.store, self.settings = store, settings

    def create(self, dataset_id, title='Navigator conversation'):
        self.store.dataset(dataset_id)
        if not isinstance(title, str) or not 1 <= len(title.strip()) <= 160:
            raise ValueError('Conversation title must have 1–160 characters')
        cid, stamp = 'conversation_' + uuid4().hex, now()
        with self.store.connect() as db:
            db.execute('INSERT INTO navigator_conversations VALUES (?,?,?,?,?,?)', (cid, dataset_id, title.strip(), 1, stamp, stamp))
        return self.get(cid)

    def get(self, conversation_id, limit=100, offset=0):
        page_bounds(limit, offset)
        with self.store.connect() as db:
            row = db.execute('SELECT * FROM navigator_conversations WHERE id=?', (conversation_id,)).fetchone()
            if row is None:
                raise KeyError('Conversation not found')
            messages = db.execute('SELECT role,created_at,payload FROM navigator_messages WHERE conversation_id=? ORDER BY id LIMIT ? OFFSET ?', (conversation_id, limit, offset)).fetchall()
            total = db.execute('SELECT count(*) FROM navigator_messages WHERE conversation_id=?', (conversation_id,)).fetchone()[0]
        return dict(row) | {'message_count': total, 'limit': limit, 'offset': offset, 'messages': [json.loads(m['payload']) | {'role': m['role'], 'created_at': m['created_at']} for m in messages]}

    def ask(self, conversation_id, expected_version, question, run_id=None):
        thread = self.get(conversation_id, 1)
        if thread['version'] != expected_version:
            raise Conflict('Conversation changed; reload before appending')
        if not isinstance(question, str) or not 1 <= len(question.strip()) <= 2000:
            raise ValueError('Question must have 1–2,000 characters')
        response = answer(self.store, thread['dataset_id'], question.strip(), run_id, self.settings)
        stamp = now()
        with self.store.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            current = db.execute('SELECT version FROM navigator_conversations WHERE id=?', (conversation_id,)).fetchone()
            if current['version'] != expected_version:
                raise Conflict('Conversation changed while preparing the answer; reload before retrying')
            version = expected_version + 1
            db.execute('INSERT INTO navigator_messages(conversation_id,turn,role,created_at,payload) VALUES (?,?,?,?,?)', (conversation_id, version, 'user', stamp, encode({'text': question.strip()})))
            db.execute('INSERT INTO navigator_messages(conversation_id,turn,role,created_at,payload) VALUES (?,?,?,?,?)', (conversation_id, version, 'assistant', stamp, encode(response | {'text': response['answer']})))
            db.execute('UPDATE navigator_conversations SET version=?,updated_at=? WHERE id=?', (version, stamp, conversation_id))
        return self.get(conversation_id, offset=max(0, thread['message_count'] + 2 - 100))
