# Navigator frontend API contract

This contract follows `Navigator app (interactive)-html-v1.zip`. Visual components can be redesigned independently. All paths below start with `/v1/navigator`; original `/v1` dataset, evidence, run and decision endpoints remain available.

## Start and shared controls

1. Start the backend with the README command. Import or select a snapshot using `POST /v1/datasets/import` or `GET /v1/datasets`.
2. Read `GET /datasets/{dataset_id}/catalog` for screen IDs, physical scenarios, transition scenarios, horizon years, crop choices and model sections.
3. Call `POST /prepare` with `{"dataset_id":"..."}` to idempotently register source-backed review items and up to 100 prior runs. This preserves existing reviewer dispositions. New Navigator runs register their review item atomically.
4. Call `POST /context` with `dataset_id`, `physical_scenario`, `year`, and optional `transition_scenario`. Default physical choices are `ssp126`, `ssp245`, `ssp585`; transition choice can be independent. The response supplies actual interpolation anchors, sources, prices and indices. Invalid/conflicting anchor intervals are rejected; no extrapolation.

Global horizon controls normally use 2030, 2040 or 2050. Climate playback accepts 2025–2060. Inventory year and nature parcel-plan year are separate inputs; they must not silently inherit the global future horizon.

Set `Authorization: Bearer <token>` when the server has `WEATHERLENS_API_TOKEN`. Optional `X-Actor` records a declared analyst name for quality dispositions. Configure `WEATHERLENS_CORS_ORIGINS` for the actual frontend origin, including hostname and port. No credential belongs in browser source.

## Interactive calculation response

Use the `/preview` endpoint for sliders, toggles, playback and mass/mode edits. It returns `{"persisted":false,"output":{...},"review_item_id":null}` and creates no run or review item. Debounce expensive UI updates; animation and camera movement stay in the frontend.

Use the corresponding `/runs` endpoint, or `/freight/trips`, when retaining an assessment for evidence, export or review. It returns HTTP 201 and:

```json
{
  "id": "run_...",
  "dataset_id": "ds_...",
  "kind": "navigator_pathway",
  "inputs": {},
  "output": {},
  "review_item_id": "review_...",
  "line_count": 0,
  "issue_count": 0
}
```

`output` contains typed numeric values, units in field names, coverage, method version, assumptions and model provenance. Large `lines` and `issues` use existing `GET /v1/runs/{run_id}/lines` and `/issues` with `limit` and `offset`. Retrieve the saved summary with `GET /v1/runs/{run_id}`. Retain the original `inputs` to save the exact preview state; the API does not accept a client-calculated total.

## Screen mapping

| Screen | Endpoint(s) | Inputs and output fields |
| --- | --- | --- |
| Overview | `POST /overview/preview`, `/overview/runs` | Scenario/year, optional transition, and `nature_year` (default 2025). Returns inventory card, pathway series, climate/hedge summary, nature state and attention queue. Use `source_years` and component status; a missing source year is null. |
| Inventory | `POST /inventory` | `dataset_id`, `year` (default 2024), `restated` boolean. Returns selected scope values, original history, available years, real feed counts, supplier statistics, structural events and findings. Draft reported total and scope sum are separate. |
| Freight | `GET /datasets/{id}/freight/catalog`; `POST /freight/lookup`, `/freight/preview`, `/freight/trips`, `/freight/batch` | Catalog has four presets, known places and available library factors/modes. Lookup takes `origin`/`destination` and returns estimated legs. Trip takes positive `mass_t` and explicit legs, or `preset_id` with optional mass override. Batch uses original `FreightInput`, including year, direction, optional alternative factor and adoption 0–1. |
| Pathways | `POST /pathways/preview`, `/pathways/runs` | Scenario/year, optional transition, `selection_mode=manual/all/cheapest`, and optional `action_ids` (up to 30). Response has `macc`, annual `series`, `selected_year`, adjusted selection, exclusions, overlap adjustments and costs. `[]` means no levers; omitted IDs use available default levers. |
| Climate risk | `POST /climate/preview`, `/climate/runs` | `physical_scenario`, `year`, `crop_id`, `volume_t` (default 1,000). Response has `grid_cells`, 108 `timeline` entries, `selected`, `sourcing_hedge`, coverage and replacement-premium sensitivity with explicit historical price year. |
| Nature | `POST /nature/preview`, `/nature/runs` | Actual parcel-plan `year` (default 2025), optional `crop`, `catch_crop_pct` 0–60, `mineral_n_reduction_pct` 0–30 and `buffer_strips`. Response has contract area, estimated totals, fixed baseline medians, all catchments, top eight, origins and source context. Use `priority_score_estimate` and `rank`. |
| Review | Dataset review, finding and audit routes below | Queue filters, immutable calculation/record lineage, local demo approval/change request, durable notes/versions and JSON export. |

### Route handoff

`POST /freight/lookup` returns legs compatible with the trip request, so send its `legs` directly with the chosen mass; per-leg modes can be edited. Each leg has `origin`, `destination`, `distance_km`, `mode`, optional `points`, and `distance_basis`. Coordinates are **[latitude, longitude]**, not GeoJSON order.

Modes: `truck`, `truck-reefer`, `truck-hvo`, `rail`, `ship-bulk`, `ship-reefer`, `ropax`. Availability depends on the current snapshot's factor library. All lookup distances and display polylines are illustrative. A submitted leg retains `distance_verification=unverified_client_input`, even if its declared basis is a great-circle estimate. A server preset uses `unverified_model_preset`. No external road or maritime route is verified.

The trip response provides kgCO2e and tCO2e; batch accounting uses tCO2e. Batch shipment records have no route endpoints, so their recorded distances do not imply any geographic route.

## Findings and review

| Method/path | Behavior |
| --- | --- |
| `GET /datasets/{id}/findings` | Reproducible source-linked draft trend/total findings, with current analyst disposition and version. No fabricated AI confidence or planted row IDs. |
| `POST /datasets/{id}/findings/{finding_id}/disposition` | Body: `expected_version` (starts 0), `outcome=confirm/dismiss`, `note`. Stores a judgment, not a source correction. |
| `GET /datasets/{id}/findings/{finding_id}/audit` | Paginated disposition history. |
| `GET /datasets/{id}/reviews` | `status=all/waiting/blocked/approved/draft/changes_requested`, `limit`, `offset`. Response includes items, matched total and raw status counts. |
| `GET /datasets/{id}/reviews/{review_id}` | Item metadata/lineage and saved calculation summary if applicable. |
| `POST /datasets/{id}/reviews/{review_id}/actions` | Body: `expected_version`, `reviewer`, `outcome=approve/request_changes`, `notes`. Version starts 1 and increments on every action. |
| `GET /datasets/{id}/reviews/{review_id}/audit` | Paginated registration/review events. |
| `GET /datasets/{id}/reviews/{review_id}/export` | JSON attachment with review item, full saved run and up to 500 audit events. `audit_truncated` identifies larger histories; remaining events use pagination. |
| `GET /datasets/{id}/audit` | Recent review and finding-disposition events, with paging. |

Numerically blocked draft records cannot be approved, even after a finding is dismissed. A corrected source creates a new snapshot/assessment. New runs have independent review items. `approved_for_demo` records a local prototype judgment with declared, unverified identity; it is not investment authorization. Published source context is informational and cannot acquire a fabricated local approval. No owner notification is sent.

The existing business-decision routes under `/v1/decisions` remain available for structured investigation/pilot/investment requests, alternatives and source/run evidence. Their investment and stale-review restrictions remain intact.

## Search and evidence

- `GET /datasets/{id}/search?q=F0001&limit=20` searches bounded entity tables and returns original records, source references, matching screens and known places. Search query length is 1–200; limit is 1–50.
- `GET /datasets/{id}/records/{table}/{record_id}` resolves an entity, disclosing ambiguous duplicates instead of selecting an arbitrary value.
- Exact row evidence uses `GET /v1/datasets/{id}/sources/{table}/{row_number}`; source documents use `/documents/{doc_id}`.
- `GET /models/{section}` returns current parameters, configuration hash and reference archive/component provenance. Sections: `scenario`, `pathway`, `climate`, `nature`, `routing`.

Server-owned assumptions live in `weatherlens_backend/navigator_models.json`. Restart after editing them. Every saved model run retains the exact parameter subset and model/config hash so prior results do not depend on current configuration.

## Ask Navigator

1. `POST /conversations` with `dataset_id` and optional `title`.
2. `POST /conversations/{id}/messages` with `expected_version`, `question`, optional current `run_id`.
3. Read `GET /conversations/{id}?limit=100&offset=0`; conversation discovery is `GET /datasets/{id}/conversations`.

Each question retrieves snapshot evidence and can include the selected run's bounded computed context. Saved history preserves the UI thread; retrieval is performed for each question independently. Include a specific question and the relevant `run_id` for numerical follow-ups.

Default responses are `extractive_not_ai`, with actual excerpts/citations. Configuring the existing HTTPS model adapter enables `ai_explanation_requires_review`; unknown citations and provider errors fall back locally. This build used no real model calls. Saved conversations and appended runs must belong to the same snapshot. A stale append returns 409. Responses to long-thread appends include the newest 100 messages and their offset.

## Interpretation and unavailable data

- Read `status`, coverage and limitations before displaying a headline value. Null is unavailable/unassessed, never a zero.
- Published inventory is source context. Imported feeds are not labelled domain-validated merely because CSV parsing succeeded.
- Pathways are illustrative catalogue scenarios. Incomplete explicit action selections are rejected; all/greedy/default selection discloses excluded actions. Known overlaps use annual conservative maxima, then separate Scope 1, Scope 2 and Scope 3 floors. MACC design values remain distinct from adjusted portfolio effects. The greedy shortcut is a heuristic, not a proven cost optimum.
- Crop response and replacement premium are sensitivity estimates with prototype coefficients and historical prices, not trained yield forecasts or total business loss.
- Nature loads use contract area and illustrative coefficients. Monitoring includes unrelated land/background. Ranking is not a validated SBTN/company attribution result; zero-area catchments do not enter baseline medians.
- 2025–2026 climate indicators use historical observations across all SSP selections. Missing plan years, climate months and conflicting metadata stay unavailable or partial.

Validation errors return 422, unknown records 404, stale writes/blocked review actions 409, and missing configured credentials 401. Unknown request fields are rejected. Full typed request schemas are in `docs/openapi.json` and runtime `/docs`.
