# Navigator frontend

For Solana receipts: save a Freight assessment for review, approve it with a note, then use **Sign evidence receipt** in Review with a Devnet-funded compatible wallet. See [setup and verification](../backend/docs/solana-receipts.md). Wallet keys stay in the wallet.

React/Vite implementation of `Navigator app (interactive)-html-v3`. All seven screens use the reference's colors, fonts, spacing, SVG charts, map geometry, motion and controls. The app uses ordinary React components; it does not load the design tool's runtime or templates.

## Run

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/`. The default app uses the backend for its connected workflows and live AI chat. Start the backend first using its README. An explicit `?mode=reference` opens the design preview with sample screen data. Ask always calls the backend, including in this preview; it has no canned chatbot. The challenge brief remains a local, ignored input.

Use the rail to navigate, or link directly to `/#freight`, `/#inventory`, `/#pathways`, `/#climate`, `/#nature`, `/#review`. Ctrl/Cmd+K opens search; Escape closes drawers. Pathway start handles support arrow keys as well as dragging. Maps support pan, zoom, picking and layer controls.

In Freight, choose **Your route** to select From and To from the supported location menus. They contain all 20 configured places, grouped geographically, and support native keyboard type-ahead. Connected mode loads the live backend catalogue; design mode uses a matching offline copy. Each leg shows its mass × distance × factor calculation. HVO and rail substitutions apply to dry truck legs; refrigerated legs retain their existing modes. Alternative routes and their operational feasibility remain illustrative.

The supplied pathway action grid exceeds a narrow phone viewport. That reference behavior is retained for design fidelity; a contained horizontal scroll treatment or stacked mobile layout is a proposed follow-up, not an applied redesign.

## Backend connections

Start the service using [the backend instructions](../backend/README.md), then import the local challenge package once:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/v1/datasets/import -ContentType application/json -Body '{}'
```

Open `http://127.0.0.1:5173/#inventory` to use the connected workflows (`?mode=backend` remains supported). It selects the most recently imported immutable snapshot. Missing datasets and connection failures show an error and retry action; they do not silently substitute sample values. Only `?mode=reference` opts into the offline design demo.

| Workflow | Current connection |
| --- | --- |
| Emissions | Snapshot-backed scope values, both history charts, available years, restatements, feed counts, supplier counts/accessibility/evidence, deterministic findings and persisted dispositions; unavailable and partial supplier coverage are explicit |
| Freight | Live location catalogue, route lookup, debounced shipment/alternative previews, per-leg arithmetic, factor/source trace and coordinate handoff; annual shipment chart retains the v3 sample |
| Review | Human-readable assessment titles, saved results/inputs, per-leg arithmetic, original source rows, blockers, selected-item review history, evidence downloads, version checks and demo-review/receipt controls |
| Search | Snapshot entity search and original row evidence |
| Ask | Persistent Gemini/backend conversations in both views, ElevenLabs voice turns, neutral introductions/capability replies, document citations, route/cargo context, explicit provider errors and redirects for coding/unrelated requests |
| Overview, Pathways, Climate risk, Nature | Complete interactive v3 design screens; live scenario data adapters are still to be connected |

The connected view labels its remaining sample content. Published source context is distinct from a local demo approval. No owner notification is sent. Routes are illustrative estimates. Backend review actions require a note and use the declared identity `Local demo analyst`; they do not grant production approval.

Emissions year bars reuse the loaded snapshot history and keep the screen, chart nodes and keyboard focus in place. Restated responses and selected drafts are cached separately; uncached requests show a small status message and retain the explicitly labelled previous selection until they finish. Retry preserves the screen, superseded requests are cancelled, and saving a finding disposition clears cached responses.

**Data sources** lists references used by this page: published inventory/history, draft checks, supplier coverage and boundary context. Each card shows its filename, full-file row count, purpose and import status. Inspect source resolves the referenced original rows and shows the snapshot hash; supplier coverage uses table-level provenance. These reported scope totals are not reconstructed from operational activity files. Imported status and a matching file hash do not establish that the underlying figures have been independently validated.

Vite proxies `/v1` and `/health` to `http://127.0.0.1:8000`, so browser requests use the frontend origin. Set `NAVIGATOR_BACKEND_URL` before starting Vite to use another local service. For deployment, configure an equivalent reverse proxy. The optional API token belongs in an authenticated runtime integration; never bake a server token into a Vite build or commit credentials.

## What Review is for

Review is the evidence and decision queue for saved calculations, source-data problems and organisational-boundary events. An analyst checks the result and its evidence, records a note, and approves the demo assessment or requests changes. Published inventory context is informational; blocking source issues require correction and a new assessment. Changing shipment inputs means returning to Freight and saving a new calculation.

The connected view loads the selected review's existing backend export and original source rows. Freight items show the route, cargo mass, distance, saved emissions, per-leg mass × distance × factor arithmetic, factor version/source and distance limitations. Source findings show the reported values that caused the problem. Published inventory and boundary events show their original records. Recorded review notes and the audit trail belong to the selected item. Missing source values remain unavailable.

Evidence requests are bound to the selected item, revision and dataset; changing selection cancels stale requests. Approval stays unavailable until that evidence has loaded successfully. The display does not rewrite saved calculations or frozen Solana receipt bundles. **Download current review data** exports the current review; use the receipt panel's separate **Download frozen bundle** for signed-file verification. The original reference-mode mockup retains its sample summaries.

## Voice in Ask

Configure ElevenLabs using the backend README, open Ask and select **Talk to Navigator**. After microphone permission, speak naturally and pause. Navigator displays your transcript, generates its normal grounded Gemini reply, speaks it with ElevenLabs and listens for the next turn. **Send now** submits a turn manually; **Interrupt** stops speech and listens again; **Stop voice** returns to typing. Closing Ask or hiding the tab ends microphone capture and playback. Audio starts only after the user chooses Talk.

Voice uses browser MediaRecorder and Web Audio on HTTPS/localhost. Microphone tracks are muted during processing/playback to avoid transcribing Navigator's own reply. Unsupported browsers, denied permission and provider errors leave typed chat usable. Speech requests use the same in-memory API token as other backend calls; ElevenLabs/Gemini credentials stay on the server. Voice also works in reference mode, using the live backend conversation rather than the sample screen values.

## Checks

```powershell
npm test
npm run build
```

Tests cover API errors, preview-only requests, empty datasets, stale-write conflicts, coordinate order and rendering all seven screens without the design runtime. `npm run build` creates `dist/`; `npm run preview` serves the production build for design inspection. API proxying is configured for development; a production host needs its own proxy.

`public/demo/` contains only the three compact display fixtures supplied with the v3 mockup. These are required application assets, not the raw challenge dataset. The raw CSV/Parquet package, source documents, ZIP and old UI stay ignored at the repository root. `public/vendor/` retains the supplied map renderer and Three.js bundle, with its MIT license.
