# WeatherLens backend

Solana Devnet analyst-signing receipts are available through Review. See the [receipt setup, API and demo guide](docs/solana-receipts.md). Install the updated requirements before starting; browser wallets retain all signing keys.

A separately runnable Python/FastAPI backend using the challenge brief and synthetic package as source evidence. The challenge brief is the only required company-context document; the transcript and pain-point summary are not required for the snapshot. The frontend connects to this service with `?mode=backend`.

The supplied **Navigator app (interactive)** ZIP now defines the feature contract: seven screens plus search, evidence, review and assistant threads. The [frontend API contract](docs/navigator-api-contract.md) maps every screen/control to requests and response fields. Use calculation previews for live controls and saved runs for evidence/review.

## Run locally

From this directory in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m weatherlens_backend
```

Open **http://127.0.0.1:8000/docs** for the interactive API, **/redoc** for reference documentation and **/health** for status. The default database is `var/weatherlens.sqlite3`. No cloud account or model API key is required for the local workflow.

The supplied dataset and `new documents` folder are auto-detected next to the backend. If you move them, set `WEATHERLENS_DATASET_ROOT` to the directory containing `START_HERE.md` and `data/`, and `WEATHERLENS_DOCUMENT_ROOT` to the documents directory. The `python -m weatherlens_backend` entry point automatically loads `backend/.env`. Explicit terminal environment variables take precedence. Restart the backend after editing `.env`.

The verification run has already populated the local database with the supplied package. On a fresh database, call `POST /v1/datasets/import` with `{}`. The endpoint imports only server-configured paths, not a path supplied by the browser. Repeating an identical import reuses its dataset ID.

## What is implemented

| Company need | Backend behavior | Boundary |
| --- | --- | --- |
| Fragmented source data | Immutable SQLite snapshots, source file hashes, original record numbers, table browsing | 41 CSV tables; document count depends on the supplied package and brief directory; daily parquet, supplier-PCF JSON and workbook excluded |
| Manual freight emissions | Tonnes × recorded km × mode-specific factor, grouped into Scope 3 categories 4/9 | Recorded distances only; endpoints and route geometry are absent |
| Trustworthy calculations | Factor/version references, correction and exclusion issues, duplicate quarantine, persistent calculation runs | Arithmetic validation does not establish the accuracy or completeness of the synthetic input |
| Compare future actions | All 30 actions, ramped annual pathways, conservative overlap adjustment, MACC, costs and a greedy selection shortcut | Illustrative catalogue effects/target proxy; no validated local business case or certified SBTi/FLAG compliance |
| Climate/farming exposure | Complete monthly-season SSP comparison, actual cell coordinates, playback timeline and crop/replacement-premium sensitivity | Crop coefficients are illustrative prototype assumptions, not trained or validated forecasts |
| Nature/geospatial context | Contract-area/catchment joins, ecological state, mitigation sliders, estimated pressure/state ranking and origin context | Coefficients are uncalibrated; company attribution and SBTN priorities remain unvalidated |
| Explain results | Snapshotted document retrieval with excerpts/citations; optional model explanation | Default output is explicitly **extractive, not AI-generated** |
| Review and reproduce decisions | Independent drafts, revisions, optimistic version checks, review records, audit history and JSON briefs | Reviews use declared identities and are marked prototype-only; investment approval is blocked |

`GET /v1/capabilities` reports these boundaries to the frontend. `GET /v1/datasets/{id}/inventory` distinguishes the implemented freight categories from unimplemented full corporate accounting and supplies published-history context. It never presents freight totals as a full company inventory.

## Short API walkthrough

```powershell
$weatherlensUrl = 'http://127.0.0.1:8000'
$datasetResponse = Invoke-RestMethod -Method Post -Uri "$weatherlensUrl/v1/datasets/import" -ContentType 'application/json' -Body '{}'
$freightRequest = @{
  dataset_id = $datasetResponse.dataset_id
  year = 2025
  alternative_factor_id = 'EF-TKM-TRUCK-HVO'
  adoption = 0.5
} | ConvertTo-Json
$freightRun = Invoke-RestMethod -Method Post -Uri "$weatherlensUrl/v1/freight/runs" -ContentType 'application/json' -Body $freightRequest
$freightRun.output
Invoke-RestMethod "$weatherlensUrl/v1/runs/$($freightRun.id)/lines?limit=10"
```

With `WEATHERLENS_API_TOKEN` set, add an `Authorization: Bearer <token>` header to every `/v1` request. The OpenAPI UI supports this through **Authorize**. `X-Actor` records the declared person performing a draft action; it is not an authenticated user identity.

### Gemini and document grounding

The existing explanation adapter can use Google's [OpenAI-compatible Gemini endpoint](https://ai.google.dev/gemini-api/docs/openai). Configure these **server environment variables** before starting the backend:

- `WEATHERLENS_LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai`
- `WEATHERLENS_LLM_API_KEY`: your Gemini API key, kept locally on the server
- `WEATHERLENS_LLM_MODEL`: a compatible Gemini model ID available to your key

The normal backend entry point and local test command automatically load `backend/.env`. The frontend's Ask panel always uses this backend, even when `?mode=reference` selects sample screen data. If a terminal contains older LLM variables, those override `.env`; launch from a fresh terminal to use the file's values.

Retrieval currently ranks real document excerpts using lexical matching. It is not embedding/vector retrieval. With a provider configured, the selected excerpts and optional saved-run context go to the model, which must return supported citation IDs. Without a provider, or on invalid output, it returns excerpts with an explicit extractive label. Citation-ID validation does not prove the factual correctness of every generated sentence.

For company context, import only `Apetit_x_SinceAI_2026_Challenge_Brief_EN_FINAL_2026-11-04.md`. Keep it in the local `new documents/` directory at the repository root, or set `WEATHERLENS_DOCUMENT_ROOT` to a directory containing only that brief. Do not add the transcript or pain-point summary. Package methods and framework guidance are still imported from the dataset itself. A new import retains the selected documents and their hashes in a new immutable snapshot; old snapshots are preserved.

From `backend/`, prepare the local brief directory once (the source file must already be beside the repository README):

```powershell
New-Item -ItemType Directory -Force -Path '..\new documents' | Out-Null
Copy-Item -LiteralPath '..\Apetit_x_SinceAI_2026_Challenge_Brief_EN_FINAL_2026-11-04.md' -Destination '..\new documents\'
```

Set the three LLM fields in `backend/.env`, using the Gemini base URL above, your key and an available text model ID. The following commands list models and start the backend using that file. The key stays on the backend; it is not sent to the browser.

```powershell
.\.venv\Scripts\python.exe scripts/test_llm.py --list-models
.\.venv\Scripts\python.exe -m weatherlens_backend
```

Leave that terminal running. In a **second terminal**, from `backend/`, import/reuse the snapshot and verify retrieval first, then make one real generation request:

```powershell
.\.venv\Scripts\python.exe scripts/test_llm.py --import-dataset --retrieval-only
.\.venv\Scripts\python.exe scripts/test_llm.py
```

The retrieval check must find the brief and never calls the model. The generation check succeeds only when `generation_mode` is `ai_explanation_requires_review`, `provider_status` is `responded`, and factual answers include citations belonging to the selected snapshot. Simple greetings may have no citations. A generic extractive fallback is a failed LLM check, not AI success. Use `--question 'Your specific question'` to test another question. If the API token is enabled, set the same `WEATHERLENS_API_TOKEN` in the second terminal.

For `not_configured`, check all three fields in `backend/.env`, check for old terminal variables overriding them, and restart the backend. For `unavailable_or_invalid_output`, the response includes a safe `provider_error` and, for HTTP errors, `provider_http_status`; check the model/key for 400/401/403, quota for 429, and timeouts or JSON compatibility otherwise. Saving `.env` does not reconfigure an already-running process.

Gemini classifies each request as neutral conversation, a source-based answer, outside scope, or missing evidence. Greetings, identity/capability questions and brief neutral small talk receive natural AI replies without fabricated citations. Factual sustainability answers still require valid supplied citations. Explicit coding/creative-writing requests are redirected before a provider call; other unrelated tasks are classified by Gemini and replaced with bounded Navigator guidance. Missing evidence also produces guidance rather than an invented fact. Guidance uses `generation_mode=guidance_not_ai` and an explicit `answer_scope`, so it cannot be mistaken for a generated source answer.

Finally, run `npm run dev` in `frontend/` and open `http://127.0.0.1:5173/` to test Ask. Refresh the page after importing a different snapshot. Chat recognizes supported origin/destination questions and an explicit cargo mass, then supplies read-only RouteService calculations and factor/model provenance to Gemini. It never treats those coordinate-based route estimates as verified driving distances. Greetings may have no citations; factual answers require cited evidence. Unknown modes or missing route inputs require clarification. No chat request changes the inventory or approves a record.

### Voice conversation with ElevenLabs

Add the settings from [`voice.env.example`](voice.env.example) to the ignored `backend/.env`, then restart the backend:

```dotenv
ELEVENLABS_API_KEY=your_key
ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb
ELEVENLABS_STT_MODEL=scribe_v2
ELEVENLABS_TTS_MODEL=eleven_flash_v2_5
```

Only the key is required; the voice/model values above are defaults. The key needs Speech to Text and Text to Speech permissions and available credits. Choose a voice available to your account when overriding the default. Existing Gemini configuration is still required. No provider key is sent to the browser.

In Ask, choose **Talk to Navigator**, allow microphone access and speak. The browser detects a pause, sends the turn to ElevenLabs speech recognition, posts the transcript to the existing Gemini conversation, and reads the persisted assistant reply with ElevenLabs TTS. Written replies and citations remain in the thread. **Send now** ends a quiet/long turn manually; **Interrupt** stops playback and listens again; **Stop voice** ends capture and returns to typing. Closing the drawer or hiding the tab also stops capture and playback. Each recording is limited to 30 seconds in the browser and 6 MiB at the API; 15 seconds without detected speech stops the session. This is continuous, turn-based voice with manual interruption, not simultaneous full-duplex audio.

The last six messages provide bounded conversation context. Clear follow-ups can reuse the previous route's endpoints and recompute an explicitly supplied new cargo mass through RouteService; source citations remain required. Raw microphone audio is forwarded in memory and is not saved by this backend. Transcripts and answers persist as normal chat messages. Audio and reply text are processed by ElevenLabs, and conversation text/evidence by the configured LLM; provider retention policies apply.

Voice works on HTTPS or localhost in browsers with MediaRecorder, Web Audio and microphone access. Missing configuration, denied permission, provider failures and empty transcripts produce visible errors while typed chat remains available. The backend returns safe provider status messages without exposing keys or raw provider error bodies. The optional bearer-token protection also covers every voice endpoint.

| Endpoint | Purpose |
| --- | --- |
| `GET /v1/navigator/voice/status` | Capability/configuration status, without provider credentials |
| `POST /v1/navigator/voice/transcriptions` | Raw audio body with an `audio/*` Content-Type; returns transcript text |
| `POST /v1/navigator/conversations/{id}/speech?expected_version=N` | MP3 for the latest saved assistant reply; stale versions return 409 |

Speech playback accepts an existing conversation/version, rather than arbitrary text, so it reads the same scoped answer shown in Ask. Provider API details: [speech recognition](https://elevenlabs.io/docs/api-reference/speech-to-text/convert), [speech streaming](https://elevenlabs.io/docs/api-reference/text-to-speech/stream).

| Endpoint | Purpose |
| --- | --- |
| `POST /v1/datasets/import` | Import/reuse a snapshot |
| `GET /v1/datasets` and `/v1/datasets/{id}` | Discover dataset IDs, coverage and source metadata |
| `GET /v1/datasets/{id}/tables/{table}/rows` | Browse original records with `year`, `limit` and `offset` |
| `GET /v1/datasets/{id}/sources/{table}/{row_number}` | Resolve one exact source row |
| `GET /v1/datasets/{id}/documents/{doc_id}` | Resolve a source document snapshot |
| `POST /v1/freight/runs` | Persist freight accounting/sensitivity results |
| `GET /v1/runs/{id}` | Run inputs, summary, method, assumptions and limits |
| `GET /v1/runs/{id}/lines` or `/issues` | Paginated calculation detail |
| `GET /v1/datasets/{id}/actions` | All catalogue actions |
| `POST /v1/actions/compare` | Explicit-objective catalogue comparison |
| `POST /v1/climate/runs` and `/nature/runs` | Persist context analysis with coverage |
| `POST /v1/evidence/search` and `/assistant` | Retrieve evidence or request an explanation |
| `POST /v1/decisions` | Create an independent draft |
| `PATCH /v1/decisions/{id}` | Edit with `expected_version` and typed `changes` |
| `POST /v1/decisions/{id}/submit` | Check readiness and acknowledge evidence |
| `POST /v1/decisions/{id}/reviews` | Record prototype review of a submitted revision |
| `GET /v1/decisions/{id}/audit` or `/export` | Audit events or source-linked JSON brief |

Decision revisions are available with `GET /v1/decisions/{id}?version=N`. A stale write returns **409**, invalid input **422**, missing records **404**, and missing/incorrect configured credentials **401**. Unknown request fields are rejected; client-calculated totals cannot enter a calculation request.

The generated [OpenAPI contract](docs/openapi.json) contains request schemas. The service exposes runtime `/openapi.json`; run `python scripts/smoke.py` to regenerate the saved contract and actual-data verification report after changes.

## Accounting and evidence details

- Imported CSV values remain original strings, including Swedish decimal commas. The Swedish grower feed uses its documented semicolon delimiter and year column. Source row numbers count CSV records starting at 2 after the header.
- Exact duplicate shipment IDs count once. Conflicting shipment/factor IDs are excluded as a group. Nonfinite, negative, incompatible-unit or incompatible-mode measurements do not become zero emissions.
- Recomputed tonne-kilometres replace inconsistent recorded tkm with an explicit issue; original values remain in the snapshot. Inputs cannot distinguish an incorrect recorded distance from a correct one without route evidence.
- Canonical package mode labels `truck-reefer`, `ship-bulk`, `ship-reefer` and `ropax` map to their respective transport families while preserving the original label. Freight HVO sensitivity applies only to ambient trucks; refrigerated trucks retain their supplied factor because no refrigerated HVO factor is available.
- Unassignable year/direction values appear in coverage warnings instead of disappearing. Unmatched positive physical-receipt documents are warnings, **not** confirmed missing legs; credits, services and capex are excluded. A matched document can still lack an additional road/sea leg.
- Climate analysis uses matched grid cells, complete cell-year seasons, day-weighted seasonal temperature and mean seasonal precipitation/PET/hot-day totals. Cells have equal weight. Conflicting regional grid IDs remain in expected coverage and excluded-cell lists; missing grid IDs produce explicit issues and partial coverage. Actual included years are returned.
- Nature joins quarantine conflicting parcel-year assignments before crop filtering and disclose unresolved parcel/catchment joins. Catchment-wide monitored loads remain separate from company-attributed loads, which are unassessed.
- Each calculation run stores inputs and output under its method version. A dataset change creates a new snapshot. Old runs, decisions and evidence continue to resolve against their original snapshot.
- Catalogue L27 is measurement improvement, not physical abatement. Costs are not adjusted by fuel sensitivities, and the assistant cannot turn catalogue design estimates into a validated investment recommendation.

## Review lifecycle

`draft → submitted → approved_for_demo` or `changes_requested`.

Submission needs a selected action, objective, explicit decision request, rationale, owner, at least one alternative and its reason, resolved evidence/run references, and evidence acknowledgement. Run references must belong to the same snapshot. The acknowledgement is a user assertion, not proof that the source was read.

Every mutation increments the version. Editing clears acknowledgement/current review and returns the decision to draft; old revisions and audit events remain. SQLite transactions reject concurrent stale writes. The user can inspect exactly which submitted revision a review addressed.

This local prototype has no accredited-expert identity verification, tamper-resistant external audit log, organisation/RBAC model or production approval authority. `approved_for_demo` makes that boundary explicit. Investment approval requires a validated local business case and is deliberately rejected by the current service.

## Optional AI

Set all three environment variables to enable the explanation adapter:

- `WEATHERLENS_LLM_BASE_URL`: an HTTPS OpenAI-compatible base URL, such as a provider's versioned `/v1` endpoint; no credentials/query string in the URL.
- `WEATHERLENS_LLM_API_KEY`: server-only credential.
- `WEATHERLENS_LLM_MODEL`: provider-supported model identifier.

The model receives retrieved excerpts and a bounded summary of the chosen calculation. It has no tools or authority to edit results or reviews. Citation IDs must match supplied evidence; timeouts, malformed JSON and invalid citations return the labelled local explanation. Citation membership is checked, but claim entailment is not automatically verified. A valid response remains `ai_explanation_requires_review`.

Provider calls can incur usage charges once configured. This build used mocked provider responses for tests; no paid model call was made. RAGFlow, embeddings and new MCP services are not required for this backend.

## Tests and verification

```powershell
python -m unittest discover -s tests -v
python -m compileall -q weatherlens_backend tests
python scripts/smoke.py
```

The smoke script launches a temporary HTTP server on loopback, imports the real local package, runs freight/climate/nature analyses, compares actions, creates/submits/reviews/edits a decision, exports its brief, rejects a stale write and retrieves evidence. It closes the server even on failure. It stores the snapshot and demo records locally and updates [smoke-result.json](docs/smoke-result.json).

Tests cover known independent arithmetic, duplicates and invalid numbers, source versioning, mixed CSV dialects, missing climate periods, nature attribution/joins, concurrent decision updates, API validation/authentication and provider fallback. [Independent review](docs/code-review.md) records the findings and their follow-up status.

Original verification on 2026-11-07: **84 tests passed**, compilation passed, and the actual-package HTTP workflow passed for both the original API and all seven Navigator screen families. That verification snapshot contained **474,985 rows across 41 tables and 15 documents**, including the searchable framework digest. The freight run included all **2,339 selected 2025 records**, with zero exclusions. SQLite integrity passed and prior snapshots remain intact. The [Navigator delivery review](docs/navigator-feature-review.md) records the independent findings, regression fixes and remaining scope. New local snapshots follow the brief-only company-context instructions above.

The local ZIP resolved the earlier Claude-link access problem. Its screens and controls are mapped in [navigator-api-contract.md](docs/navigator-api-contract.md), with implementation choices in [navigator-feature-design.md](docs/navigator-feature-design.md). The backend supports a later visual redesign through stable REST operations.

## Separation and future deployment

This directory owns the API, database and tests. `../weatherlens` continues to own the existing UI and hosted site. No frontend or hosted deployment was changed, and no server remains running from verification. Frontend integration can use the REST contract and configured CORS origins.

For a shared deployment, use HTTPS, set the bearer token, and add proper identity/RBAC before treating reviews as authenticated approvals. The provided entry point refuses a non-loopback bind without a token. OpenAPI/health are public. For Azure adoption, the API can run on an application/container host; replace SQLite with a managed relational store and source storage with versioned object storage, then add Entra ID and the chosen AI endpoint. No Azure infrastructure has been created.

Data attribution: synthetic Since AI 2026 challenge package, CC BY 4.0 where specified by its source licence. The separately licensed original workbook is not copied or imported. Source excerpts and dataset attribution stay attached to their records.
