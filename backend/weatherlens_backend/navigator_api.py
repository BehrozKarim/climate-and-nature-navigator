from typing import Annotated
from fastapi import APIRouter, Header, Query
from fastapi.responses import JSONResponse
from . import schemas as S
from .navigator_climate import ClimateRiskService
from .navigator_common import model
from .navigator_context import NavigatorContext
from .navigator_nature import NatureSensitivityService
from .navigator_overview import overview
from .navigator_pathways import PathwayService
from .navigator_presentation import geography, freight_preview
from .navigator_routes import RouteService
from .navigator_workflows import ConversationService, ReviewService, page_bounds


Limit = Annotated[int, Query(ge=1, le=500)]
Offset = Annotated[int, Query(ge=0, le=1000000)]
Actor = Annotated[str, Header(alias='X-Actor', min_length=1, max_length=160)]


def present_run(run):
    output = run['output']
    return run | {'output': {k: v for k, v in output.items() if k not in ('lines', 'issues')}, 'line_count': len(output.get('lines', [])), 'issue_count': len(output.get('issues', []))}


def create_navigator_router(settings, store):
    router = APIRouter(prefix='/navigator', tags=['Navigator frontend contract'])

    def save(dataset_id, kind, inputs, output):
        return present_run(ReviewService(store(), dataset_id).save_run(kind, inputs, output))

    def preview(output):
        return {'persisted': False, 'output': output, 'review_item_id': None}

    @router.get('/datasets/{dataset_id}/catalog')
    def catalog(dataset_id: str):
        return NavigatorContext(store(), dataset_id).catalog()

    @router.get('/models/{section}')
    def parameters(section: str):
        return model(section)

    @router.get('/datasets/{dataset_id}/geography')
    def map_context(dataset_id: str, year: int = 2025, include_parcels: bool = False):
        return geography(store(), dataset_id, year, include_parcels)

    @router.post('/prepare')
    def prepare(body: S.DatasetInput):
        return ReviewService(store(), body.dataset_id).prepare()

    @router.post('/context')
    def context(body: S.NavigatorScenario):
        return NavigatorContext(store(), body.dataset_id).scenario(body.physical_scenario, body.year, body.transition_scenario)

    @router.post('/inventory')
    def inventory(body: S.NavigatorInventory):
        service = ReviewService(store(), body.dataset_id)
        return NavigatorContext(store(), body.dataset_id).inventory(body.year, body.restated) | {'quality_findings': service.findings()}

    @router.post('/overview/runs', status_code=201)
    def overview_run(body: S.NavigatorOverview):
        inputs = body.model_dump(exclude={'dataset_id'})
        return save(body.dataset_id, 'navigator_overview', inputs, overview(store(), body.dataset_id, **inputs))

    @router.post('/overview/preview')
    def overview_preview(body: S.NavigatorOverview):
        return preview(overview(store(), body.dataset_id, **body.model_dump(exclude={'dataset_id'})))

    @router.get('/datasets/{dataset_id}/freight/catalog')
    def freight_catalog(dataset_id: str):
        return RouteService(store(), dataset_id).catalog()

    @router.post('/freight/lookup')
    def route_lookup(body: S.NavigatorRouteLookup):
        return RouteService(store(), body.dataset_id).lookup(body.origin, body.destination)

    @router.post('/freight/trips', status_code=201)
    def trip(body: S.NavigatorTrip):
        inputs = body.model_dump(exclude={'dataset_id'})
        return save(body.dataset_id, 'navigator_trip', inputs, RouteService(store(), body.dataset_id).calculate_trip(**inputs))

    @router.post('/freight/preview')
    def trip_preview(body: S.NavigatorTrip):
        return preview(RouteService(store(), body.dataset_id).calculate_trip(**body.model_dump(exclude={'dataset_id'})))

    @router.post('/freight/batch', status_code=201)
    def freight_batch(body: S.FreightInput):
        inputs = body.model_dump(exclude={'dataset_id'})
        output = freight_preview(store(), body.dataset_id, **inputs)
        return save(body.dataset_id, 'freight', inputs, output)

    @router.post('/freight/batch/preview')
    def batch_preview(body: S.FreightInput):
        return preview(freight_preview(store(), body.dataset_id, **body.model_dump(exclude={'dataset_id'})))

    @router.post('/pathways/runs', status_code=201)
    def pathways(body: S.NavigatorPathway):
        inputs = body.model_dump(exclude={'dataset_id'})
        return save(body.dataset_id, 'navigator_pathway', inputs, PathwayService(store(), body.dataset_id).calculate(**inputs))

    @router.post('/pathways/preview')
    def pathway_preview(body: S.NavigatorPathway):
        return preview(PathwayService(store(), body.dataset_id).calculate(**body.model_dump(exclude={'dataset_id'})))

    @router.post('/climate/runs', status_code=201)
    def climate(body: S.NavigatorClimate):
        inputs = body.model_dump(exclude={'dataset_id'})
        return save(body.dataset_id, 'navigator_climate', inputs, ClimateRiskService(store(), body.dataset_id).calculate(**inputs))

    @router.post('/climate/preview')
    def climate_preview(body: S.NavigatorClimate):
        return preview(ClimateRiskService(store(), body.dataset_id).calculate(**body.model_dump(exclude={'dataset_id'})))

    @router.post('/nature/runs', status_code=201)
    def nature(body: S.NavigatorNature):
        inputs = body.model_dump(exclude={'dataset_id'})
        return save(body.dataset_id, 'navigator_nature', inputs, NatureSensitivityService(store(), body.dataset_id).calculate(**inputs))

    @router.post('/nature/preview')
    def nature_preview(body: S.NavigatorNature):
        return preview(NatureSensitivityService(store(), body.dataset_id).calculate(**body.model_dump(exclude={'dataset_id'})))

    @router.get('/datasets/{dataset_id}/search')
    def search(dataset_id: str, q: Annotated[str, Query(min_length=1, max_length=200)], limit: Annotated[int, Query(ge=1, le=50)] = 20):
        return NavigatorContext(store(), dataset_id).search(q, limit)

    @router.get('/datasets/{dataset_id}/records/{table}/{record_id}')
    def record(dataset_id: str, table: str, record_id: str):
        return NavigatorContext(store(), dataset_id).record(table, record_id)

    @router.get('/datasets/{dataset_id}/findings')
    def findings(dataset_id: str):
        return {'dataset_id': dataset_id, 'findings': ReviewService(store(), dataset_id).findings()}

    @router.post('/datasets/{dataset_id}/findings/{finding_id}/disposition')
    def disposition(dataset_id: str, finding_id: str, body: S.NavigatorDisposition, actor: Actor = 'Local analyst'):
        return ReviewService(store(), dataset_id).resolve_finding(finding_id, body.expected_version, body.outcome, actor, body.note)

    @router.get('/datasets/{dataset_id}/findings/{finding_id}/audit')
    def finding_audit(dataset_id: str, finding_id: str, limit: Limit = 100, offset: Offset = 0):
        return ReviewService(store(), dataset_id).quality_audit(finding_id, limit, offset)

    @router.get('/datasets/{dataset_id}/reviews')
    def reviews(dataset_id: str, status: str = 'all', limit: Limit = 50, offset: Offset = 0):
        return ReviewService(store(), dataset_id).list(status, limit, offset)

    @router.get('/datasets/{dataset_id}/reviews/{review_id}')
    def review(dataset_id: str, review_id: str):
        item = ReviewService(store(), dataset_id).get(review_id)
        return item | {'calculation': present_run(store().run(item['run_id'])) if item.get('run_id') else None}

    @router.post('/datasets/{dataset_id}/reviews/{review_id}/actions')
    def review_action(dataset_id: str, review_id: str, body: S.ReviewInput):
        return ReviewService(store(), dataset_id).act(review_id, body.expected_version, body.outcome, body.reviewer, body.notes)

    @router.get('/datasets/{dataset_id}/reviews/{review_id}/audit')
    def review_audit(dataset_id: str, review_id: str, limit: Limit = 100, offset: Offset = 0):
        return ReviewService(store(), dataset_id).audit(review_id, limit, offset)

    @router.get('/datasets/{dataset_id}/reviews/{review_id}/export')
    def export(dataset_id: str, review_id: str):
        return JSONResponse(ReviewService(store(), dataset_id).export(review_id), headers={'Content-Disposition': 'attachment; filename="navigator-review.json"'})

    @router.get('/datasets/{dataset_id}/audit')
    def audit(dataset_id: str, limit: Limit = 100, offset: Offset = 0):
        return ReviewService(store(), dataset_id).events(limit, offset)

    @router.post('/conversations', status_code=201)
    def conversation(body: S.NavigatorConversation):
        return ConversationService(store(), settings).create(body.dataset_id, body.title)

    @router.get('/datasets/{dataset_id}/conversations')
    def conversations(dataset_id: str, limit: Limit = 50, offset: Offset = 0):
        store().dataset(dataset_id)
        page_bounds(limit, offset)
        with store().connect() as db:
            total = db.execute('SELECT count(*) FROM navigator_conversations WHERE dataset_id=?', (dataset_id,)).fetchone()[0]
            rows = db.execute('SELECT * FROM navigator_conversations WHERE dataset_id=? ORDER BY updated_at DESC,id LIMIT ? OFFSET ?', (dataset_id, limit, offset)).fetchall()
        return {'dataset_id': dataset_id, 'total': total, 'limit': limit, 'offset': offset, 'conversations': [dict(r) for r in rows]}

    @router.get('/conversations/{conversation_id}')
    def messages(conversation_id: str, limit: Limit = 100, offset: Offset = 0):
        return ConversationService(store(), settings).get(conversation_id, limit, offset)

    @router.post('/conversations/{conversation_id}/messages', status_code=201)
    def ask(conversation_id: str, body: S.NavigatorMessage):
        return ConversationService(store(), settings).ask(conversation_id, body.expected_version, body.question, body.run_id)

    return router
