# Navigator feature backend

Date: 7 November 2026. Authority: the user's request to prepare the separate backend for mostly the features in the supplied prototype, with visual redesign later.

## Reference and intent

Reference archive: `../../new documents/Navigator app (interactive)-html-v1.zip`, SHA256 `3185ab146009f8140e24097e840af7a1e3936b67be0be8aa996229fa57e52ff9`. The archive is now accessible and contains Main, Overview, Inventory, Freight, Pathways, Climate, Nature and Review components. The prior web-access blocker is resolved by this local export.

The prototype is a design reference with hardcoded examples and explicitly simulated calculations. Its visual styling is not part of this backend increment. Implement its interactions as a stable REST contract with dataset snapshots, persisted calculation runs, source evidence and durable workflow state.

## Approach

Extend the existing FastAPI/SQLite service with focused Navigator modules and an additive router. Reusing only the old endpoints would omit pathway, route, risk, quality and review interactions. Copying client code wholesale would retain fake records, hardcoded approvals and untraceable model outputs. Instead use actual challenge records for inputs and versioned, transparent prototype-model assumptions where a scientific model is not available. Existing API routes and decision safeguards remain compatible.

## Feature contract

| Prototype interaction | Backend behavior |
| --- | --- |
| Global physical scenario and horizon; transition context | List all seven supplied transition scenarios, default physical-to-transition presets, interpolate supplied price/index anchors within their range, and disclose that the association is illustrative. Physical and transition choices can be independent. |
| Overview cards, charts, attention queue | Compose latest published inventory, target-proxy/pathway series, scenario prices, climate exposure, nature state and review counts from the same dataset. Published history is never a freshly calculated inventory. |
| Inventory year and restatement toggle | Source-linked published scopes/history; use `scope3_restated` only when supplied. Draft scopes remain preliminary, with deterministic trend and total-reconciliation findings. Feed counts come from the manifest. Supplier-PCF availability and SBTi categories come from the supplier master. |
| Confirm/dismiss data-quality finding | Persist an analyst disposition, note, author, version and audit event. Disposition does not edit the raw source or remove an unresolved numerical blocker. No simulated AI confidence percentages or fabricated missing legs. |
| Freight presets, origin/destination lookup, mass, per-leg mode | Provide the four prototype routes and known places with source provenance. Custom lookup uses explicit great-circle uplift estimates and illustrative port choices; it is not a real routing service. Accept explicit user-entered legs and persist calculations with actual factor-library versions and units. Existing shipment-batch/HVO analysis remains available. |
| Lever toggles, select all, cheapest-to-minimum, annual chart, MACC and costs | Use all 30 actual catalogue actions; support manual/all/greedy selection. Separate structural/measurement actions from physical abatement. Ramp by start year; disclose flat activity/abatement assumptions and the 2024 published proxy for an illustrative 2025 base. Treat known overlap groups conservatively and expose adjustments. Return annual 2025–2050 series, target gaps, capex, annual opex, and hypothetical carbon-price exposure. No certified SBTi compliance or guaranteed financial savings. |
| Climate year playback, five crop-region choices, scenario comparison, grid and replacement cost | Use complete source monthly seasons and actual grid coordinates for climate exposure and timeseries. Apply the prototype's explicitly labelled regional/crop response coefficients as an illustrative sensitivity, not a trained forecast. Retain coefficient/model hashes and historical price year; calculate replacement premium for a declared volume. Return missing coverage rather than random synthetic columns. |
| Nature sliders, catchment click/rank, top eight and origins | Start from selected-year contract parcel area. Apply explicit illustrative per-ha P/N coefficients and mitigation fractions, then the supplied pressure × state ranking formula. Keep these sensitivity estimates separate from measured catchment loads and unvalidated company attribution. Return all catchments, stable ranking/ties, actual origins and source evidence. |
| Review filters, lineage, approval/change request and audit | Materialise source-backed review items and register calculation runs. Require reviewer notes, version checks and immutable audit events. Numerical draft blockers cannot be approved. New run versions get independent review items; published source status is informational, not a fabricated local expert approval. All local approvals are prototype-only. |
| Command search and evidence trail | Bounded search over known entity tables, screens and actions; resolve selected records against exact snapshot row references. Runs expose inputs, method, sources and model parameters. |
| Ask Navigator | Persist independent conversation threads and their dataset binding. Use retrieved evidence plus resolved run context through the existing optional model adapter; default remains labelled extractive output. No canned numerical answers, autonomous approvals or required RAGFlow/MCP installation. |

## Data and persistence

Add SQLite tables for review items/events, quality dispositions/events and assistant conversations/messages. Use additive `CREATE TABLE IF NOT EXISTS`, parameterised queries, transactions and optimistic versions. Keep all old snapshots, runs and decisions. Separate backend model configuration is versioned and hashed; parameters used in calculations are retained in run outputs. The reference ZIP hash and relevant component names accompany prototype assumptions.

Requests remain bounded, typed and bearer-protected through the existing `/v1` dependency. Empty/missing source tables produce explicit unavailable or insufficient-data states. Unknown IDs, incompatible transport modes, nonfinite values, stale writes and cross-dataset references are rejected. Search and list responses are paginated or otherwise bounded. No network provider, route service, cloud deployment or frontend runtime is required for local functionality.

## Model decisions made by the implementer

- Default physical-to-transition presets reproduce the reference association, but do not claim scientific equivalence. Price interpolation uses actual dataset anchors; no silent extrapolation.
- Target rates are assumptions from the supplied package and prototype. A published 2024 proxy does not become an approved 2025 base or a FLAG-compliant target.
- Potentially overlapping peat, rapeseed-sourcing, refrigeration and freight levers use explicit conservative overlap groups. Gross catalogue sums and adjusted scenario values are distinguished; effectiveness remains unvalidated.
- Climate yield coefficients and nutrient coefficients are illustrative prototype assumptions. Actual monthly climate data, contract parcel areas, prices and catchments supply the inputs. No hidden answer key or original workbook is imported.
- Record-quality findings use reproducible rules and evidence. Human confirmation/dismissal records a judgment; it is not source correction or numerical validation.

## Verification

Known-value fixtures for interpolation, published/restated/draft totals, blocked approvals and quality dispositions; route arithmetic and estimate labels; pathway ramps/overlap/zero-physical actions/costs; complete climate seasons, crop sensitivity and replacement-premium arithmetic; nutrient sensitivity/ranking/attribution labels; concurrent review updates and conversation/source binding. Exercise every new API family with the actual package, resolve citations, retain previous snapshot evidence, stop temporary servers, and obtain one fresh final code review.
