# WeatherLens standalone backend

Date: 2026-11-07. Authority: the user's request to build a separate backend following `new documents/`, its written challenge brief and pain-points document. The transcript is unverified and byte-identical to the earlier supplied transcript. Technical choices below are implementation decisions, not additional user requirements.

## Purpose and scope

Give sustainability staff reproducible evidence for business decisions across emissions, freight, procurement, farming/climate, nature and management. The concrete automated calculation in this increment is shipment-leg emissions, the clearest manual workflow in the new documents. Other domains receive real dataset queries and explicit limits; published inventory history is not relabelled as a freshly calculated company inventory. No claim of full Scope 1–3 reconstruction, SBTi validation, crop-yield forecasting or attributed nutrient-load modelling.

Use a separate `weatherlens-backend/` directory, with no dependency on the frontend runtime, no frontend edits and no deployment. Python 3.11+, FastAPI, Pydantic, SQLite and HTTPX. Default server binds to loopback. A configurable bearer token protects shared installations; this prototype does not implement production user identities or expert accreditation.

## Approaches

Extending the existing TypeScript app would couple this work to its deployment, contrary to the separate-backend request. A separate Node service could work but would not fit the supplied Python analysis tooling as directly. Choose a separate Python REST API with SQLite for a small local build, OpenAPI for future UI integration and replaceable storage/provider boundaries for later Azure deployment. No new cloud account or paid service is required.

## Data and evidence

- Import only from server-configured dataset/document roots; clients cannot submit arbitrary filesystem paths or URLs.
- Snapshot a defined CSV/Markdown/text subset of the actual challenge package and the three new documents into SQLite. Exclude the large daily parquet and unrelated workbook; expose included tables and row counts so coverage is explicit. Include monthly climate and parcel-year history for relevant queries.
- Each import is identified by content hashes, source paths and importer/method version. Retain original row numbers, values and document contents. Reimport of identical input is idempotent; changed input creates a new dataset version. Never rewrite source files.
- Stable source references identify dataset, table, row, record key and file hash. Runs store their inputs, output, method version and source dataset. Old results remain readable after reimport or restart.
- Pagination and bounded inputs are mandatory. No arbitrary SQL, path traversal or hidden full-data exports.

## Freight and inventory context

- Calculate each leg as tonnes × kilometres × kgCO2e/tkm / 1,000. Recompute tonne-kilometres; disclose discrepancies against the recorded tkm. Retain factor ID/version/reference and the arithmetic inputs.
- Include truck, vessel and ferry; group inbound as Scope 3 category 4 and outbound as category 9. These are freight-only subtotals, never the whole company inventory.
- Validate finite nonnegative measurements, factor existence and tkm unit, mode/factor compatibility, direction and year. Exact duplicate IDs count once; conflicting duplicates are quarantined. Report exclusions and corrections alongside totals.
- Purchase documents with no inbound shipment match are coverage warnings, not proof of a missing physical leg. No endpoint/route geometry is available: return that gap, no invented route or fabricated distance lookup.
- Allow an explicit truck-factor what-if with a validated alternative truck factor and adoption fraction. It is a same-activity sensitivity calculation, not a validated reduction recommendation. Reject incompatible mode factors. Catalogue costs remain separate from computed emissions.
- Inventory history, raw purchases/energy and farm-reported footprints are available as source context with their original status. An endpoint names unimplemented corporate inventory categories instead of showing false zero totals.

## Decisions, scenarios and nature

- Expose all 30 actions, including costs, co-benefits, trade-offs and the measurement-only L27. Compare selected actions with a stated objective; preserve synthetic design-estimate labels and do not sum overlapping catalogue savings or infer local suitability.
- Monthly climate comparison uses a chosen region, SSP, baseline/future periods and months. Calculate mean temperature, annual seasonal rainfall/PET/hot-day summaries across matched grid cells and complete years. Report coverage and missing periods. No yield loss or business damage inferred from these indicators.
- Nature queries join catchments with parcel/crop-year footprint and monitoring context. Total monitored catchment loads include non-contract/background contributions and must not be attributed to Apetit. Return nature state, contract area, soil-test gaps and source evidence; no invented biodiversity score.
- Persist independent decision drafts with explicit requested decision type (investigate/pilot/investment), objective, action selections, rationale, owner, alternative reasons, open questions and optional calculation-run references.
- Optimistic version checks protect updates and review. Editing creates a new draft revision and invalidates current review status; old revisions/reviews remain in audit history. Preparation requires intentional rationale, owner, action selection, evidence acknowledgement and valid source/run references. No catalogue-only investment approval.
- Review states are prototype workflow records with declared, unverified reviewer identity. No claim of regulated approval or authenticated expert sign-off.

## Evidence assistant

Implement local lexical retrieval over snapshotted documents, returning actual excerpts with citations. A deterministic answer is explicitly labelled not AI-generated. An optional environment-configured HTTPS chat-completions provider can explain selected evidence and computed results; it cannot change calculations, submit decisions or create approvals. Provider timeouts/errors/invalid output fall back to the labelled local result. No provider is called unless configured. Corpus text is untrusted evidence, not tool instructions.

## Acceptance

Runnable API and OpenAPI docs; actual package import; independent known-value freight arithmetic; mode/factor and malformed-data tests; climate completeness and nature attribution checks; durable and concurrent review/version tests; API validation/auth/error tests; retrieval with no invented citations; optional-provider fallback tests. Smoke-test a complete import → calculate → compare → draft → review → export flow, stop its server afterward, and record remaining limitations.
