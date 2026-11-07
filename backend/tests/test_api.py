import tempfile
import unittest
from pathlib import Path
from fastapi.testclient import TestClient
from tests.helpers import fixture
from weatherlens_backend.app import create_app
from weatherlens_backend.config import Settings


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        fixture(root)
        docs = root / 'briefs'
        docs.mkdir()
        (docs / 'brief.md').write_text('Freight emissions need source evidence.', encoding='utf-8')
        self.settings = Settings(database=root / 'test.db', dataset_root=root, document_root=docs, api_token='test-token')
        self.client = TestClient(create_app(self.settings))
        self.client.__enter__()
        self.addCleanup(self.client.__exit__, None, None, None)
        self.headers = {'Authorization': 'Bearer test-token'}

    def post(self, path, payload):
        return self.client.post('/v1' + path, json=payload, headers=self.headers)

    def test_health_auth_and_documentation(self):
        self.assertEqual(self.client.get('/health').status_code, 200)
        self.assertEqual(self.client.get('/v1/datasets').status_code, 401)
        self.assertEqual(self.client.get('/v1/datasets', headers=self.headers).status_code, 200)
        self.assertEqual(self.client.get('/openapi.json').status_code, 200)

    def test_non_ascii_bearer_is_unauthorized_instead_of_server_error(self):
        with TestClient(create_app(self.settings), raise_server_exceptions=False) as client:
            response = client.get('/v1/datasets', headers=[(b'authorization', b'Bearer \xff')])
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers['www-authenticate'], 'Bearer')

    def test_import_compute_review_export_and_persist(self):
        imported = self.post('/datasets/import', {})
        self.assertEqual(imported.status_code, 200, imported.text)
        ds = imported.json()['dataset_id']
        run = self.post('/freight/runs', {'dataset_id': ds, 'year': 2025, 'alternative_factor_id': 'EF-TKM-TRUCK-HVO', 'adoption': .5})
        self.assertEqual(run.status_code, 201, run.text)
        self.assertAlmostEqual(run.json()['output']['baseline_tco2e'], .092)
        self.assertNotIn('lines', run.json()['output'])
        run_id = run.json()['id']
        lines = self.client.get(f'/v1/runs/{run_id}/lines', headers=self.headers)
        self.assertEqual(lines.json()['total'], 1)
        body = dict(dataset_id=ds, decision_type='investigate', objective='Explore freight fuel options', decision_request='Investigate fuel availability', action_ids=['L20'], rationale='Review supply and price before a pilot', owner='Logistics lead', alternatives=[{'description': 'Keep diesel', 'reason': 'Baseline maintained pending feasibility'}], source_refs=[{'table': 'actions', 'row_number': 2}], run_ids=[run_id])
        draft = self.post('/decisions', body)
        self.assertEqual(draft.status_code, 201, draft.text)
        did = draft.json()['id']
        submitted = self.post(f'/decisions/{did}/submit', {'expected_version': 1, 'evidence_acknowledged': True})
        self.assertEqual(submitted.status_code, 200, submitted.text)
        reviewed = self.post(f'/decisions/{did}/reviews', {'expected_version': 2, 'reviewer': 'Review lead', 'outcome': 'approve', 'notes': 'Investigation only'})
        self.assertEqual(reviewed.status_code, 200, reviewed.text)
        export = self.client.get(f'/v1/decisions/{did}/export', headers=self.headers).json()
        self.assertEqual(export['decision']['status'], 'approved_for_demo')
        self.assertEqual(export['run_summaries'][0]['id'], run_id)
        with TestClient(create_app(self.settings)) as reopened:
            self.assertEqual(reopened.get(f'/v1/runs/{run_id}', headers=self.headers).status_code, 200)
            self.assertEqual(reopened.get(f'/v1/decisions/{did}', headers=self.headers).json()['version'], 3)

    def test_paths_fields_and_nonfinite_values_are_rejected(self):
        self.assertEqual(self.post('/datasets/import', {'path': 'C:/Users'}).status_code, 422)
        ds = self.post('/datasets/import', {}).json()['dataset_id']
        for body in [{'dataset_id': ds, 'year': 2025, 'adoption': 2}, {'dataset_id': ds, 'year': 2025, 'client_total': 9}, {'dataset_id': ds, 'year': 2025, 'adoption': 'NaN'}]:
            self.assertEqual(self.post('/freight/runs', body).status_code, 422)
        self.assertEqual(self.client.get(f'/v1/datasets/{ds}/tables/shipments/rows?limit=999999', headers=self.headers).status_code, 422)
        self.assertEqual(self.client.get('/v1/runs/missing', headers=self.headers).status_code, 404)

    def test_assistant_has_visible_generation_mode(self):
        ds = self.post('/datasets/import', {}).json()['dataset_id']
        result = self.post('/assistant', {'dataset_id': ds, 'question': 'Freight emissions'})
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json()['generation_mode'], 'extractive_not_ai')
