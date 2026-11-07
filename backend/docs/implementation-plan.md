# WeatherLens Backend Implementation Plan

> For agentic workers: implement in this session with the executing-plans workflow; independent final review follows integration. Steps use checkbox syntax.

**Goal:** Deliver a separately runnable, source-linked backend based on the new company documents.
**Architecture:** FastAPI validates API contracts; domain modules perform deterministic calculations; SQLite retains dataset snapshots, runs, decisions and audit events. The current frontend stays independent.
**Tech stack:** Python 3.11, FastAPI 0.124.4, Pydantic 2.12.5, HTTPX 0.28.1, Uvicorn 0.33.0, standard-library SQLite and unittest.
**Spec:** [design.md](design.md), grounded in `../../new documents/`.

## Global constraints

- Import only configured local roots; sources stay immutable. Dataset is synthetic.
- All amounts carry units, method, source references and coverage/uncertainty.
- No route invention, unsupported crop forecasts, added overlapping lever savings or whole-inventory claims.
- No cloud deployment, frontend edits or paid API calls.
- Preserve stale-review rejection and independent decision drafts across restarts.

## Review focus

1. Conflicting duplicate shipments/factors and invalid numbers must not silently enter totals.
2. Dataset updates must not change old calculation/review evidence.
3. Missing climate months/years and unrelated catchment loads must not look like assessed local risk.
4. Concurrent or stale draft/review writes must reject rather than overwrite.
5. External-provider failures, ungrounded citations and untrusted corpus instructions must not fabricate results.

## Task 1: Snapshot data and evidence

Files: `weatherlens_backend/config.py`, `storage.py`, `datasets.py`, `tests/test_datasets.py`.
Interfaces: `Store(path)`, `import_dataset(store, dataset_root, document_root) -> dict`, `Store.rows(dataset_id, table, year=None) -> list[dict]`. Each row has `values` and `source`; source contains `dataset_id`, `table`, `row_number`, `record_id`, `file_sha256`.

- [x] Write failing tests for content-versioning, idempotence, original row references and old-data survival.
- [x] Implement SQLite schema, transactional imports, whitelisted tables, document snapshots and pagination helpers.
- [x] Run `python -m unittest tests.test_datasets -v`; expect all tests pass.

## Task 2: Freight and business context

Files: `freight.py`, `analytics.py`, `tests/test_freight.py`, `tests/test_analytics.py`.
Interfaces: `calculate_freight(shipments, factors, year, direction=None, alternative_factor_id=None, adoption=0) -> dict`; `Analytics(store, dataset_id)` exposes actions, comparison, climate and nature queries.

- [x] Write independent arithmetic test: 10 t × 100 km × 0.092 kg/tkm = 0.092 tCO2e; 50% adoption of 0.020 factor gives 0.056 tCO2e.
- [x] Test duplicate/quarantine, nonfinite values, unknown/incompatible factors and measured tkm discrepancy handling before implementation.
- [x] Implement traceable freight calculations and scope-specific coverage.
- [x] Test climate complete seasons and missing periods; catchment loads stay contextual; L27 has no physical abatement.
- [x] Implement catalogue/context/scenario/nature queries with explicit limits.
- [x] Run both test modules; expect all tests pass.

## Task 3: Decisions and assistant

Files: `decisions.py`, `assistant.py`, `tests/test_decisions.py`, `tests/test_assistant.py`.
Interfaces: versioned decision create/update/submit/review methods on `DecisionService(store)`; `retrieve(store, dataset_id, query, limit)` returns source excerpts; `answer(...)` returns generation mode, text, citations and limits.

- [x] Test persisted revisions, stale version rejection, edit invalidation, approval scope and investment blockers.
- [x] Implement transactions and append-only audit records.
- [x] Test no-match retrieval, citation grounding and failed/invalid provider response fallback.
- [x] Implement bounded local retrieval and optional HTTPS provider adapter.
- [x] Run both modules; expect all tests pass.

## Task 4: API and delivery

Files: `app.py`, `schemas.py`, `__main__.py`, `tests/test_api.py`, `README.md`, `.env.example`, `requirements.txt`, `.gitignore`.

- [x] Write API integration tests for health, import, invalid requests, configured bearer-token protection, run persistence and end-to-end review/export.
- [x] Implement `/v1` endpoints, bounded queries, consistent errors, OpenAPI and loopback CLI.
- [x] Import actual supplied data and run the full workflow. Save smoke/verification output.
- [x] Run `python -m unittest discover -s tests -v`, compile checks and a real HTTP smoke test; stop preview afterward.
- [x] Obtain a fresh independent final review, resolve material findings and rerun affected tests.
- [x] Document run commands, endpoint examples, source coverage, Azure migration boundaries and actual limits.
