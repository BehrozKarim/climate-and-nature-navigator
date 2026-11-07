# WeatherLens backend

A separately runnable Python/FastAPI backend built from the company brief, pain-points summary and unverified transcript in `../new documents/`. The current frontend is not connected to this service yet.

The supplied **Navigator app (interactive)** ZIP now defines the feature contract: seven screens plus search, evidence, review and assistant threads. The [frontend API contract](docs/navigator-api-contract.md) maps every screen/control to requests and response fields. Use calculation previews for live controls and saved runs for evidence/review.

## Run locally

From this directory in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m weatherlens_backend
```

Open **http://127.0.0.1:8000/docs** for the interactive API, **/redoc** for reference documentation and **/health** for status. The default database is `var/weatherlens.sqlite3`. No cloud account or model API key is required for the local workflow.

The supplied dataset and `new documents` folder are auto-detected next to the backend. If you move them, set `WEATHERLENS_DATASET_ROOT` to the directory containing `START_HERE.md` and `data/`, and `WEATHERLENS_DOCUMENT_ROOT` to the documents directory. `.env.example` documents the settings; it is a template and is not automatically loaded. Set environment variables before launching the service.

The verification run has already populated the local database with the supplied package. On a fresh database, call `POST /v1/datasets/import` with `{}`. The endpoint imports only server-configured paths, not a path supplied by the browser. Repeating an identical import reuses its dataset ID.

## What is implemented

| Company need | Backend behavior | Boundary |
| --- | --- | --- |
| Fragmented source data | Immutable SQLite snapshots, source file hashes, original record numbers, table browsing | 41 CSV tables and 15 documents in the supplied package/documents; daily parquet, supplier-PCF JSON and workbook excluded |
| Manual freight emissions | Tonnes × recorded km × mode-specific factor, grouped into Scope 3 categories 4/9 | Recorded distances only; endpoints and route geometry are absent |
| Trustworthy calculations | Factor/version references, correction and exclusion issues, duplicate quarantine, persistent calculation runs | Arithmetic validation does not establish the accuracy or completeness of the synthetic input |
| Compare future actions | All 30 actions, ramped annual pathways, conservative overlap adjustment, MACC, costs and a greedy selection shortcut | Illustrative catalogue effects/target proxy; no validated local business case or certified SBTi/FLAG compliance |
| Climate/farming exposure | Complete monthly-season SSP comparison, actual cell coordinates, playback timeline and crop/replacement-premium sensitivity | Crop coefficients are illustrative prototype assumptions, not trained or validated forecasts |
| Nature/geospatial context | Contract-area/catchment joins, ecological state, mitigation sliders, estimated pressure/state ranking and origin context | Coefficients are uncalibrated; company attribution and SBTN priorities remain unvalidated |
| Explain results | Snapshotted document retrieval with excerpts/citations; optional model explanation | Default output is explicitly **extractive, not AI-generated** |
| Review and reproduce decisions | Independent drafts, revisions, optimistic version checks, review records, audit history and JSON briefs | Reviews use declared identities and are marked prototype-only; investment approval is blocked |

`GET /v1/capabilities` reports these boundaries to the frontend. `GET /v1/datasets/{id}/inventory` distinguishes the implemented freight categories from unimplemented full corporate accounting and supplies published-history context. It never presents freight totals as a full company inventory.

## Short API walkthrough

```powershell
$weatherlensUrl = 'http://127.0.0.1:8000'
$datasetResponse = Invoke-RestMethod -Method Post -Uri "$weatherlensUrl/v1/datasets/import" -ContentType 'application/json' -Body '{}'
$freightRequest = @{
  dataset_id = $datasetResponse.dataset_id
  year = 2025
  alternative_factor_id = 'EF-TKM-TRUCK-HVO'
  adoption = 0.5
} | ConvertTo-Json
$freightRun = Invoke-RestMethod -Method Post -Uri "$weatherlensUrl/v1/freight/runs" -ContentType 'application/json' -Body $freightRequest
$freightRun.output
Invoke-RestMethod "$weatherlensUrl/v1/runs/$($freightRun.id)/lines?limit=10"
```

With `WEATHERLENS_API_TOKEN` set, add an `Authorization: Bearer <token>` header to every `/v1` request. The OpenAPI UI supports this through **Authorize**. `X-Actor` records the declared person performing a draft action; it is not an authenticated user identity.

| Endpoint | Purpose |
| --- | --- |
| `POST /v1/datasets/import` | Import/reuse a snapshot |
| `GET /v1/datasets` and `/v1/datasets/{id}` | Discover dataset IDs, coverage and source metadata |
| `GET /v1/datasets/{id}/tables/{table}/rows` | Browse original records with `year`, `limit` and `offset` |
| `GET /v1/datasets/{id}/sources/{table}/{row_number}` | Resolve one exact source row |
| `GET /v1/datasets/{id}/documents/{doc_id}` | Resolve a source document snapshot |
| `POST /v1/freight/runs` | Persist freight accounting/sensitivity results |
| `GET /v1/runs/{id}` | Run inputs, summary, method, assumptions and limits |
| `GET /v1/runs/{id}/lines` or `/issues` | Paginated calculation detail |
| `GET /v1/datasets/{id}/actions` | All catalogue actions |
| `POST /v1/actions/compare` | Explicit-objective catalogue comparison |
| `POST /v1/climate/runs` and `/nature/runs` | Persist context analysis with coverage |
| `POST /v1/evidence/search` and `/assistant` | Retrieve evidence or request an explanation |
| `POST /v1/decisions` | Create an independent draft |
| `PATCH /v1/decisions/{id}` | Edit with `expected_version` and typed `changes` |
| `POST /v1/decisions/{id}/submit` | Check readiness and acknowledge evidence |
| `POST /v1/decisions/{id}/reviews` | Record prototype review of a submitted revision |
| `GET /v1/decisions/{id}/audit` or `/export` | Audit events or source-linked JSON brief |

Decision revisions are available with `GET /v1/decisions/{id}?version=N`. A stale write returns **409**, invalid input **422**, missing records **404**, and missing/incorrect configured credentials **401**. Unknown request fields are rejected; client-calculated totals cannot enter a calculation request.

The generated [OpenAPI contract](docs/openapi.json) contains request schemas. The service exposes runtime `/openapi.json`; run `python scripts/smoke.py` to regenerate the saved contract and actual-data verification report after changes.

## Accounting and evidence details

- Imported CSV values remain original strings, including Swedish decimal commas. The Swedish grower feed uses its documented semicolon delimiter and year column. Source row numbers count CSV records starting at 2 after the header.
- Exact duplicate shipment IDs count once. Conflicting shipment/factor IDs are excluded as a group. Nonfinite, negative, incompatible-unit or incompatible-mode measurements do not become zero emissions.
- Recomputed tonne-kilometres replace inconsistent recorded tkm with an explicit issue; original values remain in the snapshot. Inputs cannot distinguish an incorrect recorded distance from a correct one without route evidence.
- Canonical package mode labels `truck-reefer`, `ship-bulk`, `ship-reefer` and `ropax` map to their respective transport families while preserving the original label. Freight HVO sensitivity applies only to ambient trucks; refrigerated trucks retain their supplied factor because no refrigerated HVO factor is available.
- Unassignable year/direction values appear in coverage warnings instead of disappearing. Unmatched positive physical-receipt documents are warnings, **not** confirmed missing legs; credits, services and capex are excluded. A matched document can still lack an additional road/sea leg.
- Climate analysis uses matched grid cells, complete cell-year seasons, day-weighted seasonal temperature and mean seasonal precipitation/PET/hot-day totals. Cells have equal weight. Conflicting regional grid IDs remain in expected coverage and excluded-cell lists; missing grid IDs produce explicit issues and partial coverage. Actual included years are returned.
- Nature joins quarantine conflicting parcel-year assignments before crop filtering and disclose unresolved parcel/catchment joins. Catchment-wide monitored loads remain separate from company-attributed loads, which are unassessed.
- Each calculation run stores inputs and output under its method version. A dataset change creates a new snapshot. Old runs, decisions and evidence continue to resolve against their original snapshot.
- Catalogue L27 is measurement improvement, not physical abatement. Costs are not adjusted by fuel sensitivities, and the assistant cannot turn catalogue design estimates into a validated investment recommendation.

## Review lifecycle

`draft → submitted → approved_for_demo` or `changes_requested`.

Submission needs a selected action, objective, explicit decision request, rationale, owner, at least one alternative and its reason, resolved evidence/run references, and evidence acknowledgement. Run references must belong to the same snapshot. The acknowledgement is a user assertion, not proof that the source was read.

Every mutation increments the version. Editing clears acknowledgement/current review and returns the decision to draft; old revisions and audit events remain. SQLite transactions reject concurrent stale writes. The user can inspect exactly which submitted revision a review addressed.

This local prototype has no accredited-expert identity verification, tamper-resistant external audit log, organisation/RBAC model or production approval authority. `approved_for_demo` makes that boundary explicit. Investment approval requires a validated local business case and is deliberately rejected by the current service.

## Optional AI

Set all three environment variables to enable the explanation adapter:

- `WEATHERLENS_LLM_BASE_URL`: an HTTPS OpenAI-compatible base URL, such as a provider's versioned `/v1` endpoint; no credentials/query string in the URL.
- `WEATHERLENS_LLM_API_KEY`: server-only credential.
- `WEATHERLENS_LLM_MODEL`: provider-supported model identifier.

The model receives retrieved excerpts and a bounded summary of the chosen calculation. It has no tools or authority to edit results or reviews. Citation IDs must match supplied evidence; timeouts, malformed JSON and invalid citations return the labelled local explanation. Citation membership is checked, but claim entailment is not automatically verified. A valid response remains `ai_explanation_requires_review`.

Provider calls can incur usage charges once configured. This build used mocked provider responses for tests; no paid model call was made. RAGFlow, embeddings and new MCP services are not required for this backend.

## Tests and verification

```powershell
python -m unittest discover -s tests -v
python -m compileall -q weatherlens_backend tests
python scripts/smoke.py
```

The smoke script launches a temporary HTTP server on loopback, imports the real local package, runs freight/climate/nature analyses, compares actions, creates/submits/reviews/edits a decision, exports its brief, rejects a stale write and retrieves evidence. It closes the server even on failure. It stores the snapshot and demo records locally and updates [smoke-result.json](docs/smoke-result.json).

Tests cover known independent arithmetic, duplicates and invalid numbers, source versioning, mixed CSV dialects, missing climate periods, nature attribution/joins, concurrent decision updates, API validation/authentication and provider fallback. [Independent review](docs/code-review.md) records the findings and their follow-up status.

Verified on 2026-11-07: **84 tests passed**, compilation passed, and the actual-package HTTP workflow passed for both the original API and all seven Navigator screen families. The current import contains **474,985 rows across 41 tables and 15 documents**, including the searchable framework digest. The freight run included all **2,339 selected 2025 records**, with zero exclusions. SQLite integrity passed and prior snapshots remain intact. The [Navigator delivery review](docs/navigator-feature-review.md) records the independent findings, regression fixes and remaining scope.

The local ZIP resolved the earlier Claude-link access problem. Its screens and controls are mapped in [navigator-api-contract.md](docs/navigator-api-contract.md), with implementation choices in [navigator-feature-design.md](docs/navigator-feature-design.md). The backend supports a later visual redesign through stable REST operations.

## Separation and future deployment

This directory owns the API, database and tests. `../weatherlens` continues to own the existing UI and hosted site. No frontend or hosted deployment was changed, and no server remains running from verification. Frontend integration can use the REST contract and configured CORS origins.

For a shared deployment, use HTTPS, set the bearer token, and add proper identity/RBAC before treating reviews as authenticated approvals. The provided entry point refuses a non-loopback bind without a token. OpenAPI/health are public. For Azure adoption, the API can run on an application/container host; replace SQLite with a managed relational store and source storage with versioned object storage, then add Entra ID and the chosen AI endpoint. No Azure infrastructure has been created.

Data attribution: synthetic Since AI 2026 challenge package, CC BY 4.0 where specified by its source licence. The separately licensed original workbook is not copied or imported. Source excerpts and dataset attribution stay attached to their records.
