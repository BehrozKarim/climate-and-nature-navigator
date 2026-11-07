# Apetit Climate Decision Studio

Open **Apetit-Decision-Studio.html** in a browser. The standalone build bundles the data, type and interactive screens. Run `npm ci` and `npm run export` here to regenerate it. For development use `npm run dev`. For an HTTP-hosted static build use `npm run build`.

## Requirements and source hierarchy

The challenge brief `Apetit_x_SinceAI_2026_Challenge_Brief_EN_FINAL_2026-11-04.md` and `Transcript_AUDIO-2026-11-06_unverified.txt` define the product requirements. The automated transcript is unverified. `Apetit-Pain-Points.md` summarises those requirements. Interpret package methods, tasks, scoring and synthetic data as support for those needs.

The main workflow addresses the described manual freight calculations and missing documentation. Broader pathway, farm-risk, nature and evidence screens support the future decisions requested in the brief. Package task codes are kept in this technical guide and export conventions.

## Interactive shipment journey

The home screen guides transport, load, distance, evidence and review. Each validated input moves the truck or vessel to the next stage. Missing calculation inputs show a pending value. Weight accepts tonnes and kilograms with conversion that preserves physical mass. The scene represents completion of the record.

The Three.js orthographic scene renders texture planes for the landscape and vehicles, plus a shader water surface and a vessel wake. Camera and vehicle positions follow the form state. It renders while movement or the water effect is active, stops when the document is hidden, and snaps to current state when paused or reduced motion is requested. An equivalent image composition and all form controls remain available without WebGL.

Calculations use tonnes × kilometres × the mode-specific synthetic 2025 factor. Recorded distance examples cite their source shipment. Estimated distances require an assumption. The scenery does not infer a route or provide a measured distance. Approval freezes the entered units, converted mass, distance, factor, source, reviewer and timestamp into a browser-local record. New intake records have their own ledger, separate from the package freight inventory.

The arrival screen offers an illustrative alternative at the same tonne-kilometres. Carrier feasibility, pricing and route evidence need review before implementation.

If browser storage fails, a persistent session-only notice remains through approval and ledger navigation. Downloading a reviewed record still works. The visual total counts up; a separate screen-reader status announces the settled result once.

### Browser verification

Checked the standalone file in real Chrome with WebGL enabled and disabled. The checks cover vehicle movement after valid inputs, truck and vessel calculations, kg/tonne conversion, incomplete inputs, estimated-distance assumptions, review and reload, reduced motion, 390px mobile layout, session-only storage failure and JSON download. The reference calculations are 24 t × 340 km × 0.092 = 750.72 kg CO₂e and 1,850 t × 305 km × 0.013 = 7,335.25 kg CO₂e. Production and standalone builds both pass.

## Challenge-track previews

| Track | What to try | Data and limits |
|---|---|---|
| **A1 and A2** | Run the example agent, investigate a source flag, approve a freight correction and export the audit. | Data checks and inbound freight use the supplied raw feeds. Group inventory values are separate simulated placeholders. |
| **B1 and B2** | Switch base year, boundary and transition scenario, then select levers to compare indicative abatement and cost. | Uses catalogue lever values and 2030 transition prices. Baselines and projections are illustrative. |
| **C1, C2 and C3** | Choose a crop and region, inspect seasonal parcel rows or switch physical scenarios, then change contract area to price replacement exposure. | Yield and poor-harvest values are simulated. Prices and import premiums are from the supplied 2025 reference table. |
| **D1 and D2** | Select a ranked catchment to see nutrient loads, water condition and the next investigation step. Open regional maps when location matters or screen an import origin. | Uses the six public development load rows, synthetic geometries and indicative origin table. Ranks and medians apply to the displayed subset. |
| **E** | Ask about freight, FLAG, Foodhills, SBTN or ESRS, open the cited local source and record an expert review. | Curated local retrieval simulation with browser-local review. No model or service is contacted. |

The Review queue starts with the highest-impact unresolved freight flag, its owner and the estimated coverage change. Source checks run on demand. Projections and framework answers are UI simulations with source and review controls. The sea-freight answer uses the current calculated shipment total and invalidates its review badge when the underlying total or coverage changes.

## Reproduce the data

From this directory, run `python prepare_data.py --validate`. If the package was extracted elsewhere, pass `--package` followed by the path to the unzipped `APETIT_CLIMATE_NATURE_NAVIGATOR_2026` folder. The script reads the raw CSV and JSON feeds and writes `sample.js`. It leaves the input files intact.

**Attribution** · Apetit Climate & Nature Navigator synthetic dataset, Since AI ry 2026 (CC BY 4.0). Derived data uses the version 1.0.0 synthetic package. The original workbook and unpublished answer keys are outside this workflow.

## What it does

- **Data checks (A1 subset).** Finds likely missing sea legs, repeated purchase receipts, unusually changed invoice currencies, missing or extreme meter readings, supplier declarations with incompatible units or reference periods, and repeated travel bookings. The check descriptions expose the matching criteria. Credit notes, purchases in tonnes, and partial-year new meter series have explicit handling. Export candidates in the A1 template format. Reviewers can dismiss false positives or record an evidence-based disposition.
- **Inbound freight (A2 slice).** Calculate Scope 3 category 4 from recorded inbound tonne-km multiplied by the matching 2025 factor. Invalid input is held out. The inventory shows the recorded baseline separately from approved additions. Select a mode to inspect included rows, or export the full leg audit and review log.
- **Fuel test.** Compare standard diesel with HVO100 at a chosen share of the eligible recorded tonne-km. The model keeps distance and mass fixed and excludes refrigerated trucks, ships and ferries. A carrier quote is needed for cost. A premium per 1,000 tonne-km can be entered to model the cost impact.

## Review a freight flag

1. Open the highest-impact freight flag on **Review queue**. See the recorded road leg and comparable historical rows.
2. Choose **Review correction**. Add a verified distance and carrier reference or use the historical median as a clearly labelled estimate. The form previews how it changes the inventory.
3. Record a reason and acknowledge the evidence before approving. The approved leg is added separately. It increases coverage, and its basis, factor, reviewer and timestamp are retained.
4. In **Freight inventory**, select **Export leg audit** and **Export decisions** to reproduce the working estimate and inspect its source trail.

### Freight estimation method

For a current purchase with one recorded road leg, match prior receipts on origin country, receiving site and material. Flag a likely missing leg when there are at least five comparable receipts and at least 90% contain the same sea or ferry factor. Suggest the median recorded sea distance and reuse the mass of the road leg. The package does not include route coordinates or port endpoints. A carrier document can replace the estimate before approval. The inventory uses the well-to-wheel transport method in the package methodology, §4.

### Validation and scope for the calculated inventory

Against the public dev labels, all 26 flags matched in each of 2023 and 2024. The full A1 scores were 42.28 and 40.31 because other issue types are outside these rules. The 31 flags in 2025 are candidates pending review. Inbound freight is the calculated A2 line, while the group inventory is a separate UI preview. The fuel test is a separate sensitivity check on recorded freight activity.

Reviews are simulated and stored in the current browser. Production use would require governed inputs, reviewer identities, versioned inventory publication and access controls. See the package `START_HERE.md`, `docs/TASKS_AND_SCORING.md`, `docs/METHODOLOGY.md` and `docs/AZURE_FABRIC_QUICKSTART.md` for the broader challenge and deployment context.

## Visual treatment

The shipment workspace uses a coastal scene, generated truck and vessel cutouts, blue actions and a guided form. Other screens use labelled charts and progressive disclosure. Reduced-motion preferences preserve state and suppress transitions.

The built-in ImageGen tool generated `assets/truck.webp`, `assets/vessel.webp` and `assets/coast.webp`. Each source was converted to WebP for the project. The truck and vessel prompts requested photorealistic right-facing side-profile cutouts with transparent backgrounds, navy vehicle bodies, no text or logos and no scenery. The coastal prompt requested a panoramic fictional Nordic coastline with a straight horizontal road at roughly two-thirds height and calm Baltic water in the lower quarter, without vehicles or UI.

