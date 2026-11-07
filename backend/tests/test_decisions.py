import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from tests.helpers import fixture
from weatherlens_backend.datasets import import_dataset
from weatherlens_backend.storage import Store
from weatherlens_backend.decisions import DecisionService, Conflict


class DecisionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        fixture(self.root)
        self.store = Store(self.root / 'test.db')
        self.dataset = import_dataset(self.store, self.root, self.root / 'docs')['dataset_id']
        self.service = DecisionService(self.store)
        self.payload = dict(dataset_id=self.dataset, decision_type='investigate', objective='Reduce freight emissions', decision_request='Authorize a fuel feasibility investigation', action_ids=['L20'], rationale='Assess fuel availability and cost before choosing a pilot.', owner='Logistics lead', alternatives=[{'action_id': 'L27', 'description': 'Improve measurement', 'reason': 'Useful for evidence but not itself abatement'}], open_questions=['Can sustainable HVO supply be secured?'], source_refs=[{'table': 'actions', 'row_number': 2}], run_ids=[])

    def test_lifecycle_edit_invalidates_review_and_retains_old_revision(self):
        d = self.service.create(self.payload, 'Analyst')
        d = self.service.submit(d['id'], 1, 'Analyst', True)
        d = self.service.review(d['id'], 2, 'Reviewer', 'approve', 'Proceed with an investigation only.')
        self.assertEqual(d['status'], 'approved_for_demo')
        self.assertEqual(d['identity_assurance'], 'declared_unverified')
        d = self.service.update(d['id'], 3, {'rationale': 'Changed rationale'}, 'Analyst')
        self.assertEqual(d['status'], 'draft')
        self.assertFalse(d['evidence_acknowledged'])
        restored = DecisionService(Store(self.root / 'test.db'))
        self.assertEqual(restored.get(d['id'], version=3)['status'], 'approved_for_demo')
        self.assertEqual(len(restored.audit(d['id'])), 4)

    def test_stale_and_concurrent_edits_rejected(self):
        d = self.service.create(self.payload, 'Analyst')
        def change(owner):
            try:
                self.service.update(d['id'], 1, {'owner': owner}, 'Analyst')
                return 'ok'
            except Conflict:
                return 'conflict'
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(change, ['Owner A', 'Owner B']))
        self.assertEqual(sorted(results), ['conflict', 'ok'])
        with self.assertRaises(Conflict):
            self.service.submit(d['id'], 1, 'Analyst', True)

    def test_incomplete_and_unacknowledged_submissions_fail(self):
        d = self.service.create(self.payload | {'owner': ''}, 'Analyst')
        with self.assertRaises(ValueError):
            self.service.submit(d['id'], 1, 'Analyst', True)
        d = self.service.create(self.payload, 'Analyst')
        with self.assertRaises(ValueError):
            self.service.submit(d['id'], 1, 'Analyst', False)

    def test_sources_and_runs_must_resolve_within_snapshot(self):
        with self.assertRaises(KeyError):
            self.service.create(self.payload | {'source_refs': [{'table': 'actions', 'row_number': 999}]}, 'Analyst')
        (self.root / 'data/02_raw_feeds/shipments.csv').write_text((self.root / 'data/02_raw_feeds/shipments.csv').read_text() + '\n')
        other = import_dataset(self.store, self.root, self.root / 'docs')['dataset_id']
        run = self.store.save_run(other, 'freight', {}, {})
        with self.assertRaises(ValueError):
            self.service.create(self.payload | {'run_ids': [run['id']]}, 'Analyst')

    def test_catalogue_cannot_be_approved_as_investment(self):
        d = self.service.create(self.payload | {'decision_type': 'investment'}, 'Analyst')
        d = self.service.submit(d['id'], 1, 'Analyst', True)
        with self.assertRaises(ValueError):
            self.service.review(d['id'], 2, 'Reviewer', 'approve', 'Approve spend')

    def test_decisions_keep_separate_drafts_and_export_source_rows(self):
        a = self.service.create(self.payload, 'A')
        b = self.service.create(self.payload | {'owner': 'Owner B'}, 'B')
        self.service.update(a['id'], 1, {'owner': 'Owner A'}, 'A')
        self.assertEqual(self.service.get(b['id'])['owner'], 'Owner B')
        self.assertEqual(self.service.export(a['id'])['source_rows'][0]['values']['lever_id'], 'L20')
