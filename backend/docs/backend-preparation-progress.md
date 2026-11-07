# Backend preparation ledger

Plan: backend-stabilization-plan.md. Spec: frontend-backend-preparation.md.

Ruling: follow the user's instruction to prepare the existing separate backend; retain the existing local directory instead of manipulating the unrelated parent Git repository or moving untracked backend files into another worktree. No automatic commits or frontend/deployment changes.

Ruling: the four reproduced backend fixes are independent of the missing prototype details and can proceed. Do not invent a feature mapping from the inaccessible Claude runtime shell.

Pre-flight: new document discovery changes the snapshot identity used by retrieval and decisions; advance the importer version and retain old snapshots. Climate adds coverage fields without changing API request fields. Error-handling fixes preserve existing response shapes.

Reference access: web reader inaccessible; HTTP shell downloaded under ignored `var/`; isolated headless browser stopped at Cloudflare verification and was closed. User request for source/features is pending.

Task 1 complete: five new regression tests reproduced the four findings before implementation. All 46 tests now pass. Climate master conflicts stay in regional coverage, including cross-region conflicts and missing IDs. Framework Markdown/text discovery uses snapshot-v3; prior snapshots are unchanged. Invalid provider host/port configurations retain local citations. Non-ASCII malformed credentials return 401.

Ruling: any quarantined grid ID associated with the selected region remains in its expected coverage even if a conflicting record names another region. A missing ID cannot be assigned an invented cell, so it is reported as an unidentified record and prevents complete coverage status.

Reference retry at user request: a second browser run allowed 40 seconds; it still displayed Claude's Cloudflare verification page. Browser closed. No application screens or feature controls were available to inspect.

Task 2 verification: actual-package HTTP smoke passed with snapshot `ds_4c38f4c7072e98741b5330fabe10b598cbdc41640c412c8308c9b6168176ea21`, 41 tables, 15 documents and 474,985 rows. Framework retrieval and source-document resolution passed. Freight totals unchanged; the server stopped. Compilation passed. One fresh-context final reviewer is inspecting the four fixes and adjacent cases.

Final review: independently passed 28 affected-module tests and checked adjacent provider/import behavior. Accepted an important adjacent climate finding: known regions with only quarantined or unidentified cells should return insufficient-data diagnostics, not an unknown-region error. Two regressions reproduced that behavior before changing the early rejection to genuinely absent regions only.

Final: minor (deferred): provider hostname validation accepts whitespace before HTTPX attempts the request; invalid transport still falls back with local citations. Strict hostname syntax validation is additional configuration polish, not required for the targeted malformed-host/port fallback repairs.

Final: Ruling: prototype feature alignment remains dependent on accessible source; production identity/deployment, complete corporate/yield/nutrient models, broader RAG and live-provider interoperability are outside this stabilization increment. Retain the existing documented scope instead of claiming those systems were delivered. Cost if scope is misunderstood: unsupported demo or production claims; capability labels and this ledger make those limits explicit.

Final: fixed the accepted known-region climate finding — two tests RED to GREEN; final suite 48/48 passed. Known regions with only unusable records return insufficient-data output and diagnostics; genuinely absent regions retain input rejection.

Task 2 complete: final compilation and actual-package HTTP smoke passed after the climate fix. The snapshot still has 41 tables, 15 documents and 474,985 rows. The framework citation resolves to original text; the previous snapshot's 14 documents and 474,985 rows remain intact. SQLite integrity is `ok` with no foreign-key errors. The temporary server stopped. No external provider call, frontend edit or deployment was made.

Overall user objective remains pending: accessible prototype content is still required to implement its specific feature set. This stabilization plan is complete; it does not claim that feature alignment has been delivered.

Subsequent update: the user provided the local Navigator ZIP. The feature-reference blocker is resolved; the implementation and verification are tracked separately in `navigator-feature-progress.md` and `navigator-api-contract.md`.
