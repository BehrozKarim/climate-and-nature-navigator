# Analyst-signed evidence receipts

The backend and connected Review screen support wallet-signed assessment receipts on **Solana Devnet**. A receipt proves exact exported report bytes and signing-wallet authorship. It preserves `approved_for_demo`; it does not certify emissions, analyst accreditation or investment approval.

## Run

Install the updated dependencies before starting the app:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m weatherlens_backend
```

In another terminal, run `npm ci` and `npm run dev` from `frontend/`. Open `http://127.0.0.1:5173/?mode=backend#freight`. Import a dataset first, using the existing backend instructions.

The default RPC is `https://api.devnet.solana.com`. Optionally set `WEATHERLENS_SOLANA_RPC_URL` in server configuration to a trusted HTTPS Devnet provider. Prepare/send/confirmation check Devnet's genesis hash; a different-cluster RPC is rejected. RPC credentials stay on the server. There are no server-held signing keys.

## Analyst workflow

1. Calculate a freight route, then click **Save assessment for review**. This recomputes and saves the actual inputs on the server and opens Review. A preview alone creates no reviewable run.
2. Select the saved calculation, add a note and approve it for the demo. Blocked calculations and published inventory context cannot be signed.
3. Unlock a browser wallet implementing Wallet Standard `standard:connect` and `solana:signTransaction` for legacy Devnet transactions. Choose it in the receipt panel. The account needs Devnet SOL for fees; obtain test funds from the [official Solana faucet](https://faucet.solana.com/).
4. Click **Sign evidence receipt**. The backend freezes the exact approved revision; the wallet displays a Memo-only transaction. Confirm in the wallet if the details are correct. Wallet rejection broadcasts nothing.
5. The receipt remains pending until finalized chain evidence is verified. **Check confirmation** polls again; **Retry same transaction** rebroadcasts the stored identical signed transaction after an ambiguous send or a crash, while its review/lifetime is still valid. An expired receipt needs a new preparation.
6. Download the frozen bundle and use **Verify a bundle file**. Unchanged bytes plus a finalized receipt return verified. A changed number, whitespace, UTF-8 BOM or encoding fails verification. Keep the downloaded file unchanged for the matching-file demonstration.
7. Follow the Devnet explorer link to inspect the public memo. Changing the review later marks older receipts superseded; their frozen versions remain inspectable.

Only the opaque receipt ID and SHA-256 digest enter the memo. Full data and review evidence remain in the protected backend/export. The signing wallet is not proof that its owner is the named reviewer. No mainnet, payments, carbon credits or custom Solana program is added.

## API

All paths below start with `/v1/navigator/datasets/{dataset_id}` and inherit existing configured bearer-token authorization.

| Method/path | Body or response |
| --- | --- |
| `GET /reviews/{review_id}/receipts` | Latest 25 receipts, including earlier review revisions |
| `POST /reviews/{review_id}/receipts` | `{ "expected_version": 2, "wallet": "PUBLIC_KEY" }`; returns 201, digest, memo and unsigned `transaction_base64` |
| `GET /receipts/{receipt_id}` | Saved state, signature, digest, version, wallet, verification and superseded flag |
| `POST /receipts/{receipt_id}/submit` | `{ "signed_transaction": "BASE64" }`; verifies exact prepared message/signature before broadcasting. `{}` retries its stored signed transaction. |
| `POST /receipts/{receipt_id}/confirm` | `{}`; verifies finalized transaction without creating a new signature |
| `GET /receipts/{receipt_id}/bundle` | Metadata plus exact frozen `bundle_json` string |
| `POST /receipts/{receipt_id}/verify` | `{ "bundle_json": "EXACT_FILE_TEXT" }`; returns `bundle_matches`, `verified` and receipt state |

The bundle is canonical UTF-8 JSON with no newline/BOM and a 4 MiB limit. Treat `bundle_json` as file text, not an object to reserialize: reserialization can change number spelling or formatting and therefore the fingerprint. Unknown/cross-dataset IDs return 404; stale/ineligible revisions 409; invalid keys/transactions 422; RPC/network-proof failures 502. Missing finalized evidence never produces a fresh verified result.

## Verification and remaining acceptance

The frontend production build and changed-module Python compilation are the build checks. A live Devnet metadata/SDK probe verified genesis identity, one Memo instruction and a locally signed transaction without broadcasting. A one-off real HTTP demonstration used an ephemeral synthetic database and exercised authorization, approval/version checks, preparation, digest export, altered/BOM file rejection, unsigned-transaction rejection, cross-dataset IDs and supersession; its temporary server stopped.

An independent source reviewer identified rebroadcast recovery and UTF-8 BOM normalization issues; both were corrected. No unit tests were written or run. No transaction was broadcast during development. A real wallet-approved finalized Devnet receipt remains the manual acceptance step. Public RPC can be rate limited and Devnet can reset; this is a prototype, not a permanent archival guarantee.

A standalone browser inspection additionally confirmed the receipt panel, disabled signing without a wallet, safe empty-filter behavior, frozen bundle download, no false verification for an unsigned receipt, BOM-altered file rejection and zero browser page errors. Both temporary previews were stopped. The save-to-review integration received a bounded source review after it was added.

References: [Memo program](https://www.solana-program.com/docs/memo), [Devnet](https://solana.com/docs/references/clusters), [transaction RPC](https://solana.com/docs/rpc/http/gettransaction), [Wallet Standard](https://github.com/wallet-standard/wallet-standard).
