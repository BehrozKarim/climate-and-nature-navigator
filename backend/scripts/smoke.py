"""Exercise the actual package through a short-lived loopback HTTP server."""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
import httpx
from navigator_smoke import verify_navigator


ROOT = Path(__file__).resolve().parents[1]


def main():
    output = ROOT / 'docs/smoke-result.json'
    (ROOT / 'var').mkdir(exist_ok=True)
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        port = listener.getsockname()[1]
    env = os.environ.copy()
    env.update(WEATHERLENS_DB=str(ROOT / 'var/weatherlens.sqlite3'), WEATHERLENS_API_TOKEN='local-smoke-token', WEATHERLENS_LLM_BASE_URL='', WEATHERLENS_LLM_API_KEY='', WEATHERLENS_LLM_MODEL='')
    report = {'started_at_utc': datetime.now(timezone.utc).isoformat(), 'status': 'running', 'paid_provider_calls': False}
    log_path = ROOT / 'var/smoke-server.log'
    with log_path.open('w', encoding='utf-8') as log:
        server = subprocess.Popen([sys.executable, '-m', 'weatherlens_backend', '--port', str(port)], cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        try:
            with httpx.Client(base_url=f'http://127.0.0.1:{port}', timeout=120, headers={'Authorization': 'Bearer local-smoke-token'}) as client:
                for _ in range(100):
                    try:
                        if client.get('/health').status_code == 200:
                            break
                    except httpx.TransportError:
                        pass
                    if server.poll() is not None:
                        raise RuntimeError('Smoke server exited; inspect var/smoke-server.log')
                    time.sleep(.1)
                else:
                    raise RuntimeError('Smoke server startup timed out')

                def post(path, payload):
                    response = client.post('/v1' + path, json=payload)
                    if not response.is_success:
                        raise RuntimeError(f'{path}: {response.status_code}: {response.text[:1200]}')
                    return response.json()

                dataset = post('/datasets/import', {})
                ds = dataset['dataset_id']
                assert post('/datasets/import', {})['dataset_id'] == ds
                report['dataset'] = {'id': ds, 'table_count': len(dataset['tables']), 'document_count': len(dataset['documents']), 'row_count': sum(t['rows'] for t in dataset['tables'])}
                framework_path = 'package/data/07_frameworks/framework_digest.md'
                assert any(d['path'] == framework_path for d in dataset['documents'])
                evidence = post('/evidence/search', {'dataset_id': ds, 'query': 'groundwater', 'limit': 10})
                framework = next(c for c in evidence['citations'] if c['path'] == framework_path)
                document = client.get(f"/v1/datasets/{ds}/documents/{framework['doc_id']}")
                assert document.is_success and framework['excerpt'] in document.json()['text']
                report['evidence'] = {'framework_digest_imported': True, 'framework_digest_retrievable': True, 'source_document_resolves': True, 'retrieval_method': 'lexical'}
                run = post('/freight/runs', {'dataset_id': ds, 'year': 2025, 'alternative_factor_id': 'EF-TKM-TRUCK-HVO', 'adoption': .5})
                report['freight'] = {k: run['output'][k] for k in ('baseline_tco2e', 'scenario_tco2e', 'included_rows', 'excluded_rows', 'status')}
                assert run['output']['baseline_tco2e'] > 0
                assert run['output']['scenario_tco2e'] < run['output']['baseline_tco2e']
                compare = post('/actions/compare', {'dataset_id': ds, 'action_ids': ['L20', 'L21', 'L27'], 'objective': 'Explore freight options and evidence quality'})
                assert compare['portfolio_abatement_tco2e'] is None
                action_source = compare['actions'][0]['source']
                climate = post('/climate/runs', {'dataset_id': ds, 'region': 'FI_SW', 'scenario': 'ssp245'})
                assert climate['output']['matched_cells'] > 0
                report['climate'] = {k: climate['output'][k] for k in ('status', 'matched_cells', 'delta')}
                nature = post('/nature/runs', {'dataset_id': ds, 'year': 2025})
                assert len(nature['output']['catchments']) == 42
                report['nature'] = {'status': nature['output']['status'], 'catchments': len(nature['output']['catchments'])}
                draft = post('/decisions', {'dataset_id': ds, 'decision_type': 'investigate', 'objective': 'Explore inbound and outbound freight emissions', 'decision_request': 'Authorize a feasibility investigation, not fuel procurement', 'action_ids': ['L20'], 'rationale': 'Compare a same-activity fuel sensitivity with availability, sustainability and cost evidence before a pilot.', 'owner': 'Logistics and sustainability leads', 'alternatives': [{'action_id': 'L21', 'description': 'Vessel/rail logistics', 'reason': 'Requires route endpoints and port feasibility evidence not in the shipment table.'}], 'open_questions': ['Which truck legs can use verified sustainable HVO?', 'What is the actual incremental fuel cost?'], 'source_refs': [{'table': action_source['table'], 'row_number': action_source['row_number']}], 'run_ids': [run['id']]})
                did = draft['id']
                submitted = post(f'/decisions/{did}/submit', {'expected_version': 1, 'evidence_acknowledged': True})
                reviewed = post(f'/decisions/{did}/reviews', {'expected_version': submitted['version'], 'reviewer': 'Smoke-test reviewer (declared demo identity)', 'outcome': 'approve', 'notes': 'Prototype review of an investigation request only.'})
                exported = client.get(f'/v1/decisions/{did}/export').json()
                assert exported['decision']['status'] == 'approved_for_demo'
                stale = client.patch(f'/v1/decisions/{did}', json={'expected_version': 1, 'changes': {'owner': 'Stale owner'}})
                assert stale.status_code == 409
                edited = client.patch(f'/v1/decisions/{did}', json={'expected_version': reviewed['version'], 'changes': {'rationale': 'Revised investigation rationale; needs fresh review.'}})
                assert edited.status_code == 200 and edited.json()['status'] == 'draft'
                answer = post('/assistant', {'dataset_id': ds, 'question': 'How are truck and vessel freight emissions calculated, and what route data is missing?', 'run_id': run['id']})
                assert answer['generation_mode'] == 'extractive_not_ai' and answer['citations']
                report['decision'] = {'id': did, 'latest_status': 'draft', 'prior_review_preserved': True, 'stale_update_rejected': True}
                report['assistant'] = {'generation_mode': answer['generation_mode'], 'citations': len(answer['citations'])}
                report['navigator'] = verify_navigator(client, ds)
                (ROOT / 'docs/openapi.json').write_text(json.dumps(client.get('/openapi.json').json(), indent=2) + '\n', encoding='utf-8')
                report['status'] = 'passed'
        finally:
            server.terminate()
            try:
                server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=5)
            report['server_stopped'] = server.poll() is not None
            report['finished_at_utc'] = datetime.now(timezone.utc).isoformat()
            output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
