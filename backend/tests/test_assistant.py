import json
from dataclasses import replace
import tempfile
import unittest
from pathlib import Path
import httpx
from tests.helpers import fixture
from weatherlens_backend.datasets import import_dataset
from weatherlens_backend.storage import Store
from weatherlens_backend.config import Settings
from weatherlens_backend.assistant import retrieve, answer


class AssistantTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        fixture(root)
        docs = root / 'briefs'
        docs.mkdir()
        (docs / 'freight.md').write_text('Freight emissions use tonnes multiplied by kilometres and a mode-specific factor.\nThe shipment data has no route endpoints.\nMissing shipment legs need review.', encoding='utf-8')
        self.store = Store(root / 'test.db')
        self.ds = import_dataset(self.store, root, docs)['dataset_id']
        self.settings = Settings(database=root / 'test.db', llm_base_url='https://model.example/v1', llm_api_key='test-only', llm_model='test')

    def test_retrieval_returns_actual_excerpt_and_no_fake_matches(self):
        matches = retrieve(self.store, self.ds, 'freight emissions')
        self.assertIn('tonnes multiplied by kilometres', matches[0]['excerpt'])
        self.assertEqual(len(matches[0]['file_sha256']), 64)
        self.assertEqual(retrieve(self.store, self.ds, 'giraffepurple'), [])

    def test_unconfigured_answer_is_explicitly_not_ai_generated(self):
        result = answer(self.store, self.ds, 'freight emissions')
        self.assertEqual(result['generation_mode'], 'extractive_not_ai')
        self.assertTrue(result['citations'])

    def test_provider_failure_and_ungrounded_citation_fall_back(self):
        for content in ['not JSON', '[]', 'null', '42', '"text"', json.dumps({'answer': 'Unsupported claim', 'citation_ids': ['invented']})]:
            transport = httpx.MockTransport(lambda request: httpx.Response(200, json={'choices': [{'message': {'content': content}}]}))
            result = answer(self.store, self.ds, 'freight emissions', settings=self.settings, transport=transport)
            self.assertEqual(result['generation_mode'], 'extractive_not_ai')
            self.assertEqual(result['provider_status'], 'unavailable_or_invalid_output')

    def test_valid_provider_result_keeps_citations_and_separate_facts(self):
        match = retrieve(self.store, self.ds, 'freight emissions')[0]['citation_id']
        def provider(request):
            payload = json.loads(request.content)
            self.assertIn('untrusted', payload['messages'][0]['content'])
            return httpx.Response(200, json={'choices': [{'message': {'content': json.dumps({'answer': 'Inspect the recorded distances and factors.', 'citation_ids': [match]})}}]})
        result = answer(self.store, self.ds, 'freight emissions', settings=self.settings, transport=httpx.MockTransport(provider))
        self.assertEqual(result['generation_mode'], 'ai_explanation_requires_review')
        self.assertEqual(result['citations'][0]['citation_id'], match)

    def test_insecure_provider_config_does_not_make_request(self):
        settings = Settings(llm_base_url='http://insecure.example', llm_api_key='x', llm_model='x')
        result = answer(self.store, self.ds, 'freight emissions', settings=settings, transport=httpx.MockTransport(lambda r: self.fail('No HTTP provider request allowed')))
        self.assertEqual(result['generation_mode'], 'extractive_not_ai')

    def test_malformed_provider_url_keeps_local_citations_without_request(self):
        local = answer(self.store, self.ds, 'freight emissions')
        for url in ['https://model.example:bad/v1', 'https://[broken/v1', 'https://model.example:65536/v1']:
            with self.subTest(url=url):
                settings = replace(self.settings, llm_base_url=url)
                result = answer(self.store, self.ds, 'freight emissions', settings=settings, transport=httpx.MockTransport(lambda r: self.fail('Invalid configuration must not make a request')))
                self.assertEqual(result['generation_mode'], 'extractive_not_ai')
                self.assertEqual(result['provider_status'], 'invalid_provider_configuration')
                self.assertEqual(result['citations'], local['citations'])

    def test_http_error_falls_back(self):
        def timeout(request):
            raise httpx.ReadTimeout('test timeout', request=request)
        result = answer(self.store, self.ds, 'freight emissions', settings=self.settings, transport=httpx.MockTransport(timeout))
        self.assertEqual(result['provider_status'], 'unavailable_or_invalid_output')
