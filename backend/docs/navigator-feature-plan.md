# Navigator Feature Backend Implementation Plan

> For agentic workers: execute inline using executing-plans. Steps use checkbox syntax; one fresh review follows integration.

**Goal:** Provide the backend operations and persistence for the seven prototype screens and shared tools.

**Architecture:** Add focused domain services, a versioned model configuration and an additive FastAPI router around the existing Store, snapshots and calculations. Reuse existing decisions and explanation adapter.

**Tech Stack:** Existing Python/FastAPI/Pydantic/SQLite/HTTPX/unittest; no new runtime dependency.

**Spec:** navigator-feature-design.md.

## Global constraints

- Work in the existing separate backend; no frontend redesign, deployment, shared Git changes or paid/network provider calls.
- Preserve old endpoints and immutable dataset/run/decision evidence.
- Model assumptions and estimates must be visible and versioned; published source state is separate from local approval.
- All request/list/search bounds and dataset bindings must be enforced.

## Review focus

1. Empty or contradictory source data must not become a zero or a complete assessment.
2. Overlapping/measurement levers must not inflate physical savings or permit invalid target claims.
3. User-entered route distances must not appear externally verified.
4. Review races, blocked source approvals and cross-dataset conversation/run links must reject.
5. Scenario/price/model horizons must retain actual coverage and original assumptions.

## Task 1: Shared context, inventory and quality

Files: `navigator_common.py`, `navigator_context.py`, `navigator_models.json`, additive storage tables; `tests/navigator_fixture.py`, `tests/test_navigator_context.py`.
Interfaces: `NavigatorContext(store, dataset_id)` provides `catalog()`, `scenario(physical_scenario, year, transition_scenario=None)`, `inventory(year, restated=False)`, `search(query, limit)`, and exact record traces. Shared model loading returns parameters plus source/archive/config hashes.

- [x] Write and run failing known-value tests for scenario interpolation/invalid horizons; inventory published/restated/draft reconciliation; real feed/supplier counts and source-linked search.
- [x] Implement the services and deterministic quality IDs; expect the task tests to pass.

## Task 2: Route and pathway runs

Files: `navigator_routes.py`, `navigator_pathways.py`; their test modules.
Interfaces: route catalogue/lookup plus `calculate_trip(...)`; `pathway(...)` returns annual series and a bounded catalogue/MACC with selection, overlap and cost assumptions. Both outputs are persisted using `Store.save_run` at API boundaries.

- [x] Write/run failing tests for route 10 t × 100 km × 0.092 = 92 kg; alias same-place rejection, unknown place/mode rejection and all lookup estimate labels.
- [x] Write/run failing tests for the 1,000 t fixture baseline, 2030 target 866.5 t, lever ramps, conservative overlap, measurement exclusion, negative opex and deterministic greedy selection.
- [x] Implement and verify the route/pathway modules.

## Task 3: Climate and nature sensitivities

Files: `navigator_climate.py`, `navigator_nature.py`; test modules.
Interfaces: climate returns selected-year actual cell indicators and all-scenario annual region timelines plus declared crop sensitivity/cost. Nature consumes `Analytics.nature` contract area and returns illustrative mitigation loads/ranks and actual origin context.

- [x] Write/run failing fixtures: warming +2 °C, independently calculated crop response and replacement cost; incomplete/duplicate seasons disclose insufficient coverage.
- [x] Write/run failing fixtures: 10 ha at 0.85 kg P/ha and 14 kg N/ha; catch-crop/N/buffer multipliers; median-based rank, zero-area handling and unvalidated-attribution labels.
- [x] Implement and verify both modules without claiming trained or calibrated models.

## Task 4: Durable reviews, dispositions and conversations

Files: `navigator_workflows.py`, additive `storage.py` schema; test module.
Interfaces: review item registration/list/get/act/audit/export, quality disposition with expected version and audit, conversation create/get/message with immutable dataset binding. Version conflicts use existing `Conflict`.

- [x] Write/run failing tests for blocked approvals, independent run reviews, stale/concurrent writes, note requirements, restart persistence and disposition audit without raw source edits.
- [x] Write/run failing tests for thread/run snapshot binding and explicitly extractive citations.
- [x] Implement transactions and verify tests.

## Task 5: API, overview and actual-package delivery

Files: `navigator_api.py`, `schemas.py`, `app.py`, `tests/test_navigator_api.py`, `scripts/navigator_smoke.py`, docs/OpenAPI/README.
Interfaces: all new routes under `/v1/navigator`, existing authorization/CORS and source/run endpoints reused. Overview composes shared scenario, inventory, pathway and attention summaries. Preparation materialises source-backed review items; calculation POSTs register immutable run review items.

- [x] Write/run failing API tests for each feature family, validation/auth, run persistence and the complete review/search/assistant workflow.
- [x] Implement routes, overview and registration; run full unittest suite and compile checks.
- [x] Exercise all seven screen families and shared tools against the actual package; save results and stop the temporary server.
- [x] Obtain one independent final review, resolve material findings with regressions, and document the frontend contract and model limitations.
