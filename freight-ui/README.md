# Apetit 2025 inventory workbench

Open **Apetit-Freight-Prototype.html** in a browser. The standalone build bundles the derived synthetic data, fonts, landscape and Three.js scene. Run `npm ci` and `npm run export` here to regenerate it. For development use `npm run dev`. For an HTTP-hosted static build use `npm run build`.

## Reproduce the data

From this directory, run `python prepare_data.py --validate`. If the package was extracted elsewhere, pass `--package` followed by the path to the unzipped `APETIT_CLIMATE_NATURE_NAVIGATOR_2026` folder. The script reads the raw CSV and JSON feeds and writes `sample.js`. It leaves the input files intact.

**Attribution** · Apetit Climate & Nature Navigator synthetic dataset, Since AI ry 2026 (CC BY 4.0). Derived data uses the version 1.0.0 synthetic package. The original workbook and unpublished answer keys are outside this workflow.

## What it does

- **Data checks (A1 subset).** Finds likely missing sea legs, repeated purchase receipts, unusually changed invoice currencies, missing or extreme meter readings, supplier declarations with incompatible units or reference periods, and repeated travel bookings. The check descriptions expose the matching criteria. Credit notes, purchases in tonnes, and partial-year new meter series have explicit handling. Export candidates in the A1 template format. Reviewers can dismiss false positives or record an evidence-based disposition.
- **Inbound freight (A2 slice).** Calculate Scope 3 category 4 from recorded inbound tonne-km multiplied by the matching 2025 factor. Invalid input is held out. The inventory shows the recorded baseline separately from approved additions. Select a mode to inspect included rows, or export the full leg audit and review log.
- **Fuel test.** Compare standard diesel with HVO100 at a chosen share of the eligible recorded tonne-km. The model keeps distance and mass fixed and excludes refrigerated trucks, ships and ferries. A carrier quote is needed for cost. A premium per 1,000 tonne-km can be entered to model the cost impact.

## Review a freight flag

1. Open the highest-impact freight flag on **Overview**. See the recorded road leg and comparable historical rows.
2. Choose **Review correction**. Add a verified distance and carrier reference or use the historical median as a clearly labelled estimate. The form previews how it changes the inventory.
3. Record a reason and acknowledge the evidence before approving. The approved leg is added separately. It increases coverage, and its basis, factor, reviewer and timestamp are retained.
4. In **Freight inventory**, select **Export leg audit** and **Export decisions** to reproduce the working estimate and inspect its source trail.

### Freight estimation method

For a current purchase with one recorded road leg, match prior receipts on origin country, receiving site and material. Flag a likely missing leg when there are at least five comparable receipts and at least 90% contain the same sea or ferry factor. Suggest the median recorded sea distance and reuse the mass of the road leg. The package does not include route coordinates or port endpoints. A carrier document can replace the estimate before approval. The inventory uses the well-to-wheel transport method in the package methodology, §4.

### Validation and scope

Against the public dev labels, all 26 flags matched in each of 2023 and 2024. The full A1 scores were 42.28 and 40.31 because other issue types are outside these rules. The 31 flags in 2025 are candidates pending review. The UI calculates only the inbound freight line of A2 and does not emit a full A2 submission. The fuel test covers one lever and does not constitute a transition pathway.

Reviews are simulated and stored in the current browser. Production use would require governed inputs, reviewer identities, versioned inventory publication and access controls. See the package `START_HERE.md`, `docs/TASKS_AND_SCORING.md`, `docs/METHODOLOGY.md` and `docs/AZURE_FABRIC_QUICKSTART.md` for the broader challenge and deployment context.

## Visual treatment

The ImageGen landscape is illustrative. The road and animated trace share a single SVG coordinate system so the trace follows the visible road at different viewport sizes. The animation has a pause control, a reduced-motion state, and lightweight transitions on drill-downs and the fuel slider. The Three.js schematic uses equivalent text controls.

