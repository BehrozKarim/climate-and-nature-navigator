# Solana analyst receipt implementation plan

> Execute inline using executing-plans; one independent source review follows integration. User explicitly forbids writing/running unit tests, overriding skill test steps.

**Goal:** Deliver the approved analyst-signing Devnet receipt flow.
**Architecture:** SQLite stores immutable bundles and transaction identity; a bounded RPC adapter prepares and verifies signed Memo transactions; Wallet Standard keeps keys in the browser wallet.
**Tech stack:** Existing FastAPI/Pydantic/HTTPX/SQLite/React/Vite, Python solders and the Wallet Standard app registry.
**Spec:** [solana-receipt-design.md](solana-receipt-design.md).

## Constraints and review focus

Devnet only; no private keys, mainnet or unit tests. Preserve existing approval semantics. Check stale review writes, cross-dataset IDs, transaction/message substitution, signature reuse, RPC uncertainty, missing finality, export tampering, wallet rejection and refresh persistence. No automatic code push/merge or public transaction is required by this implementation task.

## Tasks

- [x] Add receipt persistence, pinned runtime dependency and Devnet RPC adapter; build unsigned transactions with one signer and only a Memo instruction.
- [x] Add receipt prepare/list/get/export/submit/confirm/verify services and authenticated API routes; enforce immutable revisions, byte equality, signature validation and finalized-chain checks.
- [x] Add Wallet Standard discovery/signing and a Review receipt panel with reload, download, explorer and imported-file verification.
- [x] Document setup and actual limitations; compile changed Python, build frontend and perform targeted manual API/RPC checks without a unit test runner.
- [x] Obtain one fresh source-only review, resolve material findings, and record evidence in this ledger and shared Brain.

## Execution ledger

- Preflight: work in existing independent checkout, branch `feature/solana-analyst-receipts`, base `a453e69`. No unrelated checkout changes were present.
- Ruling: retain the existing checkout and dependencies; do not create a separate worktree or touch the unrelated ancestor repository.
- Ruling: user authorization covers the design and immediate implementation; no additional design/plan approval is needed. User's no-unit-tests instruction overrides TDD and full-suite skill steps.
- Ruling: reconcile Review selection against its visible filter before adding signing; an empty queue must expose no stale signing/approval target.
- Ruling: add the missing Freight save-to-review action so the approved browser flow can create a persisted assessment. The server recalculates captured inputs, and navigation follows successful saving. This small integration addition received a bounded source-only review.
- Final source review: fixed missing rebroadcast recovery after durable signature persistence; empty-body submit retries the stored exact signed transaction under review/lifetime guards. Fixed UTF-8 BOM normalization by decoding raw file bytes strictly with BOM preserved. Also validate RPC height/slot types.
- Final build: changed Python modules compiled; Vite 6.3.6 built 38 modules successfully. `git diff --check` passed.
- Manual protocol: live Devnet genesis and blockhash read; one Memo instruction and locally signed wire transaction validated. No broadcast.
- Manual HTTP: anonymous read 401; draft/stale prepare 409; approved prepare 201; unsigned/no-signature retry 422; cross-dataset read 404; altered/BOM bundle mismatch; stale review submission 409; supersession true; SQLite reopen preserved records. Temporary server stopped.
- Browser inspection: receipt panel visible, signing disabled without a wallet, unchanged unsigned bundle not falsely verified, BOM-altered file rejected, empty-filter signing controls absent, panel restored on All, zero page errors. Temporary previews stopped.
- No unit tests added/run. Finalized on-chain acceptance remains a real analyst wallet action; no fake chain result or scientific accreditation is claimed.
