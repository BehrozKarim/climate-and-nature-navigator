import tempfile
import unittest
from pathlib import Path

from tests.helpers import fixture, write_csv
from weatherlens_backend.datasets import import_dataset
from weatherlens_backend.storage import Store
from weatherlens_backend.assistant import retrieve


class DatasetTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.data = self.root / 'package'
        self.docs = self.root / 'documents'
        self.docs.mkdir()
        (self.docs / 'brief.md').write_text('Freight calculations need source evidence.', encoding='utf-8')
        fixture(self.data)
        self.store = Store(self.root / 'test.sqlite3')

    def test_idempotent_import_preserves_original_rows(self):
        first = import_dataset(self.store, self.data, self.docs)
        second = import_dataset(self.store, self.data, self.docs)
        self.assertEqual(first['dataset_id'], second['dataset_id'])
        rows = self.store.rows(first['dataset_id'], 'shipments', year=2025)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['source']['row_number'], 2)
        self.assertEqual(rows[0]['source']['record_id'], 'SH1')
        self.assertEqual(len(rows[0]['source']['file_sha256']), 64)
        self.assertEqual(len(self.store.datasets()), 1)

    def test_changed_source_creates_new_version_and_old_snapshot_survives(self):
        old = import_dataset(self.store, self.data, self.docs)['dataset_id']
        path = self.data / 'data/02_raw_feeds/shipments.csv'
        path.write_text(path.read_text().replace(',10,100,1000', ',20,100,2000'))
        new = import_dataset(self.store, self.data, self.docs)['dataset_id']
        self.assertNotEqual(old, new)
        reopened = Store(self.root / 'test.sqlite3')
        self.assertEqual(reopened.rows(old, 'shipments')[0]['values']['t'], '10')
        self.assertEqual(reopened.rows(new, 'shipments')[0]['values']['t'], '20')

    def test_missing_required_table_and_unknown_snapshot_are_errors(self):
        with self.assertRaises(ValueError):
            import_dataset(self.store, self.root / 'missing', self.docs)
        with self.assertRaises(KeyError):
            self.store.rows('unknown', 'shipments')

    def test_document_snapshot_is_immutable_and_unverified_transcript_labelled(self):
        transcript = self.docs / 'transcript_unverified.txt'
        transcript.write_text('Unverified briefing text.', encoding='utf-8')
        ds = import_dataset(self.store, self.data, self.docs)['dataset_id']
        transcript.write_text('Changed.', encoding='utf-8')
        docs = self.store.documents(ds)
        doc = next(d for d in docs if d['path'].endswith(transcript.name))
        self.assertEqual(doc['text'], 'Unverified briefing text.')
        self.assertTrue(doc['unverified'])

    def test_framework_digest_is_searchable_without_rewriting_old_snapshot(self):
        old = import_dataset(self.store, self.data, self.docs)['dataset_id']
        framework = self.data / 'data/07_frameworks/framework_digest.md'
        framework.parent.mkdir(parents=True)
        framework.write_text('Groundwater pressure requires catchment evidence.', encoding='utf-8')
        imported = import_dataset(self.store, self.data, self.docs)
        self.assertNotEqual(imported['dataset_id'], old)
        matches = retrieve(self.store, imported['dataset_id'], 'groundwater')
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]['path'], 'package/data/07_frameworks/framework_digest.md')
        self.assertIn('Groundwater pressure', matches[0]['excerpt'])
        self.assertEqual(len(matches[0]['file_sha256']), 64)
        self.assertEqual(retrieve(self.store, old, 'groundwater'), [])
        self.assertEqual(self.store.rows(old, 'shipments')[0]['values']['t'], '10')

    def test_swedish_semicolon_feed_preserves_decimal_commas_and_year(self):
        path = self.data / 'data/03_farming/foodhills_odlingsdata_se.csv'
        path.parent.mkdir(parents=True)
        path.write_text('odlar_id;skördeår;gröda;areal_ha\nS0381;2025;Ärt (frysärt);7,31\n', encoding='utf-8')
        ds = import_dataset(self.store, self.data, self.docs)['dataset_id']
        rows = self.store.rows(ds, 'foodhills_odlingsdata_se', year=2025)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['values']['areal_ha'], '7,31')
        self.assertEqual(rows[0]['source']['record_id'], 'S0381:2025:Ärt (frysärt)')


if __name__ == '__main__':
    unittest.main()
