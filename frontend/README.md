# Navigator frontend

React/Vite implementation of `Navigator app (interactive)-html-v3`. All seven screens use the reference's colors, fonts, spacing, SVG charts, map geometry, motion and controls. The app uses ordinary React components; it does not load the design tool's runtime or templates.

## Run

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/`. This default **design preview** reproduces the supplied v3 sample values and interactions. It runs without the backend. The source brief, transcript and pain-point summary remain local, ignored inputs.

Use the rail to navigate, or link directly to `/#freight`, `/#inventory`, `/#pathways`, `/#climate`, `/#nature`, `/#review`. Ctrl/Cmd+K opens search; Escape closes drawers. Pathway start handles support arrow keys as well as dragging. Maps support pan, zoom, picking and layer controls.

The supplied pathway action grid exceeds a narrow phone viewport. That reference behavior is retained for design fidelity; a contained horizontal scroll treatment or stacked mobile layout is a proposed follow-up, not an applied redesign.

## Backend connections

Start the service using [the backend instructions](../backend/README.md), then import the local challenge package once:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/v1/datasets/import -ContentType application/json -Body '{}'
```

Open `http://127.0.0.1:5173/?mode=backend#inventory` to use the connected workflows. This explicit mode keeps design review reproducible while the remaining integrations are built. It selects the most recently imported immutable snapshot. Missing datasets and connection failures show an error and retry action; they do not silently substitute sample values.

| Workflow | Current connection |
| --- | --- |
| Emissions | Snapshot-backed scope values, both history charts, available years, restatements, feed counts, supplier counts/accessibility/evidence, deterministic findings and persisted dispositions; unavailable and partial supplier coverage are explicit |
| Freight | Backend route lookup, debounced shipment preview, factor/source trace and coordinate handoff; annual shipment chart and alternative-fuel comparisons still use v3 design assumptions |
| Review | Source-backed queue, filters, declared demo review with notes, version checks, blocked approval protection and persisted audit trail |
| Search | Snapshot entity search and original row evidence |
| Ask | Persistent backend conversations, source citations, explicit extractive/AI response labels and error feedback |
| Overview, Pathways, Climate risk, Nature | Complete interactive v3 design screens; live scenario data adapters are still to be connected |

The connected view labels its remaining sample content. Published source context is distinct from a local demo approval. No owner notification is sent. Routes are illustrative estimates. Backend review actions require a note and use the declared identity `Local demo analyst`; they do not grant production approval.

Vite proxies `/v1` and `/health` to `http://127.0.0.1:8000`, so browser requests use the frontend origin. Set `NAVIGATOR_BACKEND_URL` before starting Vite to use another local service. For deployment, configure an equivalent reverse proxy. The optional API token belongs in an authenticated runtime integration; never bake a server token into a Vite build or commit credentials.

## Checks

```powershell
npm test
npm run build
```

Tests cover API errors, preview-only requests, empty datasets, stale-write conflicts, coordinate order and rendering all seven screens without the design runtime. `npm run build` creates `dist/`; `npm run preview` serves the production build for design inspection. API proxying is configured for development; a production host needs its own proxy.

`public/demo/` contains only the three compact display fixtures supplied with the v3 mockup. These are required application assets, not the raw challenge dataset. The raw CSV/Parquet package, source documents, ZIP and old UI stay ignored at the repository root. `public/vendor/` retains the supplied map renderer and Three.js bundle, with its MIT license.
