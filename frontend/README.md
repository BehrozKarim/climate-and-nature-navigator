# Navigator frontend

React/Vite interface for the supplied synthetic challenge dataset. All seven screens use the backend. There is no offline design-data mode, sample-result fallback, bundled demo dataset or prefilled design journey. Existing links containing `?mode=reference` also use the backend.

## Run locally

Start the backend using [its README](../backend/README.md), import the local challenge package, then:

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/`. Vite proxies `/v1` and `/health` to `http://127.0.0.1:8000`; set `NAVIGATOR_BACKEND_URL` before starting Vite to change that target. A deployed frontend needs an equivalent authenticated reverse proxy. Keys remain in the backend environment, never in a Vite build.

The newest imported immutable snapshot supplies the data. Backend/data failures show an error and Retry; they never substitute example values. Raw challenge files and local secrets stay ignored.

## Screen connections

| Screen | Data and behavior |
| --- | --- |
| Overview | Backend composition of published inventory, default pathway, climate exposure, contract-parcel context and review state; registered farm/site coordinates from the snapshot |
| Emissions | Supplied published history and draft reports, supplier coverage, actual source references and deterministic checks; year changes preserve charts and focus |
| Freight | Recorded annual shipment arithmetic and fuel sensitivity; separate user-defined route estimates with imported factors, explicit distance assumptions and optional manual mode/distance changes |
| Pathways | All supplied catalogue actions, backend overlap/scope checks, manual/all/greedy selection, user-selected start-year overrides, annual trajectory and costs |
| Climate | Complete monthly weather seasons, historical baseline coverage, scenario exposure timelines, grid coordinates and historical price context |
| Nature | Selected-year registered contract parcels, catchment ecological classes, soil-test coverage, monitored outlet records and indicative import-origin context |
| Review | Immutable saved inputs/results, source inspection/downloads, analyst notes and audit history; approved unblocked calculations can prepare signed Devnet evidence receipts |

Every analytical screen exposes its source files, filters, hashes, method and limitations, and can save an assessment for Review. Preview calculations do not persist runs. Changing scenario, horizon, crop, parcel year, action selection or shipment inputs calls the relevant backend endpoint. Requests are cancelled when superseded; stale responses do not replace newer selections.

## What the numbers mean

The challenge package is a synthetic twin, calibrated to public figures and supplied samples. It is not real operational company data. Published totals are reported context, not a reconstructed full inventory or local approval.

Pathway quantities are the estimates in `decarbonisation_levers.csv`, not frontend mock values. Ramp interpretation, fixed activity, continuing operation and conservative overlap groups are explicit backend assumptions. Annual emissions can plateau after all selected measures reach full effect; repeatedly subtracting the same annual saving would manufacture reductions. The target curve is illustrative and has not established SBTi/FLAG compliance. Incomplete actions are unavailable; data/structural actions do not create physical abatement.

The design reference's crop-response coefficients, fictitious fitted-yield accuracy/confidence bands, per-hectare nutrient coefficients and mitigation sliders were removed. Climate shows weather exposure, not a trained yield or financial-loss forecast. Nature shows source context, not unsupported company-attributed nutrient loads or calibrated SBTN priority scores. Those outputs require fitted/calibrated models with evidence before they can return.

Recorded shipments have tonnes, kilometres, modes and reference documents, but no origin/destination coordinates. Their annual totals are calculated from their rows. The separate route calculator accepts user choices and coordinate-based estimates; it does not reconstruct missing shipment journeys or verify railway/ferry availability. No automatic “Rail + ship” alternative is assumed. Source-library HVO sensitivity applies only to eligible ambient trucks; refrigerated trucks retain their supplied factors.

Maps use source coordinates. Parcel dots are registered locations, not surveyed parcel/catchment polygons. Missing data remains unavailable; a hash match establishes file identity, not scientific validation.

## Ask and voice

Ask uses backend Gemini conversations and source-linked calculations. Neutral introductions are supported; coding/unrelated requests receive scope guidance. Configure Gemini and ElevenLabs in `backend/.env` using the backend instructions. Select **Talk to Navigator** to start turn-based microphone input and spoken replies; Interrupt and Stop voice remain available. Closing Ask or hiding the tab stops microphone capture/playback. Voice and typed chat share the same grounding and scope rules.

## Verification

`npm run build` creates `dist/`. For this integration, verification uses Python compilation, actual API outputs, original CSV reconciliation and live browser interaction across all screens. No unit tests are written or run without an explicit user request.

See [the integration handoff](../backend/docs/frontend-source-integration.md) for assumptions and verification details. Production wallet signing/finality remains a separate manual acceptance step; the receipt proves association with frozen bytes, not scientific correctness.
