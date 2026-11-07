# Independent backend code review

Reviewed 2026-11-07: the complete new standalone backend, its design and implementation plan, and all six test modules. This is a file-based review, not a Git commit-range review. No frontend files, source datasets, implementation files or tests were changed by this reviewer. No external provider was called.

**Final recheck: all five findings below are resolved.** The historical findings are retained for traceability; resolution evidence appears at the end of this report.

## Verification

- `python -m unittest discover -s tests -v`: 35 tests passed.
- Additional disposable-fixture probes reproduced the findings below. Provider probes used `httpx.MockTransport` only.
- Snapshot hashing and transactional import, original row retention, immutable run references, review transactions/version checks, and explicit domain limitations are sound in the reviewed paths. Existing tests exercise known-value freight arithmetic, restart persistence, concurrent edits, and invalidation of reviews after edits.

## Findings at initial review

### P2: Non-object provider JSON escapes the fallback

Location: `weatherlens_backend/assistant.py:66` and `:68`.

After parsing the provider message, the code assumes the parsed value is a mapping and calls `model.get`. Valid JSON values `[]`, `null`, `42`, and `"text"` all raise `AttributeError`, which the fallback handler does not catch. Each was reproduced. A configured provider returning any of these causes an API server error instead of the documented local extractive answer.

Smallest fix: validate that the parsed message is a dictionary and raise `ValueError` otherwise before calling `.get`.

Regression: table-driven MockTransport responses for JSON array, null, number and string; each must return `generation_mode=extractive_not_ai`, `provider_status=unavailable_or_invalid_output`, and the original local citations.

### P2: Conflicting crop-year records enter crop-specific footprints

Location: `weatherlens_backend/analytics.py:87` and `:88`.

Nature selection builds a set of parcel IDs directly from crop-year rows without checking the snapshot's composite `parcel_id/year` key. A 5 ha parcel with two conflicting records, `P1/2025/pea` and `P1/2025/carrot`, appears as 5 ha in both crop-specific queries, with `issues=[]`. The reported context therefore presents an ambiguous crop assignment as resolved.

Smallest fix: detect exact and conflicting composite parcel-year duplicates before applying the crop filter. Count exact duplicates once; quarantine conflicting assignments and return their evidence references and an explicit coverage issue.

Regression: same parcel/year with two crops must not contribute area to either selected crop; repeated identical assignments must contribute once. Verify order independence.

### P2: Missing nature joins silently become zero selected area

Location: `weatherlens_backend/analytics.py:93` through `:107`.

Selected crop-year IDs missing from the parcel master are silently discarded. Likewise, selected parcel masters with unknown catchment IDs never reach the output loop. Status checks whether any selected IDs and any catchments exist, rather than whether selected records joined successfully. A selected plan for `MISSING`, with an unrelated parcel and a valid catchment present, returns `context_only`, zero area, zero parcels and no issues. This makes unavailable selected footprint context look like a measured absence.

Smallest fix: track selected, joined and excluded parcel counts; report orphan parcel and catchment references. Set insufficient coverage when no selected records can contribute and partial coverage when only some can. Avoid representing unknown selected area as a complete zero.

Regression: selected plan missing its parcel, selected parcel missing its catchment, all-invalid selected areas, and a mixture of valid/unmatched selected parcels. Verify explicit issues and coverage/status.

### P2: Freight selection hides rows with invalid selection fields

Location: `weatherlens_backend/freight.py:66` (the `selected_sources` construction in the reviewed version).

Validation only runs after filtering on exact year and optional direction. In an inbound 2025 query, one valid shipment plus a second shipment with an invalid year or `direction=unknown` returns `calculated`, one input, one included, zero excluded and no issues. The invalid source row cannot safely be assigned to the selected period or direction, but it should remain visible as unassignable coverage rather than silently disappear.

Smallest fix: validate selection fields across the shipment snapshot and expose unassignable rows separately from definitely out-of-scope rows. Do not allocate unknown rows to a requested year/direction or invent their emissions.

Regression: valid selected leg plus invalid year; valid selected leg plus same-year unknown direction under a direction filter; valid out-of-period and opposite-direction legs should remain ordinary out-of-scope records.

The implementing agent was already adding shipment-coverage reporting; this finding was sent immediately for inclusion in that work.

### P2: Extreme numeric exponents escape invalid-data handling

Location: `weatherlens_backend/freight.py:19`, the magnitude check in `number`.

`Decimal` construction accepts `1e1000000`, but the subsequent context-sensitive `abs(value)` raises `decimal.Overflow`. That expression is outside the conversion exception handler and the caller only quarantines `ValueError`. Both positive and negative extreme exponents reproduce this failure; a shipment with `t='1e1000000'` aborts the whole freight calculation. Other users of the shared numeric validator are affected too.

Smallest fix: use context-free `value.copy_abs()` for the magnitude comparison, or translate `DecimalException` during numeric validation into `ValueError`.

Regression: extreme positive and negative exponents in tonnes, distance and factors must be excluded with an explicit issue while unrelated valid legs still calculate. A direct validator test must assert `ValueError`, not `decimal.Overflow`.

## Scope and assessment

These findings affect the declared prototype's existing behavior; they do not require a larger inventory, forecast or nutrient model. Shared-token authentication, declared reviewer identity, no production approval authority, synthetic factors, local SQLite, and unverified factual entailment of model prose are documented limitations, not additional review defects. Climate summaries use complete seasons, day-weighted seasonal temperature and equal cell weighting as documented; no denominator arithmetic defect was found in the inspected path.

## Remediation recheck

The reviewer inspected the current implementation and independently reran `python -m unittest discover -s tests -v`: **41 tests passed**. Focused additional probes used temporary fixtures and MockTransport, with no external provider calls or implementation edits.

| Finding | Resolution and independent evidence |
| --- | --- |
| Non-object provider JSON | Resolved. Parsed model output must be a dictionary. Array, null, number and string probes now return the local fallback and retain its original citations. |
| Conflicting parcel-year selection | Resolved. Composite parcel/year deduplication occurs before crop selection. Tests cover both crop queries; an additional reversed-order probe quarantined both conflicting records. Exact duplicates contribute area once and disclose the repeated record. |
| Missing nature joins | Resolved. Missing parcel masters and catchments produce explicit issues and selected/matched coverage. All-orphan and all-invalid-area probes report insufficient data; a valid plus orphan mix reports partial coverage and retains only the verified 5 ha. |
| Hidden unassignable freight rows | Resolved. Invalid year and selected-period unknown direction are separately counted as unassignable and produce warning status. An adjacent probe confirmed valid opposite-direction and different-year rows remain ordinary out-of-scope data. |
| Extreme numeric exponents | Resolved. The validator uses context-free `copy_abs()`. Direct positive/negative extreme-exponent probes raise `ValueError`; tonnes, kilometres and factor probes exclude the bad shipment while retaining the valid 0.092 tCO2e leg. |

Adjacent changes were checked within the requested scope. All four actual-package mode spellings are explicitly mapped and tested; refrigerated trucks retain their baseline factor under the ambient-truck HVO sensitivity. Swedish semicolon import preserves decimal-comma strings and source-year lookup, with a passing regression. Purchase coverage preserves a null confirmed-missing-leg count and warning-only interpretation; additional probes confirmed services and capex are excluded from physical-receipt coverage. API wiring omits inbound purchase coverage for an outbound-only calculation.

No unresolved material defect remains from this review. This assessment is limited to the reviewed prototype paths and the stated fixes; the implementing agent owns the separate actual-package HTTP smoke verification and delivery checks.
