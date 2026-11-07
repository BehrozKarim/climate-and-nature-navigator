# Backend health review — 7 November 2026

## Assessment at initial audit

At the initial audit, the standalone backend's normal local workflow was operational and four P2 correctness or coverage findings remained. No critical defect was identified in the inspected paths; this is not a production-readiness or exhaustive security assessment. The audit itself made no implementation changes. Subsequent remediation is recorded below; the original findings are retained for traceability.

## Subsequent remediation

All four findings now have fixes and focused regressions in the frontend backend-preparation increment. Five new tests reproduced the defects before implementation. A fresh reviewer then identified a known-region case with no usable grid cells; two additional regressions reproduced that case and verified the fix. The full suite passed all 48 tests. Compilation and the actual-data HTTP workflow passed. The new snapshot imports 15 documents and verifies framework search plus citation document resolution. Freight totals are unchanged and the temporary server stopped. See `backend-preparation-progress.md` for independent review status, the deferred minor provider-hostname strictness issue, and the still-pending prototype feature mapping.

The review used the company challenge brief and pain-points document, the backend design and plan, all implementation modules, the existing test suite, actual-package HTTP execution and disposable edge-case probes. A separate reviewer independently inspected the code and confirmed the climate, provider and framework findings. Source datasets and frontend files were not edited.

## Fresh verification

| Check | Result |
| --- | --- |
| `python -m unittest discover -s tests -v` | 41 tests passed |
| `python -m compileall -q weatherlens_backend tests` | Passed |
| `python scripts/smoke.py` | Passed; temporary server stopped |
| Actual snapshot | 41 tables, 14 documents, 474,985 records |
| Selected 2025 freight | 2,339 records included, zero exclusions |
| Independent raw-CSV Decimal arithmetic | Matches persisted baseline 9,437.3054477678 tCO2e and 50% ambient-truck HVO sensitivity 7,867.6783648634 tCO2e |
| Climate workflow | 36 matched FI_SW cells; SSP245 comparison completed |
| Nature workflow | 42 catchments; explicitly context only |
| Decision workflow | Create, submit, prototype review, export, stale-write rejection and edit invalidation passed |
| SQLite `integrity_check` | `ok` |
| SQLite `foreign_key_check` | No errors |
| Installed dependency versions | Match all four requirements pins |
| External AI provider | Not called; fallback probes used MockTransport |

The freight figures describe the synthetic shipment subset, not the complete company inventory. Passing the existing tests does not resolve the additional edge cases below. The latest real-data workflow evidence is in `smoke-result.json`.

## Open findings

### P2 — Conflicting climate-grid records can make incomplete coverage look complete

Location: `weatherlens_backend/analytics.py:42`, `:43`, `:79`, `:84`.

`climate()` discards grid-master deduplication issues and builds its expected cell count from only the surviving records. A cell quarantined for conflicting coordinates disappears from both the denominator and `excluded_cells`.

Reproduced independently by both reviewers: grid C1 plus two conflicting C2 records, all assigned to FI_SW, with complete May observations for both cells in historical 2020 and SSP245 2041. Output reports `status=calculated`, `matched_cells=1`, `excluded_cells=[]`, and expected/included cell-years both 1. It provides no issue about C2.

Impact: a user cannot tell that the regional estimate excluded an ambiguous source cell. The supplied dataset's normal smoke result is unaffected by this fixture, but the data-quality contract is weaker than claimed.

Fix: retain grid-master quarantine issues, disclose affected cell IDs, and mark coverage partial when conflicting records affect the selected region. Define regional handling explicitly when conflicting records disagree on region. Add a regression showing the reduced denominator cannot conceal the exclusion.

### P2 — The supplied framework digest is absent from document retrieval

Location: `weatherlens_backend/datasets.py:36`.

The package contains `data/07_frameworks/framework_digest.md`. CSV discovery includes the frameworks folder, but Markdown/text discovery includes only package `docs/` and the separate company-document root. None of the actual snapshot's 14 document paths includes the digest. Its adjacent `source_registry.csv` is imported as a table, which lexical retrieval also does not search.

Impact: the evidence assistant cannot cite the package's dedicated framework summary. This matters for the company's stated interest in framework-grounded explanations. It does not mean no framework information exists elsewhere in the current corpus.

Fix: include the explicit framework digest in document snapshot discovery and coverage metadata; advance the importer version so a new snapshot records the expanded corpus. Add import/retrieval checks for a passage unique to that file. Preserve the distinction between package summaries and independently verified primary framework sources.

### P2 — Invalid configured model URLs escape the local fallback

Location: `weatherlens_backend/assistant.py:52`, `:55`, `:75`.

Reproduced with a disposable snapshot, a dummy key/model and MockTransport, with zero transport calls:

- `https://model.example:bad/v1` raises `httpx.InvalidURL` rather than returning the extractive answer. `InvalidURL` is outside the caught `httpx.HTTPError` family. Through the API this becomes a server error.
- `https://[broken/v1` raises `ValueError` at `urlsplit()` before the protected block. Through the API the generic handler returns 422 rather than the documented fallback.

Impact: enabling an incorrectly configured optional provider breaks an otherwise available local explanation.

Fix: validate URL parsing and its port inside the fallback boundary, handle `httpx.InvalidURL`, and preserve local citations with an explicit invalid-configuration status. Add regressions for malformed host and port configurations. Real provider interoperability remains untested.

### P2 — A malformed bearer token produces HTTP 500

Location: `weatherlens_backend/app.py:43`, `:44`.

The authorization comparison calls `hmac.compare_digest()` on strings. Python rejects non-ASCII strings for this operation.

Reproduced using FastAPI TestClient with a configured ASCII token and an authorization value consisting of `Bearer ` followed by byte `0xff`: `GET /v1/datasets` returns 500 and `Internal Server Error` instead of 401. Normal valid-token and missing-token behavior passes existing tests.

Impact: malformed credentials are reported as server failures. This finding does not demonstrate an authentication bypass.

Fix: reject unsupported token encoding before comparison or compare consistently encoded bytes; keep invalid credentials on the 401 path. Add a regression for malformed non-ASCII authorization.

## Fit to the company brief

| Business need | Current verified capability | Remaining boundary |
| --- | --- | --- |
| Consolidate fragmented inputs | Immutable local snapshots and source browsing | Defined CSV/document subset only |
| Calculate and reproduce emissions | Freight arithmetic with factor/source references and persisted runs | No full corporate, farm or supplier footprint model |
| Compare future actions and cost | 30 catalogue actions and an explicit freight fuel sensitivity | No validated local economics, ranked recommendations or multiyear target pathway |
| Understand climate risk | Complete-season regional indicator comparison | No yield-loss or financial-risk model |
| Understand nature pressures | Parcel/catchment context and monitoring evidence | No company-attributed nutrient loads or prioritisation model |
| Review business decisions | Versioned drafts, review state, stale-write protection and JSON export | Declared identities and prototype approval only |
| AI with evidence | Local lexical retrieval and optional grounded model adapter | Digest omission above; no embeddings, vector search, RAGFlow or MCP; real provider not exercised |

These declared scope limits were not graded as newly discovered bugs. The company allows a focused implementation, but a demonstration should describe the delivered scope accurately. The current evidence search defaults to extractive output, not AI generation.

## Recommended order

1. Fix climate coverage disclosure and include the missing framework document.
2. Correct malformed provider/token error handling and add focused regressions.
3. Repeat affected tests and the actual-data smoke after those changes, then integrate the frontend with the verified API contract.

Production identity/RBAC, deployment, full corporate accounting, route reconstruction, crop-loss prediction and a broader RAG architecture require separate implementation decisions. This audit neither deployed infrastructure nor called a paid provider.
