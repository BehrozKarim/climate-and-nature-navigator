# Inventory source consistency

User-authorized fix, 2026-11-07. Do not write or run unit tests.

## Design

Connected Inventory must construct its own view model from one inventory API response instead of inheriting the design preview's sample values and evidence. Keep the existing screen layout. Both history charts, available years, scope values, supplier numerator/denominator, accessibility text and evidence must use that response. Missing or partial supplier information must be explicit. Published source context is not local approval. Draft warnings must describe actual backend status without asserting an unproven cause.

Reusing the sample view model with selective overrides caused this defect; a separate backend view model prevents further sample inheritance. The disconnected design preview retains its own values.

## Implementation plan

- [x] Replace connected Inventory's sample inheritance and animations with snapshot-derived fields, charts and source traces.
- [x] Parameterize shared Inventory labels and evidence status presentation; retain preview defaults.
- [x] Document the team's actual Entire capture/sharing status and colleague workflow, without uploading sessions or claiming measured savings.
- [x] Run the production frontend build, inspect the final diff and request a source-only review. Do not write/run unit tests or publish changes.

## Review focus

Check absent/empty supplier sources, partial coverage, zero counts, non-preview inventory years, restatement changes, stale requests and draft status. Entire status is observed local evidence, not proof of hosted checkpoint availability.

## Working decisions

Keep the existing independently cloned repository and its dependencies. Work on local branch `fix/inventory-source-evidence`. This task does not change checkpoint destinations, enable uploads, attach old transcripts or merge a Trail.

## Verification and handoff

- Final `npm.cmd run build`: exit 0; Vite 6.3.6 transformed 33 modules and produced the production bundle.
- `git diff --check`: passed. No unit tests were added or run. No browser/runtime checks were performed.
- A fresh read-only reviewer found no material issues across missing/empty suppliers, zero counts, source references, non-preview years, restatements, lifecycle and request sequencing. Corrected its minor wording observation: partial supplier coverage can reflect more than conflicting records.
- A request sequence guard rejects superseded responses even when year/restatement choices return to an earlier key.
- Subsequent user-authorized publication: committed as `2994c24` and pushed to both the team repository and connected fork on `fix/inventory-source-evidence`; Entire Trail #2 links that branch. No main merge, historical session import or captured-checkpoint upload was performed. The user later explicitly approved future automatic checkpoint sharing to the public fork; settings and teammate instructions record that approval. Brain local setup and authored-memory recall now work, without hosted memory sync.
- Graph was used successfully by the implementer. The reviewer encountered sandbox denial reading `.git` and used direct inspection for its affected queries.
- Review filter selection and Freight detail consistency from the earlier source review remain separate tasks.
