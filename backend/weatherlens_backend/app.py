from contextlib import asynccontextmanager
import hmac
from typing import Annotated
from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Query
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from . import __version__
from . import schemas as S
from .analytics import Analytics
from .assistant import answer, retrieve
from .config import Settings
from .datasets import import_dataset
from .decisions import DecisionService, Conflict
from .freight import calculate_freight, purchase_coverage
from .storage import Store
from .navigator_api import create_navigator_router
from .voice import create_voice_router


PageLimit = Annotated[int, Query(ge=1, le=500)]
PageOffset = Annotated[int, Query(ge=0, le=1000000)]
Actor = Annotated[str, Header(alias='X-Actor', min_length=1, max_length=160)]


def run_summary(run):
    output = run['output']
    return run | {'output': {k: v for k, v in output.items() if k not in ('lines', 'issues')}, 'line_count': len(output.get('lines', [])), 'issue_count': len(output.get('issues', []))}


def create_app(settings=None):
    settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app):
        app.state.store = Store(settings.database)
        yield

    app = FastAPI(title='WeatherLens decision backend', version=__version__, description='Separate synthetic-data prototype. Freight accounting, climate/nature context, evidence and durable decision reviews. No complete corporate inventory or verified expert approval is implied.', lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=list(settings.cors_origins), allow_credentials=False, allow_methods=['GET', 'POST', 'PATCH'], allow_headers=['Authorization', 'Content-Type', 'X-Actor'])
    bearer = HTTPBearer(auto_error=False)

    def authorize(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
        if settings.api_token and (credentials is None or not hmac.compare_digest(credentials.credentials.encode('utf-8'), settings.api_token.encode('utf-8'))):
            raise HTTPException(401, 'Valid bearer token required', headers={'WWW-Authenticate': 'Bearer'})

    def store():
        return app.state.store

    @app.exception_handler(ValueError)
    async def invalid(request, exc):
        return JSONResponse(status_code=422, content={'error': 'invalid_input', 'detail': str(exc)})

    @app.exception_handler(KeyError)
    async def missing(request, exc):
        return JSONResponse(status_code=404, content={'error': 'not_found', 'detail': str(exc.args[0])})

    @app.exception_handler(Conflict)
    async def conflict(request, exc):
        return JSONResponse(status_code=409, content={'error': 'version_or_state_conflict', 'detail': str(exc)})

    @app.exception_handler(RequestValidationError)
    async def validation(request, exc):
        return JSONResponse(status_code=422, content={'error': 'validation_error', 'detail': [{'loc': list(e['loc']), 'msg': e['msg'], 'type': e['type']} for e in exc.errors()]})

    @app.get('/health', tags=['System'])
    def health():
        return {'status': 'ok', 'service': 'weatherlens-backend', 'version': __version__}

    api = APIRouter(prefix='/v1', dependencies=[Depends(authorize)])

    @api.get('/capabilities', tags=['System'])
    def capabilities():
        return {'freight': 'deterministic_accounting_and_same_activity_sensitivity', 'inventory': 'partial_freight_only_with_published_context', 'actions': 'synthetic_catalogue_comparison', 'climate': 'monthly_exposure_comparison_not_yield_prediction', 'nature': 'geographic_context_not_attributed_nutrient_model', 'decisions': 'versioned_prototype_review_with_unverified_identity', 'assistant': 'optional_model_explanation' if all((settings.llm_api_key, settings.llm_base_url, settings.llm_model)) else 'extractive_not_ai', 'authentication': 'shared_bearer_token' if settings.api_token else 'local_demo_no_identity_authentication'}

    @api.post('/datasets/import', tags=['Data'])
    def load_dataset(body: S.Empty):
        return import_dataset(store(), settings.dataset_root, settings.document_root)

    @api.get('/datasets', tags=['Data'])
    def datasets():
        return {'datasets': store().datasets()}

    @api.get('/datasets/{dataset_id}', tags=['Data'])
    def dataset(dataset_id: str):
        return store().dataset(dataset_id)

    @api.get('/datasets/{dataset_id}/tables/{table}/rows', tags=['Data'])
    def records(dataset_id: str, table: str, year: Annotated[int | None, Query(ge=1900, le=2100)] = None, limit: PageLimit = 50, offset: PageOffset = 0):
        if table not in {s['table_name'] for s in store().sources(dataset_id)}:
            raise KeyError('Table not present in this snapshot')
        return {'dataset_id': dataset_id, 'table': table, 'total': store().count(dataset_id, table, year), 'limit': limit, 'offset': offset, 'rows': store().rows(dataset_id, table, year=year, limit=limit, offset=offset)}

    @api.get('/datasets/{dataset_id}/sources/{table}/{row_number}', tags=['Evidence'])
    def source(dataset_id: str, table: str, row_number: int):
        return store().source(dataset_id, table, row_number)

    @api.get('/datasets/{dataset_id}/documents/{doc_id}', tags=['Evidence'])
    def document(dataset_id: str, doc_id: str):
        doc = next((d for d in store().documents(dataset_id) if d['doc_id'] == doc_id), None)
        if doc is None:
            raise KeyError('Document not found')
        return {k: v for k, v in doc.items() if k != 'content'}

    @api.post('/freight/runs', status_code=201, tags=['Freight'])
    def freight(body: S.FreightInput):
        inputs = body.model_dump(exclude={'dataset_id'})
        output = calculate_freight(store().rows(body.dataset_id, 'shipments'), store().rows(body.dataset_id, 'factors'), **inputs)
        output['purchase_coverage'] = purchase_coverage(store().rows(body.dataset_id, 'purchases', year=body.year), output['lines'], store().rows(body.dataset_id, 'materials'), body.year) if body.direction != 'outbound' else None
        return run_summary(store().save_run(body.dataset_id, 'freight', inputs, output))

    @api.get('/runs/{run_id}', tags=['Calculations'])
    def run(run_id: str):
        return run_summary(store().run(run_id))

    @api.get('/runs/{run_id}/{section}', tags=['Calculations'])
    def run_details(run_id: str, section: str, limit: PageLimit = 50, offset: PageOffset = 0):
        if section not in ('lines', 'issues'):
            raise KeyError('Run section must be lines or issues')
        items = store().run(run_id)['output'].get(section, [])
        return {'total': len(items), 'limit': limit, 'offset': offset, 'items': items[offset:offset + limit]}

    @api.get('/datasets/{dataset_id}/inventory', tags=['Business context'])
    def inventory(dataset_id: str):
        return Analytics(store(), dataset_id).inventory_context()

    @api.get('/datasets/{dataset_id}/actions', tags=['Actions'])
    def actions(dataset_id: str):
        return Analytics(store(), dataset_id).actions()

    @api.post('/actions/compare', tags=['Actions'])
    def compare(body: S.CompareInput):
        return Analytics(store(), body.dataset_id).compare(body.action_ids, body.objective)

    @api.post('/climate/runs', status_code=201, tags=['Climate'])
    def climate(body: S.ClimateInput):
        inputs = body.model_dump(exclude={'dataset_id'})
        result = Analytics(store(), body.dataset_id).climate(**inputs)
        return run_summary(store().save_run(body.dataset_id, 'climate', inputs, result))

    @api.post('/nature/runs', status_code=201, tags=['Nature'])
    def nature(body: S.NatureInput):
        inputs = body.model_dump(exclude={'dataset_id'})
        result = Analytics(store(), body.dataset_id).nature(**inputs)
        return run_summary(store().save_run(body.dataset_id, 'nature', inputs, result))

    @api.post('/evidence/search', tags=['Evidence'])
    def search(body: S.SearchInput):
        return {'dataset_id': body.dataset_id, 'retrieval_method': 'lexical', 'citations': retrieve(store(), body.dataset_id, body.query, body.limit)}

    @api.post('/assistant', tags=['Evidence'])
    def assistant(body: S.AssistantInput):
        return answer(store(), body.dataset_id, body.question, body.run_id, settings)

    @api.post('/decisions', status_code=201, tags=['Decisions'])
    def create_decision(body: S.DecisionCreate, actor: Actor = 'Local analyst'):
        return DecisionService(store()).create(body.model_dump(), actor)

    @api.get('/decisions', tags=['Decisions'])
    def decisions(limit: PageLimit = 50, offset: PageOffset = 0):
        return {'decisions': DecisionService(store()).list(limit, offset)}

    @api.get('/decisions/{decision_id}', tags=['Decisions'])
    def decision(decision_id: str, version: Annotated[int | None, Query(ge=1)] = None):
        return DecisionService(store()).get(decision_id, version)

    @api.patch('/decisions/{decision_id}', tags=['Decisions'])
    def update_decision(decision_id: str, body: S.DecisionPatch, actor: Actor = 'Local analyst'):
        return DecisionService(store()).update(decision_id, body.expected_version, body.changes.model_dump(exclude_unset=True), actor)

    @api.post('/decisions/{decision_id}/submit', tags=['Decisions'])
    def submit_decision(decision_id: str, body: S.SubmitInput, actor: Actor = 'Local analyst'):
        return DecisionService(store()).submit(decision_id, body.expected_version, actor, body.evidence_acknowledged)

    @api.post('/decisions/{decision_id}/reviews', tags=['Decisions'])
    def review_decision(decision_id: str, body: S.ReviewInput):
        return DecisionService(store()).review(decision_id, body.expected_version, body.reviewer, body.outcome, body.notes)

    @api.get('/decisions/{decision_id}/audit', tags=['Decisions'])
    def audit(decision_id: str):
        return {'events': DecisionService(store()).audit(decision_id)}

    @api.get('/decisions/{decision_id}/export', tags=['Decisions'])
    def export(decision_id: str, version: Annotated[int | None, Query(ge=1)] = None):
        return DecisionService(store()).export(decision_id, version)

    api.include_router(create_navigator_router(settings, store))
    api.include_router(create_voice_router(settings, store))
    app.include_router(api)
    return app
