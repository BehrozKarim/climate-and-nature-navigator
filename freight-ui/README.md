# Apetit Climate & Nature Navigator

Open **Apetit-Freight-Prototype.html** in your browser. It includes the application, fonts, illustration and Three.js scene. If the file is missing, run `npm ci` and `npm run export` here to regenerate it.

For development, run `npm run dev` and open the local URL it prints. `npm run build` generates a static build under `dist/` for serving over HTTP. The prototype uses the fictional records in `demo-workspace.js`.

## Try the daily workflow

1. On **Overview**, open the animated route card or select **Review 4 open items**.
2. Open **Vessel distance missing** and choose **Add evidence**. The port-distance example fills in a fictional estimate with a source and assumption. Save it for review, then open the record again and review it as the demo reviewer.
3. In **Work queue**, draft the supplier follow-up, mark it waiting or add another record. Filter or search to return to a record.
4. In **Scenarios**, adjust the eligible freight share and save a comparison. **Evidence** keeps both options alongside the history of record changes and approvals.

Records and evidence are stored in this browser. The work queue is a prototype for recurring manual intake and simulated expert review. Production use would require live data connections, identity and reviewer permissions, and governed reporting snapshots.

## Design notes

- The Taste redesign and frontend skills informed the editorial layout, a spruce-and-cream palette, and one prominent entry into the work queue. UI/UX Pro Max informed the clear status labels, task filters, and labelled charts. The Design plugin critique checked hierarchy, responsive layout and contrast.
- The overview route traces the movement of one fictional shipment. It runs without WebGL, can be paused, and stays still when reduced motion is enabled. The Three.js drawer schematic and its text controls expose the two legs. Design Motion Principles informed quick, bounded panel and selection feedback.
- Built-in ImageGen created `nordic-fields.webp` from the prompt below. The photograph is a fictional illustration, separate from the route geometry.

> Create a single 3:2 landscape photographic asset for a premium Nordic food sustainability operations dashboard hero. Edge-to-edge high-end editorial drone photography of a fictional south-west Finland agricultural landscape from an elevated near-overhead viewpoint. Deep spruce green fields with finely textured curved parallel crop lines, a small golden chartreuse rapeseed field for contrast, dark evergreen forest dividers and a winding narrow farm road sweeping through the right half. Landscape is a patchwork of strong organic geometry, textured and lifelike. No horizon, no people, no vehicles, no buildings larger than a few tiny farm roofs, no graphics, no map markings, no text, no UI. Compose most of the crisp lit detail in the middle-right and lower-right, with darker evergreen framing, for a future layout where left half will be covered by a deep evergreen fade and white headline. Warm late-afternoon highlights on crops and dark spruce shadows, cinematic but plausible, quiet Nordic landscape. Premium photographic realism, subtle editorial grading, keep highlight contrast in the right half; no photomontage.

