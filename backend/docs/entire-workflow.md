# Entire development workflow

Entire supports development of Climate and Nature Navigator. It is not a backend runtime dependency and is separate from the app's evidence assistant.

## Verified local setup (2026-11-07)

| Capability | Status and evidence |
| --- | --- |
| CLI | Official Windows release 0.13.1 installed; archive SHA-256 verified against its release checksums. |
| Sessions | Codex's seven project hooks and Git hooks installed. Automatic uploads to the public connected fork were explicitly approved on 2026-11-07 and configured for future pushes. No captured checkpoint has been demonstrated for this task. |
| Graph | Official Windows release 0.6.0 installed and verified. Initial committed-tree index: 58 files, 38 Python files, 690 symbols, 2,510 relations, zero parser failures. Queries found pathway calculations and decision-review implementations/tests. |
| Brain | The previously blocked 0.5.1 executable now runs. Deterministic local setup passed; one Inventory invariant was saved and retrieved with recall and brief. Model backfill, daemon, agent hooks and hosted memory sync remain off. |
| Hosted Trails | Connected fork `rehanali53/climate-and-nature-navigator` is mirrored on Entire. [Trail #2](https://entire.com/gh/rehanali53/-/trails/2) links the Inventory branch; teammate review and merge remain pending. |

The initial Graph figures refer to backend commit `ca4fecdbded727bf333c90b01ddc5921235565d5`. Brain setup at `2994c24` subsequently reported 93 files and 3,625 symbols. These are observed snapshots, not current file-count guarantees.

## Current team handoff

Follow [team-entire-handoff.md](team-entire-handoff.md). The user explicitly approved automatic future checkpoint uploads, including captured prompts, responses and tool outputs, to public fork `rehanali53/climate-and-nature-navigator`. Shared settings now name that dedicated destination and permit uploads; this clone uses the automatic push policy. Each teammate must enable their agent capture/hooks and check local overrides. Historical conversations have not been imported.

The Inventory fix and team guide were first pushed as `2994c24` on `fix/inventory-source-evidence` to the original repository and the connected fork. `main` was not changed. Teammates can fetch/check out that branch; a pull of main alone does not include the fix yet. New Freight/local-AI commits on the original main were inspected but not merged into this feature branch.

Brain setup completed its eight deterministic components in approximately 130 seconds without an agent call. It indexed code/docs/history but retained zero captured sessions. The authored invariant `fact:4c92d7f410d78e3feff90814`, taxonomy `constraints.inventory.source_evidence`, returned from both `recall` and `brief`, with provenance at `2994c24` and links to the fix plan and adapter. The generated Graph-and-Brain agent guide is committed for future agents. Brain remains local and disconnected from hosted memory sync.

Trail #2 is open and linked to the branch. The CLI's mark-ready request reported that readiness is not tracked because the repository's approval gate is disabled; the Trail remains in building phase. No teammate approval or automated hosted review is claimed. Reviewers can use the open Trail to record their assessment.

Observed configuration caveat: CLI 0.13.1 accepted `--skip-push-sessions=false` but preserved an existing local `push_sessions:false`. Explicitly setting that local JSON field to true is necessary in affected clones. Always verify the resulting status rather than trusting the configuration command's success message.

## Use the correct checkout

Run Entire in the independent `climate-and-nature-navigator` Git checkout containing this document and the top-level `backend/` directory. The original workspace source directory sits inside a broader ancestor Git repository; do not enable or index that ancestor.

On this machine the checkout is `weatherlens-backend/var/publish/climate-and-nature-navigator` relative to the SinceAI workspace. The checksum-verified executables are in `weatherlens-backend/var/tools/entire`, added to the user's PATH. Open a new terminal to load that PATH.

## Team sessions and the connected fork

Observed before the later sharing approval and Brain setup on 2026-11-07 (historical baseline):

- `entire status`: enabled for Codex; automatic checkpoint pushing disabled; checkpoints read from `origin`.
- `entire session list`: one ended local Codex session, last prompt `exit`.
- `entire checkpoint list` on `main`: zero committed checkpoints. This does not inventory every branch or the hosted service.
- Graph successfully located `ConnectedInventory`, the Inventory API contract and its callers/dependencies. The query reported no JavaScript parser failures; three minified JSON assets were partial failures in other languages.
- `origin` is BehrozKarim's GitHub repository. Remote `entire` is the connected `rehanali53` fork. This fix is on local branch `fix/inventory-source-evidence`.

Connecting a fork imports code; it does not capture colleagues' agent conversations. Each colleague must enable Entire for their own agent in their own checkout and share the resulting checkpoints. Syncing upstream code into a fork alone is not evidence that upstream sessions have been shared there. A session started outside this checkout is not proven captured by this checkout's hooks.

Choose one team destination. Either have the original repository owner connect that repository to Entire, or have teammates collaborate through the already connected fork and configure a common checkpoint destination. Each teammate needs access to that destination; Git remotes and local settings are per clone. Inspect captured context before sharing it.

For the connected fork, a teammate can run the following from their checkout after installing the CLI, enabling their supported agent and approving its hooks:

```powershell
entire configure --local --checkpoint-remote github:rehanali53/climate-and-nature-navigator
entire configure --local --checkpoint-push-policy manual --skip-push-sessions=false
entire status
```

This is the manual-sharing alternative to the team's current automatic policy. `push_sessions=false` blocks explicit checkpoint uploads too; verify the flag actually changed the setting and correct the local JSON override if it did not. With the manual policy, a Git push does not send checkpoints automatically. Check the destination, do a real task in a captured session, commit it and inspect the checkpoint:

```powershell
entire session list
entire checkpoint list --pending
# After committing the task:
entire checkpoint list
entire checkpoint explain CHECKPOINT_ID
entire checkpoint list --outgoing
entire checkpoint push CHECKPOINT_ID
```

Replace `CHECKPOINT_ID` with the actual ID. The final command is an intentional transcript upload; run it interactively after inspection. CLI 0.13.1 also supports `ID@COMMIT` for a specific inspected version in noninteractive use. Code publication is separate: push the feature branch to the chosen team repository and use its Trail to state the task and review the diff against that intent.

On Entire, a shared session shows the captured prompts, agent responses, tool activity and file changes connected to its checkpoints/commits. Teammates can open the session link during review. A checkpoint must exist and be uploaded before claiming this handoff is demonstrated. No checkpoint or transcript has been uploaded as part of the Inventory fix.

### Challenge demonstration

Use the real Inventory issue: show Graph locating the adapter and API contract, a future captured session explaining the task, the resulting diff/build, and a teammate's Trail review. Brain now recalls the authored Inventory invariant; distinguish that demonstrated memory from automatic extraction of captured sessions, which has not been demonstrated.

For efficiency evidence, compare the same code-discovery task/model with and without Graph and retain actual token usage, output/context bytes and time. Existing query timing is evidence of Graph use, not a measured percentage saving. Do not present the sponsor's 71% figure as this project's result.

References: [official session-sharing walkthrough](https://entire.com/blog/sharing-sessions-is-the-new-social-coding), [CLI source and checkpoint documentation](https://github.com/entireio/cli).

## Another machine

Install the official CLI using the instructions at <https://docs.entire.com/installation>, then follow the [team handoff guide](team-entire-handoff.md) from this repository root. For a local-only setup without sharing, use:

```powershell
entire plugin install graph
entire enable --agent codex --local --skip-push-sessions --telemetry=false --absolute-git-hook-path
entire configure --local --checkpoint-push-policy manual
entire graph setup --repo . --normal --no-claude-hook
entire status
python backend/scripts/verify_entire.py
```

Open the repository in a supported Codex version, approve the installed hooks through `/hooks`, and start a new session in this checkout. Installation does not retroactively capture the earlier conversation. Existing session history was not imported.

### Hook approval in plain language

Hooks are commands Codex runs when a coding session starts, receives a prompt, changes files or finishes. Entire uses those events to record developer context. Hook approval is separate from connecting GitHub to Entire.

Type `/hooks` **inside the interactive Codex CLI**, not at a PowerShell prompt. Review and trust the seven Entire entries from this checkout's `.codex/hooks.json`. Run `entire status` afterward: the warning about unapproved hooks should disappear. Restart Codex in this checkout before the next task so its session-start hook can run.

The VS Code-bundled Codex 0.164.0-alpha.11.1 executable on this machine initially exited with “no complete local package” because its background server could not start. Its own suggested standalone mode fixed startup:

```powershell
codex -C . --no-alt-screen --no-daemon
```

Use a real interactive terminal. The local launcher adds Entire to the process PATH, corrects an inherited `TERM=dumb` for the Windows console, and invokes this standalone mode. It does not grant hook trust or bypass security controls. Passing the launcher's `-CheckOnly` checks startup prerequisites without opening Codex; that check alone does not prove interactive startup or session capture.

After completing a real task and committing it, check capture:

```powershell
entire checkpoint list
entire checkpoint explain CHECKPOINT_ID
```

The local-only commands above keep checkpoints local. The team's approved sharing configuration instead uploads checkpoints to the public connected fork on pushes. Inspect captured context first and verify which policy your clone is using. A private checkpoint destination can be configured separately if needed.

## Code discovery

The generated `.entire/agent-guide.md` is referenced by both `AGENTS.md` and `CLAUDE.md`. Start with Brain for prior decisions, then use Graph to locate code and relationships. Inspect referenced source and use a relevant build/source review. Do not write or run unit tests unless the user explicitly requests them.

```powershell
entire graph query --repo . --head --profile full --format agent --max-context-bytes 4096 --query "pathway calculate conservative overlap scope floors"
entire graph neighbors --repo . --head --format agent --max-context-bytes 4096 --symbol PathwayService.calculate --direction in
entire graph impact --repo . --head --max-context-bytes 4096 --symbol PathwayService.calculate
```

Drop `--head` when investigating uncommitted source changes. Static relationships and ranked search are aids, not proof that every dependency has been found.

## Brain readiness

Reviewed project knowledge is in `entire-project-knowledge.md`. Brain now runs and its local setup/recall have been verified. Reproduce the authored decision without paid classification:

```powershell
entire brain setup --no-backfill --no-daemon --no-agent-hooks
entire brain status
entire brain remember "Connected Inventory must use one snapshot for charts, supplier totals and evidence; missing data stays unavailable and published context is not local approval." --path constraints.inventory.source_evidence --kind invariant --agent none
entire brain recall "inventory source evidence" --json
```

No application-control policy was weakened; the previously blocked executable started successfully when retried. Setup uses no backfill, daemon or agent hooks. Brain memory stays local unless explicitly connected to a hosted repository; bare connect would resolve this checkout through its original `origin`, so inspect an explicit fork target before hosted sharing. Brain v0.5.1 uses CLI integration, not an MCP server. Windows background watcher support is absent in this release.

## Hosted Trails and award evidence

Login with your own account using `entire login --device`. Mirroring the existing GitHub repository requires the repository owner's authorization for the Entire GitHub App; a contributor's Git push permission alone does not grant that installation permission. Check the chosen project, visibility and any billing settings before enabling hosted services.

This checkout keeps `origin` pointed at `BehrozKarim/climate-and-nature-navigator`, while the additional `entire` remote points at the user's connected fork, `rehanali53/climate-and-nature-navigator`, in the EU cluster. Always check the repository namespace before publishing or creating a Trail. Entire rejected a direct push to protected `main`; the setup is submitted through Trail #1 instead. Use a regular branch name such as `navigator-entire-setup`: the Trail API reserves the `entire/` prefix even though a Git push can accept it.

Once connected, create a real feature branch and Trail for an actual task. Use Brain and Graph, capture the new session, run the appropriate allowed verification and review whether the change matches its stated intent. Do not create dummy changes solely to imply adoption.

For an award recording, show:

1. Graph finding the calculation and its callers in this repository.
2. A new captured checkpoint, inspected with `checkpoint explain`.
3. Brain recalling an actual project decision, if it becomes available.
4. A real Trail and its review, if hosted setup is completed.

Run `python backend/scripts/verify_entire.py` for repeatable local checks. The ignored `backend/var/entire/evidence.json` records actual command outputs, latency, byte counts and failures. It does not call a model or upload checkpoints. Report token savings only after a controlled comparison of the same task/model with measured usage; the sponsor's “up to 71%” is not a Navigator result.

Official references: [CLI](https://github.com/entireio/cli), [Graph](https://docs.entire.com/guides/graph/overview), [Codex hooks](https://docs.entire.com/agents/codex), [Brain](https://docs.entire.com/guides/brain/overview).
