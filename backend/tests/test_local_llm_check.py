import contextlib
import io
import unittest

import httpx

from scripts.test_llm import BRIEF, check_local


class LocalLlmCheckTests(unittest.TestCase):
    def client(self, *, mode='ai_explanation_requires_review', provider='responded', company_extra=None, citation_dataset='ds_test'):
        self.requests = []
        documents = [{'doc_id': 'doc_brief', 'path': 'briefs/' + BRIEF}]
        if company_extra:
            documents.append({'doc_id': 'doc_extra', 'path': 'briefs/' + company_extra})
        def respond(request):
            self.requests.append(request.url.path)
            if request.url.path == '/v1/datasets':
                return httpx.Response(200, json={'datasets': [{'dataset_id': 'ds_test', 'documents': documents}]})
            return httpx.Response(200, json={'generation_mode': mode, 'provider_status': provider, 'answer': 'Source-based explanation.', 'citations': [{'dataset_id': citation_dataset, 'doc_id': 'doc_brief', 'path': 'briefs/' + BRIEF, 'line_start': 1, 'line_end': 12}]})
        return httpx.Client(base_url='http://127.0.0.1:8000', transport=httpx.MockTransport(respond))

    def test_generated_answer_passes(self):
        with self.client() as client, contextlib.redirect_stdout(io.StringIO()) as output:
            check_local(client)
        self.assertIn('PASS: the model responded', output.getvalue())

    def test_extractive_fallback_does_not_pass_as_ai(self):
        with self.client(mode='extractive_not_ai', provider='not_configured') as client, contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaisesRegex(ValueError, 'extractive fallback'):
                check_local(client)

    def test_retrieval_check_does_not_call_generation(self):
        with self.client(mode='extractive_not_ai', provider='not_configured') as client, contextlib.redirect_stdout(io.StringIO()) as output:
            check_local(client, retrieval_only=True)
        self.assertIn('no model was called', output.getvalue())
        self.assertIn('/v1/evidence/search', self.requests)
        self.assertNotIn('/v1/assistant', self.requests)

    def test_transcript_is_not_required_or_accepted_as_company_context(self):
        with self.client(company_extra='Transcript_AUDIO-2026-11-06_unverified.txt') as client, contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaisesRegex(ValueError, 'only company-context'):
                check_local(client)

    def test_cross_snapshot_citation_is_rejected(self):
        with self.client(citation_dataset='ds_other') as client, contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaisesRegex(ValueError, 'selected snapshot'):
                check_local(client)
