"""Check the local RAG/LLM path without treating retrieval fallback as AI success."""
import argparse
import os
from pathlib import Path
from urllib.parse import urlsplit

import httpx
from dotenv import load_dotenv


BRIEF = 'Apetit_x_SinceAI_2026_Challenge_Brief_EN_FINAL_2026-11-04.md'
QUESTION = 'What does the challenge brief ask the Climate and Nature Navigator to achieve?'


def check_local(client, *, import_snapshot=False, retrieval_only=False, question=QUESTION):
    def request(method, path, **kwargs):
        response = client.request(method, path, **kwargs)
        response.raise_for_status()
        return response.json()

    if import_snapshot:
        manifest = request('POST', '/v1/datasets/import', json={})
    else:
        datasets = request('GET', '/v1/datasets')['datasets']
        if not datasets:
            raise ValueError('No snapshot exists. Configure the local dataset/brief paths and run with --import-dataset.')
        manifest = datasets[0]
    documents = manifest.get('documents', [])
    company_documents = [d for d in documents if d['path'].startswith('briefs/')]
    if [d['path'] for d in company_documents] != ['briefs/' + BRIEF]:
        raise ValueError('This snapshot must contain the challenge brief as its only company-context document. Put only that file in WEATHERLENS_DOCUMENT_ROOT, restart the backend, and use --import-dataset.')
    dataset_id = manifest['dataset_id']
    print('Dataset:', dataset_id)
    print('Company context:', BRIEF)
    if retrieval_only:
        result = request('POST', '/v1/evidence/search', json={'dataset_id': dataset_id, 'query': question, 'limit': 10})
        mode, provider = 'retrieval_only', 'not_called'
    else:
        result = request('POST', '/v1/assistant', json={'dataset_id': dataset_id, 'question': question})
        mode, provider = result.get('generation_mode'), result.get('provider_status')
    print('Generation mode:', mode)
    print('Provider status:', provider)
    citations = result.get('citations', [])
    conversation_only = result.get('answer_scope') == 'conversation_only' and mode == 'ai_explanation_requires_review' and provider == 'responded'
    if not citations and not conversation_only:
        raise ValueError('No source passages were retrieved. Try a question with terms used in the challenge brief.')
    document_ids = {d['doc_id'] for d in documents}
    source_tables = {table['table']: table for table in manifest.get('tables', [])}
    def valid_citation(citation):
        if citation.get('dataset_id') != dataset_id:
            return False
        if citation.get('doc_id') in document_ids:
            return True
        if citation.get('source_kind') == 'model':
            return bool(citation.get('model', {}).get('config_sha256'))
        source = citation.get('source', {})
        table = source_tables.get(source.get('table'), {})
        return source.get('dataset_id') == dataset_id and bool(table) and source.get('file_sha256') == table.get('sha256')
    if any(not valid_citation(citation) for citation in citations):
        raise ValueError('A citation does not belong to the selected snapshot.')
    for citation in citations:
        position = f"lines {citation['line_start']}-{citation['line_end']}" if citation.get('line_start') else 'model parameters'
        print(f"Source: {citation['path']} ({position})")
    if retrieval_only:
        if not any(c['doc_id'] == company_documents[0]['doc_id'] for c in citations):
            raise ValueError('The brief is indexed but was not retrieved for this question. Try a more specific brief question.')
        print('PASS: brief retrieval works; no model was called.')
        return
    if mode != 'ai_explanation_requires_review' or provider != 'responded':
        raise ValueError('The backend returned an extractive fallback, not a generated answer. Set the three LLM variables in backend/.env and restart the backend. If already configured, check the model ID, key, quota and provider JSON compatibility.')
    if not result.get('answer', '').strip():
        raise ValueError('The provider response has no answer.')
    print('\nAnswer:\n' + result['answer'])
    print('\nPASS: the model responded to the greeting.' if conversation_only else '\nPASS: the model responded with snapshot-linked citations. The answer still requires review.')


def list_models():
    base = os.getenv('WEATHERLENS_LLM_BASE_URL', '').rstrip('/')
    key = os.getenv('WEATHERLENS_LLM_API_KEY', '')
    if not base or not key:
        raise ValueError('Set WEATHERLENS_LLM_BASE_URL and WEATHERLENS_LLM_API_KEY in this terminal first.')
    url = urlsplit(base)
    if url.scheme != 'https' or not url.hostname or url.username or url.password or url.query or url.fragment:
        raise ValueError('The provider base URL must be HTTPS without embedded credentials, a query or a fragment.')
    with httpx.Client(timeout=20, follow_redirects=False) as client:
        response = client.get(base + '/models', headers={'Authorization': 'Bearer ' + key})
        response.raise_for_status()
        for model in response.json().get('data', []):
            print(model['id'])


def main():
    load_dotenv(Path(__file__).resolve().parents[1] / '.env', override=False)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--server-url', default='http://127.0.0.1:8000')
    parser.add_argument('--import-dataset', action='store_true', help='Import/reuse an immutable local snapshot before checking')
    parser.add_argument('--retrieval-only', action='store_true', help='Verify brief retrieval without calling a model')
    parser.add_argument('--list-models', action='store_true', help='List the configured provider models using this terminal’s key')
    parser.add_argument('--question', default=QUESTION)
    args = parser.parse_args()
    try:
        if args.list_models:
            list_models()
        else:
            token = os.getenv('WEATHERLENS_API_TOKEN', '')
            headers = {'Authorization': 'Bearer ' + token} if token else {}
            with httpx.Client(base_url=args.server_url.rstrip('/'), headers=headers, timeout=120, follow_redirects=False) as client:
                check_local(client, import_snapshot=args.import_dataset, retrieval_only=args.retrieval_only, question=args.question)
    except (httpx.HTTPError, ValueError, KeyError) as error:
        print('FAIL:', error)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
