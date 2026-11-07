import json
from uuid import uuid4
from .analytics import Analytics
from .storage import encode, now


class Conflict(Exception):
    pass


FIELDS = {'decision_type', 'objective', 'decision_request', 'action_ids', 'rationale', 'owner', 'alternatives', 'open_questions', 'source_refs', 'run_ids'}
DEFAULTS = {'decision_type': 'investigate', 'objective': '', 'decision_request': '', 'action_ids': [], 'rationale': '', 'owner': '', 'alternatives': [], 'open_questions': [], 'source_refs': [], 'run_ids': []}


class DecisionService:
    def __init__(self, store):
        self.store = store

    def validate_refs(self, payload):
        ds = payload['dataset_id']
        actions = {a['lever_id'] for a in Analytics(self.store, ds).actions()['actions']}
        selected = payload.get('action_ids', [])
        if len(set(selected)) != len(selected) or any(a not in actions for a in selected):
            raise ValueError('Selected actions must be distinct and belong to this snapshot')
        if payload.get('decision_type') not in ('investigate', 'pilot', 'investment'):
            raise ValueError('Unknown decision type')
        for item in payload.get('alternatives', []):
            if item.get('action_id') and (item['action_id'] not in actions or item['action_id'] in selected):
                raise ValueError('Alternative must exist in this snapshot and differ from selected actions')
        for source in payload.get('source_refs', []):
            self.store.source(ds, source['table'], source['row_number'])
        for run_id in payload.get('run_ids', []):
            if self.store.run(run_id)['dataset_id'] != ds:
                raise ValueError('Calculation run belongs to a different dataset snapshot')

    def create(self, payload, actor):
        if set(payload) - (FIELDS | {'dataset_id'}):
            raise ValueError('Unknown decision field')
        body = DEFAULTS | payload
        self.validate_refs(body)
        body.update(id='decision_' + uuid4().hex, version=1, status='draft', evidence_acknowledged=False, updated_at=now(), identity_assurance='declared_unverified', review_scope='prototype_workflow_only')
        with self.store.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            db.execute('INSERT INTO decisions VALUES (?,?,?,?,?,?)', (body['id'], body['dataset_id'], 1, 'draft', encode(body), body['updated_at']))
            self._record(db, body, 'created', actor, {})
        return body

    def get(self, decision_id, version=None):
        with self.store.connect() as db:
            row = db.execute('SELECT payload FROM decisions WHERE id=?', (decision_id,)).fetchone() if version is None else db.execute('SELECT payload FROM decision_revisions WHERE decision_id=? AND version=?', (decision_id, version)).fetchone()
        if row is None:
            raise KeyError('Decision or revision not found')
        return json.loads(row['payload'])

    def list(self, limit=50, offset=0):
        with self.store.connect() as db:
            return [json.loads(r['payload']) for r in db.execute('SELECT payload FROM decisions ORDER BY updated_at DESC LIMIT ? OFFSET ?', (limit, offset))]

    def _record(self, db, body, event, actor, detail):
        if not isinstance(actor, str) or not actor.strip():
            raise ValueError('A declared actor name is required')
        db.execute('INSERT INTO decision_revisions VALUES (?,?,?)', (body['id'], body['version'], encode(body)))
        db.execute('INSERT INTO audit(decision_id,version,event,actor,created_at,detail) VALUES (?,?,?,?,?,?)', (body['id'], body['version'], event, actor, body['updated_at'], encode(detail)))

    def _change(self, decision_id, expected_version, actor, event, transform):
        with self.store.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            current = db.execute('SELECT payload FROM decisions WHERE id=?', (decision_id,)).fetchone()
            if current is None:
                raise KeyError('Decision not found')
            body = json.loads(current['payload'])
            if body['version'] != expected_version:
                raise Conflict('Decision changed; reload its current version before retrying')
            detail = transform(body)
            body['version'] += 1
            body['updated_at'] = now()
            db.execute('UPDATE decisions SET version=?,status=?,payload=?,updated_at=? WHERE id=? AND version=?', (body['version'], body['status'], encode(body), body['updated_at'], decision_id, expected_version))
            self._record(db, body, event, actor, detail)
            return body

    def update(self, decision_id, expected_version, patch, actor):
        if not patch or set(patch) - FIELDS:
            raise ValueError('Update must contain editable fields only; dataset identity is immutable')
        def change(body):
            body.update(patch)
            self.validate_refs(body)
            body.update(status='draft', evidence_acknowledged=False)
            body.pop('review', None)
            return {'changed_fields': sorted(patch), 'prior_review_invalidated': True}
        return self._change(decision_id, expected_version, actor, 'edited', change)

    def submit(self, decision_id, expected_version, actor, acknowledged):
        def change(body):
            if body['status'] not in ('draft', 'changes_requested'):
                raise Conflict('Only draft or changes-requested decisions may be submitted')
            required = ('objective', 'decision_request', 'rationale', 'owner')
            if not acknowledged or any(not body.get(k, '').strip() for k in required) or not body['action_ids']:
                raise ValueError('Submission needs an objective, explicit request, rationale, owner, selected actions and evidence acknowledgement')
            if not body['source_refs'] and not body['run_ids']:
                raise ValueError('Submission needs at least one resolved source or calculation run')
            if not body['alternatives'] or any(not a.get('description', '').strip() or not a.get('reason', '').strip() for a in body['alternatives']):
                raise ValueError('Record at least one alternative and why it was deferred')
            self.validate_refs(body)
            body.update(status='submitted', evidence_acknowledged=True)
            body.pop('review', None)
            return {'acknowledgement': 'User assertion of evidence inspection; not independently verified'}
        return self._change(decision_id, expected_version, actor, 'submitted', change)

    def review(self, decision_id, expected_version, reviewer, outcome, notes):
        if outcome not in ('approve', 'request_changes') or not notes.strip():
            raise ValueError('Review needs an outcome and notes')
        def change(body):
            if body['status'] != 'submitted':
                raise Conflict('Review requires the current submitted revision')
            if outcome == 'approve' and body['decision_type'] == 'investment':
                raise ValueError('Investment approval requires a validated local business case; catalogue estimates and freight sensitivities do not establish one')
            body['status'] = 'approved_for_demo' if outcome == 'approve' else 'changes_requested'
            body['review'] = {'reviewer': reviewer, 'outcome': outcome, 'notes': notes, 'reviewed_version': expected_version, 'identity_assurance': 'declared_unverified', 'approval_scope': 'prototype_workflow_only'}
            return body['review']
        return self._change(decision_id, expected_version, reviewer, 'reviewed', change)

    def audit(self, decision_id):
        self.get(decision_id)
        with self.store.connect() as db:
            return [dict(r) | {'detail': json.loads(r['detail'])} for r in db.execute('SELECT * FROM audit WHERE decision_id=? ORDER BY id', (decision_id,))]

    def export(self, decision_id, version=None):
        body = self.get(decision_id, version)
        summaries = []
        for run_id in body['run_ids']:
            run = self.store.run(run_id)
            summaries.append(run | {'output': {k: v for k, v in run['output'].items() if k not in ('lines', 'issues')}})
        return {'decision': body, 'source_rows': [self.store.source(body['dataset_id'], s['table'], s['row_number']) for s in body['source_refs']], 'run_summaries': summaries, 'audit': [a for a in self.audit(decision_id) if a['version'] <= body['version']], 'limitations': ['Reviewers are declared identities, not authenticated accredited experts.', 'Prototype workflow approval is not production authorization or validation of business impacts.', 'Catalogue values and source limitations remain attached to their original dataset version.']}
