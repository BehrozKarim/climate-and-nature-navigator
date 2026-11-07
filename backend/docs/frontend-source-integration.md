# Source-backed frontend integration

The frontend no longer has a design-example mode. Overview, Pathways, Climate, Nature and annual Freight use the existing calculation services, with generated initial results cached for immediate rendering. Emissions, Review, Search, Ask and voice keep their backend connections. User review state and saved calculations are preserved.

## Data boundary

The supplied package is synthetic challenge evidence. Snapshot rows and file hashes are the provenance boundary. Geography is read from deduplicated farm/site/parcel records, with coordinate validation; parcel dots are selected through the requested year's parcel-plan records. No fake farm-yield risk, catchment boundaries or shipment routes are generated.

`GET /v1/navigator/datasets/{dataset_id}/geography` supplies farm/site coordinates, available parcel-plan years and optional selected-year parcel points (`include_parcels=true&year=2025`). It does not expose filesystem paths for arbitrary reads.

`POST /v1/navigator/freight/batch/preview` uses the same supplied-row freight calculator and coverage calculation as the saved batch endpoint. Preview returns full lines, source metadata and available years without creating a run/review. Saved batches keep that exact evidence contract. The UI displays aggregate category/mode totals and can inspect included rows.

## Model corrections

The design-reference climate coefficients have been removed. Climate computes actual supplied seasonal indicators and historical baseline deltas; `yield_change_pct_estimate` and `replacement` remain null until a supported crop model exists. `price_context` retains the original supplied price record. No fabricated RMSE, probabilistic band or irrigation effect is displayed.

The design-reference nutrient/mitigation coefficients have been removed. Nature returns selected contract areas, ecological state, parcel/soil-test coverage, monitored outlet records and import-origin context. Attributed P/N loads, priority scores and mitigation benefits remain unavailable. Nonzero legacy mitigation inputs now return an explicit error rather than an unsupported estimate. Monitoring includes other land and natural background, so it cannot silently become company impact.

Pathways uses supplied catalogue quantities, the published inventory proxy, explicit target/ramp assumptions, separate scope floors and conservative known-overlap groups. A start override is accepted only for a known action, at or after its catalogue earliest start, and no later than 2050. Frozen old results are not recalculated. After ramp-up, an annual saving is held steady, not subtracted from emissions repeatedly. The default portfolio counts L13/L14 conservatively and removes 6,500 t of overlapping catalogue reduction relative to the old frontend sum. Replacements, activity evolution and ongoing reductions require further evidence.

Route presets copied from the design are removed. User-defined route lookup retains explicit coordinate/port assumptions and the supplied freight factor library. Places not represented by shipment origin records must not be presented as reconstructed freight evidence. Rail is a manually assumed mode; availability is not inferred from distance.

## Verification and limits

Use source review, compilation/build, CSV reconciliation and actual HTTP/browser reproduction. No unit tests are authorized for this task. Check all screens, empty/error states, controls, stale requests, source inspection, saving/review evidence and narrow viewports. Do not broadcast wallet transactions or claim model calibration, target compliance, teammate approval or measured token savings from this integration.

Observed verification: all seven live screens loaded without browser exceptions or demo-data requests. Manual/all/greedy action selection, action starts, SSP changes, crop region, parcel year/region, annual HVO sensitivity and route arithmetic were exercised against the backend. A failed source request showed Retry without sample substitution. Legacy reference links use the backend. Phone layouts at 375px and reduced motion passed after containing charts/tables within their sections. A saved zero-action pathway was opened in Review and its downloaded inputs/output matched the actual run; the two identified QA drafts were removed with exact ID/input/status/version/no-receipt guards. No user approvals or wallet transactions were made.

Independent supplied-CSV reconciliation matched 2,339 freight rows and 9,437.3054477678 tCO2e for 2025, and 14,213 selected contract parcels / 73,756.53 ha. The geography outlier screen identified three source farm records outside the source population envelope; they are omitted from map extents, retain their original records and appear as inspectable source observations. The resulting farm/site map and actual point-source inspection were checked in the browser. No coordinates were silently repaired. Compiler/build and whitespace checks passed. Teammate source review remains requested before merge.

## Restored interface and generated starting results

Overview, Freight and Pathways reuse the original v3 presentation, fonts and motion, while adapters bind the UI to source-backed outputs. Overview animated connections are expressly schematic registered-location links, not supplied shipment journeys. The original ignored design directory is preserved. The climate grid-cell canvas is removed; weather metrics now have selectable scenario curves, readable units, pointer/tap inspection and keyboard year controls. No unsupported yield forecasts were restored.

`backend/scripts/export_frontend_cache.py` exports `frontend/src/data/initial-snapshot.json` from the latest imported synthetic snapshot. Source metadata is deduplicated; parcel geometry is compacted and annual freight contains complete aggregates plus representative source rows. The exporter excludes mutable review dispositions, chat, notes and source documents. Full freight evidence is calculated by the backend when saving. The bundled cache is attributed to the supplied CC BY 4.0 synthetic package and must not be regenerated from private operational datasets for public distribution.

The backend cache-context endpoint identifies the immutable dataset and normalized calculation-code fingerprint. The frontend validates this context in the background at startup and on window focus, invalidates mismatches, and prevents cancelled/old-context results from entering the current cache. Bounded recent custom results persist locally. Writes, live review state, source inspection and AI still use the backend. Asset download/parse and map setup still take time; the change removes the blocking startup calculation screen, not network transfer itself.

Pathways computes a full annual series once per portfolio/scenario/start selection. Changing the displayed year selects that row, including annual operating cost, without a new request or remount. Uncached calculations retain the previous screen with an update/error status; saving waits for current results. The source-supported plateau after full implementation remains, with explanatory text.

Verification on 2026-11-08: Vite production build and Python compilation passed. Manual Playwright reproductions observed no blocking startup loader or preview-calculation request on a fresh default Overview. Pathways year changes retained chart/page DOM and made no requests; repeated portfolios and freight cargo selections reused cached results. Actual route lookup, 24/30 t arithmetic, annual HVO, climate metric/crop/year/legend/keyboard controls, reduced motion and 375px layouts passed with no browser exceptions. An empty-storage offline session rendered the bundled snapshot with a connection notice. A changed calculation fingerprint invalidated the seed and fetched current results while preserving the Overview DOM. The backend fingerprint matched the generated asset. No unit tests, paid model/audio calls or wallet transactions were run for this task. Teammate review remains pending.
