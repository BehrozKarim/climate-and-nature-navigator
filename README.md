# Climate and Nature Navigator

A Since AI 2026 hackathon project exploring how to assess climate and nature impacts across a food supply chain under different climate scenarios.

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

Navigator uses Entire Graph for local code discovery, with Codex session hooks configured to keep checkpoints local. See the [Entire workflow and capability status](backend/docs/entire-workflow.md) for setup, verification, and the remaining Brain/hosted Trails requirements. These tools are optional for running the backend.
