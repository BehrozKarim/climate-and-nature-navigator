# Navigator backend delivery review

Date: 7 November 2026. Scope: backend support for the seven screens and shared tools in the supplied Navigator ZIP. Frontend rendering and deployment are separate work.

## Verified result

- **84 unittest tests passed**, including the original 48 and 36 Navigator regressions/integration checks.
- Compilation passed for backend, tests and scripts.
- Actual-package HTTP smoke passed the original service and all seven Navigator screen families, plus route-to-trip handoff, record search, source resolution, review/export and assistant persistence.
- Current snapshot: 41 tables, 15 documents, 474,985 rows. Previous snapshot's 474,985 rows remain intact.
- SQLite integrity is `ok`; no foreign-key errors.
- Generated OpenAPI contains 33 Navigator paths and the current typed request schemas.
- The owned temporary HTTP server stopped. No provider/network model call, frontend edit or deployment was performed.

Actual data checks include the published 2024 total of 244,724 tCO2e; blocked preliminary 2025 scopes and their inconsistent total; 30 catalogue actions; 2,339 freight legs; 84 climate grid cells; 108 scenario/year timeline points; 42 catchments; and 73,756.53 ha of selected-year contract parcel area. These values describe their stated dataset subsets and modelling assumptions.

## Independent review and resolution

The independent reviewer inspected new services, storage/schema/assistant integration, the design/plan, reference components and test fixtures. No critical finding was identified. Three important findings were reproduced in disposable snapshots:

| Finding | Resolution and regression evidence |
| --- | --- |
| Missing lever capex/opex/abatement became zero and could enter a reviewable result | Explicit incomplete selections now reject; all/greedy/default selection discloses unavailable actions and partial catalogue coverage. `test_incomplete_selected_action_is_rejected_instead_of_zero_cost_effect` failed before and passed after the fix. |
| Conflicting transition anchor year was silently bridged by interpolation | Conflicting years remain unavailable, including intervals crossing them. An unaffected exact anchor remains usable. `test_conflicting_transition_anchor_cannot_be_bridged_by_interpolation` verified 2028, 2030, 2035 rejection and an unaffected 2040 value. |
| A Scope 1 action could remove Scope 2 through a combined floor | Individual Scope 1 and Scope 2 floors now apply before aggregation. `test_scope_one_action_cannot_remove_scope_two_emissions` verifies 60 t Scope 1 removal, 40 t Scope 2 retained, and 40 t excess discarded. Pathway method advanced to v2. |

The author resolved all three in one fix pass, with failed-first regressions and the full green suite. A separate repeat review was not substituted for those verification checks.

Additional integration checks protect preview calculations from creating runs/review items, preserve null supplier statistics when their feed is absent, keep missing parcel-plan years out of overview source-year labels, retain latest messages in long threads, and pass estimated route legs directly into the calculator without claiming external verification.

## Implementation choices retained

- Extend the existing separate FastAPI backend and preserve original endpoints, snapshots and structured decision safeguards.
- Preserve the reference's interactions, with actual records instead of canned validation/approval states.
- Separate global future horizons from inventory, price and parcel source years. Historical climate through 2026 is identical across SSP selections.
- Use contract parcel area for nature estimates and fixed unmitigated positive-area medians. Unknown loads/years remain unavailable.
- Use conservative annual overlap groups, scope floors, explicit catalogue exclusions and a labelled greedy heuristic for pathways.
- Keep exact model parameters, method/config hashes and reference archive provenance on saved assessments. Preview results are explicitly unsaved.
- Commit a new model run and its review registration atomically. Preserve source status, numerical blockers and reviewer judgment as separate state.
- Keep source-linked assistant retrieval and optional model explanations. Saved thread history is retained; each question retrieves independently, with an explicit selected run for numerical context.

## Scope considered and set aside

The reviewer considered scientific model calibration, certified SBTi/FLAG compliance, complete corporate accounting, licensed route accuracy, production identity/deployment, broader RAGFlow/MCP integration, live model output quality, frontend rendering/vendor code and significantly larger-scale load testing. These remain outside the declared prototype increment. The API/model/status labels and contract describe those limits; the delivered features do not imply those capabilities.

The root separately verified the latest frontend contract, README, full suite and actual-package smoke. No additional production or calibrated-model claim is made by this review.

## Deferred minor

The earlier preparation review recorded that optional-provider URL validation can be stricter about whitespace in hostnames. Such invalid transport still falls back locally with citations. This remains configuration polish and does not block the implemented malformed-host/port fallback or local feature workflow.
