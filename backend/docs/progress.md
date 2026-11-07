# Backend implementation ledger

Plan: implementation-plan.md. Spec: design.md. User authorized building a separate backend from the new documents.

Ruling: execute the authorized build without reopening design approval. Use the existing company documents and stated choices as requirements; technical details are implementation decisions.
Ruling: use a separate new backend directory instead of modifying the existing app or its hosting. Parent Git repository is `C:/Users/1990t/Desktop/Project`, so no unrelated branch/worktree manipulation or automatic commits.
Ruling: use built-in unittest with FastAPI TestClient, avoiding unnecessary test-framework installation.
Pre-flight: API, analytics and decisions consume the same Store row/source format; immutable dataset IDs are required everywhere. Decision runs must match the decision dataset.

Builder check: no blocking scope/stack contradiction. Adopted quarantine of all conflicting IDs, complete cell-year climate denominators, explicit prototype review semantics and strict snapshot binding.

Task 1 complete: snapshot importer and immutable original-row/document storage; initial module-missing red test, then 4 green tests. Actual-data smoke found Swedish semicolon/decimal-comma dialect; added failing regression, fixed parser/indexed year, 5 tests green.
Task 2 complete: independent freight arithmetic, duplicate/factor validation, catalogue and climate/nature context. Actual package mode labels required explicit mappings; refrigerated HVO effect remains unassessed. Coverage warns about unassignable selection metadata and unmatched positive physical-receipt documents without inventing missing legs.
Task 3 complete: persistent independent decisions, revisions, optimistic concurrency, review invalidation, source/run binding and investment blocking. Local document retrieval and optional provider fallback are implemented.
Task 4 complete: API, typed inputs, configurable bearer token, loopback CLI, OpenAPI, HTTP smoke and README implemented. Final actual-data smoke passed with 41 tables, 14 documents and 474,985 rows. All 2,339 selected 2025 freight records calculated with zero exclusions; climate comparison matched 36 cells and nature context covered 42 catchments. The decision review/export/edit workflow, stale-write rejection and local evidence retrieval passed. The temporary server was stopped.

Independent reviewer identified five P2 cases. Regressions now cover non-object provider JSON, conflicting crop-year selection, missing nature joins, unassignable freight metadata and extreme Decimal exponents. The independent follow-up confirmed all five resolved, with no unresolved material finding in the reviewed scope. Final verification on 2026-11-07: 41 unittest tests passed, compileall passed and actual-package HTTP smoke passed. No paid provider call, frontend change or cloud deployment was made.

Ruling: treat refrigerated trucks as baseline-only in the ambient-truck fuel sensitivity because the supplied library has no refrigerated HVO factor. This prevents overstating the scenario's supported scope.
Ruling: snapshot raw Swedish values without decimal conversion because the source table is exposed as source context; no farm calculation consumes it in this increment.
