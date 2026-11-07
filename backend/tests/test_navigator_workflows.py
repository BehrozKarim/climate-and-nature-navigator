from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch
from tests.navigator_fixture import NavigatorCase
from weatherlens_backend.storage import Store
from weatherlens_backend.decisions import Conflict
from weatherlens_backend.datasets import import_dataset
from weatherlens_backend.navigator_context import NavigatorContext
from weatherlens_backend.navigator_workflows import ReviewService, ConversationService
from weatherlens_backend.storage import encode, now


class WorkflowTests(NavigatorCase):
    def service(self):
        return ReviewService(self.store, self.ds)

    def test_quality_disposition_keeps_raw_blocker_and_survives_restart(self):
        service = self.service()
        f = NavigatorContext(self.store, self.ds).quality_findings()[0]
        before = self.store.source(self.ds, f['source_refs'][0]['table'], f['source_refs'][0]['row_number'])
        result = service.resolve_finding(f['id'], 0, 'dismiss', 'Analyst', 'Needs source investigation')
        self.assertEqual(result['version'], 1)
        self.assertEqual(result['resolution'], 'dismissed')
        self.assertTrue(result['blocking'])
        self.assertEqual(NavigatorContext(self.store, self.ds).inventory(2025)['selected']['status'], 'blocked')
        with self.assertRaises(Conflict):
            service.resolve_finding(f['id'], 0, 'confirm', 'Other', 'Stale judgment')
        reopened = ReviewService(Store(self.store.path), self.ds)
        self.assertEqual(reopened.findings()[0]['resolution'], 'dismissed')
        self.assertEqual(self.store.source(self.ds, f['source_refs'][0]['table'], f['source_refs'][0]['row_number']), before)
        self.assertEqual(len(reopened.quality_audit(f['id'])['events']), 1)

    def test_preparation_is_idempotent_and_blocked_source_cannot_be_approved(self):
        service = self.service()
        service.prepare()
        before = service.list()['total']
        blocked = next(r for r in service.list()['items'] if r['status'] == 'blocked')
        with self.assertRaises(Conflict):
            service.act(blocked['id'], 1, 'approve', 'Reviewer', 'Still invalid values')
        updated = service.act(blocked['id'], 1, 'request_changes', 'Reviewer', 'Correct the source records')
        service.prepare()
        self.assertEqual(service.list()['total'], before)
        self.assertEqual(service.get(updated['id'])['version'], 2)
        self.assertEqual(service.get(updated['id'])['source_status'], 'preliminary')

    def test_run_and_review_registration_commit_together(self):
        service = self.service()
        with patch.object(service, '_insert', side_effect=ValueError('Registration failure')):
            with self.assertRaises(ValueError):
                service.save_run('freight', {}, {'status': 'calculated', 'method_version': 'fixture'})
        with self.store.connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM runs').fetchone()[0], 0)
        run = service.save_run('freight', {}, {'status': 'calculated', 'method_version': 'fixture'})
        self.assertEqual(service.get(run['review_item_id'])['run_id'], run['id'])

    def test_concurrent_review_rejects_one_stale_write_and_preserves_audit(self):
        service = self.service()
        run = service.save_run('freight', {}, {'status': 'calculated'})
        def act(actor):
            try:
                return service.act(run['review_item_id'], 1, 'approve', actor, 'Demo review only')['version']
            except Conflict:
                return 'conflict'
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(act, ['A', 'B']))
        self.assertCountEqual(results, [2, 'conflict'])
        self.assertEqual(len(service.audit(run['review_item_id'])['events']), 2)
        second = service.save_run('freight', {}, {'status': 'calculated'})
        self.assertEqual(service.get(second['review_item_id'])['status'], 'draft')

    def test_conversation_retains_extractive_citations_and_rejects_stale_append(self):
        service = ConversationService(self.store)
        thread = service.create(self.ds, 'Freight questions')
        result = service.ask(thread['id'], 1, 'Freight evidence')
        self.assertEqual(result['version'], 2)
        self.assertEqual(result['messages'][-1]['generation_mode'], 'extractive_not_ai')
        self.assertTrue(result['messages'][-1]['citations'])
        with self.assertRaises(Conflict):
            service.ask(thread['id'], 1, 'Stale follow-up')
        reopened = ConversationService(Store(self.store.path)).get(thread['id'])
        self.assertEqual(reopened['message_count'], 2)

    def test_conversation_cannot_use_another_snapshot_run(self):
        service = ConversationService(self.store)
        thread = service.create(self.ds, 'Snapshot test')
        path = self.root / 'data/07_frameworks/framework_digest.md'
        path.write_text('Changed source evidence', encoding='utf-8')
        other = import_dataset(self.store, self.root, self.root / 'docs')['dataset_id']
        run = self.store.save_run(other, 'test', {}, {})
        with self.assertRaises(ValueError):
            service.ask(thread['id'], 1, 'Freight evidence', run['id'])
        self.assertEqual(service.get(thread['id'])['message_count'], 0)

    def test_long_conversation_append_returns_the_newest_messages(self):
        service = ConversationService(self.store)
        thread = service.create(self.ds, 'Long thread')
        with self.store.connect() as db:
            db.execute('UPDATE navigator_conversations SET version=51 WHERE id=?', (thread['id'],))
            for turn in range(2, 52):
                for role in ('user', 'assistant'):
                    db.execute('INSERT INTO navigator_messages(conversation_id,turn,role,created_at,payload) VALUES (?,?,?,?,?)', (thread['id'], turn, role, now(), encode({'text': 'Earlier message'})))
        result = service.ask(thread['id'], 51, 'Freight evidence')
        self.assertEqual(result['message_count'], 102)
        self.assertEqual(result['offset'], 2)
        self.assertEqual(result['messages'][-2]['text'], 'Freight evidence')
        self.assertTrue(result['messages'][-1]['citations'])
