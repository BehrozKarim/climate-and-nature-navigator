# Navigator project knowledge for future sessions

These are curated engineering notes, not imported conversation transcripts or extracted Brain memories. Verify the current implementation and tests before relying on them.

- **Overlapping actions:** known pathway overlaps use conservative maxima. Scope 1, Scope 2 and Scope 3 have separate emissions floors; selected reductions cannot drive a scope below zero. Inspect `weatherlens_backend/navigator_pathways.py`, particularly `PathwayService.calculate`.
- **Approval meaning:** `DecisionService.review` marks a successful prototype review as `approved_for_demo`, with declared, unverified reviewer identity and prototype-only scope. Investment approval is blocked because indicative catalogue values do not establish a validated local business case. Inspect `weatherlens_backend/decisions.py`.
- **Evidence and revisions:** decision submission requires resolved evidence, selected actions, rationale, owner and a considered alternative. Editing a decision invalidates its prior review, and writes use optimistic version checks. Inspect `DecisionService.submit`, `update` and `_change`, plus `tests/test_decisions.py`.
- **Historical weather:** selecting a different physical scenario must not change the historical-year result. `ClimateRiskTests.test_historical_year_is_identical_for_all_physical_scenarios` covers this behavior in `tests/test_navigator_climate.py`.
- **Tool boundary:** Entire is for developer context and code review. It does not supply climate data or validate business recommendations. No FIWARE context broker has been added by this integration.
- **Privacy:** checkpoint capture can include prompts and tool outputs. Automatic session uploads are disabled for this public repository; review checkpoint contents before any deliberate sharing.

Paths above are relative to `backend/`. These notes were checked against Graph results at backend commit `ca4fecdbded727bf333c90b01ddc5921235565d5` on 2026-11-07.
