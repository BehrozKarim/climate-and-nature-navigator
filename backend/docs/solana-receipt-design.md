# Analyst-signed assessment receipts

Approved by the user on 2026-11-07 after selecting the analyst-signing flow.

## Purpose and approach

An analyst reviews a saved Navigator calculation, freezes its evidence and signs a Solana Devnet memo containing the bundle digest. A recipient verifies the bundle against the finalized transaction. Use the existing Memo program and browser Wallet Standard signing; no custom on-chain program or server-held private keys. Supplier attestations and payments remain future work.

## Contract

- Only saved calculation reviews in `approved_for_demo`, with no blockers, can prepare a receipt. Published source context is not an approval. Require the exact expected review version.
- Freeze canonical UTF-8 JSON containing schema version, receipt ID, dataset ID, complete saved run, exact review revision, source manifest and review audit. Retain its bytes/hash permanently; later review changes never rewrite it.
- Each receipt binds one wallet, digest, memo, blockhash and Devnet network. A wallet signature identifies a key, not an accredited expert or organisation. Existing prototype approval limits remain explicit.
- Build an unsigned legacy transaction with only the signed Memo instruction. The analyst pays the Devnet transaction fee. Backend submission accepts only that exact prepared message with a valid signature, so it cannot become a general transaction relay.
- Verify finalized execution, expected signature, signer, Memo program and exact memo bytes against the configured Devnet RPC. An unavailable/pending RPC response never becomes confirmation. Persist submission identity before broadcasting; retry the same signature after an ambiguous network result.
- A changed review prevents new submission of its old prepared receipt. An already published receipt remains valid for its frozen revision and is marked superseded relative to the current review.
- Bundle verification recomputes the canonical digest and checks the chain; modified exports fail. No raw evidence or company documents are put on chain.

## Screen

In backend Review, approved calculation items offer a wallet selector and “Sign evidence receipt”. Show preparing, wallet prompt, pending, finalized, failed and superseded states. A pending receipt can be checked again after restart. Offer frozen bundle download, file verification and a Devnet explorer link. Reference-preview screens keep their existing behavior.

## Boundaries

No mainnet, paid APIs, payments, automatic wallet signing, private-key storage or unit tests. Verify with compilation/build, focused manual API/RPC checks and an independent source review. A real wallet signature is required to demonstrate a finalized on-chain receipt; never fake it.
