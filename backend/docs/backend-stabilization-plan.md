# Backend Stabilization Implementation Plan

> For agentic workers: use the executing-plans workflow inline. Steps use checkbox syntax. One fresh-context review follows integration.

**Goal:** Fix four verified defects before adapting the API to the supplied frontend.

**Architecture:** Keep the current FastAPI/domain/SQLite boundaries. Add regression tests at the boundaries where each defect occurs. Expand the evidence snapshot without altering old snapshots.

**Tech Stack:** Existing Python 3.11, FastAPI, Pydantic, HTTPX, SQLite and unittest; no new dependencies.

**Spec:** `frontend-backend-preparation.md` and `backend-health-review-2026-11-07.md`. The feature mapping itself awaits accessible prototype content.

## Global constraints

- Work only in the existing separate backend directory; no deployment or frontend edits.
- No real model calls or additional cloud resources.
- Preserve old snapshot and run evidence. Advance importer and changed climate method versions.
- Keep API routes backward compatible; coverage and issue fields may be added.
- Use existing test framework and independently derived fixtures.

## Review focus

- Conflicting grid records spanning different regions must disclose uncertainty in each affected regional query.
- Missing grid IDs must not hide incomplete regional coverage.
- Invalid provider settings must retain the local answer and its citations without network activity.
- Expanding the corpus must preserve previous document and row references.
- Malformed credentials must remain unauthorized without an internal server error.

## Task 1: Regression coverage and fixes

Files: `tests/test_analytics.py`, `test_datasets.py`, `test_assistant.py`, `test_api.py`; `weatherlens_backend/analytics.py`, `datasets.py`, `assistant.py`, `app.py`.

Interfaces: existing `Analytics.climate(...)`, `import_dataset(...)`, `answer(...)` and `create_app(...)` remain. Climate returns additive `issues` and grid-master coverage, includes ambiguous regional IDs in the expected denominator and names excluded cells. Invalid model configuration returns the existing extractive response with an explicit provider status. Framework Markdown/text files join the evidence corpus under their original package paths. Invalid bearer credentials return 401.

- [x] Write regressions for same-region and cross-region grid conflicts and missing grid IDs; framework import/retrieval with immutable prior snapshots; malformed host/port provider configuration; non-ASCII bearer credentials.
- [x] Run the four test modules and confirm the new tests fail for the reproduced defects.
- [x] Apply the minimal fixes and advance importer/climate method versions.
- [x] Run `python -m unittest discover -s tests -v`; expect all existing and new tests to pass.

## Task 2: Verify and document the prepared service

Files: `scripts/smoke.py`, generated `docs/smoke-result.json`/`openapi.json`, `README.md`, review and progress documents.

- [x] Make the actual-package smoke verify framework evidence retrieval and run it; expect 41 tables, 15 documents and unchanged freight arithmetic.
- [x] Run compilation and an independent final code review; resolve material findings with regressions.
- [x] Record test results, new snapshot coverage and resolved historical findings. Explicitly keep frontend feature alignment pending until the prototype content is available.
