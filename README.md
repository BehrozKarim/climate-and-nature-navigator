# Climate and Nature Navigator

The Review workflow now supports analyst-signed **Solana Devnet evidence receipts**. Save a Freight assessment, review it, sign its frozen evidence fingerprint with a browser wallet, and verify the exported bundle. See the [receipt guide](backend/docs/solana-receipts.md) for setup and the remaining live-wallet acceptance step.

A Since AI 2026 hackathon project exploring how to assess climate and nature impacts across a food supply chain under different climate scenarios.

## Frontend

The React/Vite app in [`frontend/`](frontend/README.md) follows the supplied **Navigator app (interactive)-html-v3** design across Overview, Emissions, Freight, Pathways, Climate risk, Nature and Review.

```powershell
cd frontend
npm ci
npm run dev
```

After starting the backend and importing a snapshot, open `http://127.0.0.1:5173/` for the connected emissions, freight route, review, search and Ask workflows. Configure Gemini in `backend/.env` and restart the backend for AI responses. The design preview requires `?mode=reference`; its Ask panel also uses the live backend. Scenario screens and the annual freight comparison currently retain the design's sample data. See the frontend README for the integration status and checks.

Only `backend/` and `frontend/` contain tracked application files. The old `freight-ui/`, raw challenge data, design export and source-of-truth documents remain local and ignored; Git's root metadata and this README are retained.

## Backend

The standalone Python/FastAPI service is in [`backend/`](backend/README.md). It supports Overview, Inventory, Freight, Pathways, Climate risk, Nature and Review, plus search, source evidence and assistant threads.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m weatherlens_backend
```

Open http://127.0.0.1:8000/docs for the API. See the [frontend API contract](backend/docs/navigator-api-contract.md) for integration and the [delivery review](backend/docs/navigator-feature-review.md) for model assumptions and verification.

### Input data and configuration

Challenge datasets, company documents, the reference ZIP, local databases and credentials are not included. The service can start and its tests can run without those external inputs. To import the challenge data, place its package root (containing `data/` and `docs/`) in `dataset/` at the repository root, or set `WEATHERLENS_DATASET_ROOT` to its absolute path. Set `WEATHERLENS_DOCUMENT_ROOT` to the company brief directory if available.

Runtime storage defaults to `backend/var/` and is ignored by Git. `backend/.env.example` lists environment settings; it is a template, not an automatically loaded file. AI explanations are optional and require server-side provider configuration. Local evidence retrieval works without a model key.

### Verification

From `backend/`, run `python -m unittest discover -s tests -v`. The suite contains 84 passing tests with temporary synthetic fixtures. The real-package HTTP check is `python scripts/smoke.py` after configuring the external challenge inputs; it owns and stops its temporary server.

Scientific sensitivities and route lookups are labelled estimates. Published inventory context, local prototype review and validated business impacts remain distinct.

### Entire development tools

Navigator uses Entire Graph for code discovery and Codex session hooks for context capture. The [team handoff guide](backend/docs/team-entire-handoff.md) covers push-time checkpoint sharing to the connected fork, Brain decisions and Trail review. Every teammate must enable their own hooks and clone-local sharing policy. See the [Entire workflow and capability status](backend/docs/entire-workflow.md) for observed evidence and limits. These tools are optional for running the app.
