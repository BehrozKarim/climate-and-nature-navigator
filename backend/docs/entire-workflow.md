# Entire development workflow

Entire supports development of Climate and Nature Navigator. It is not a backend runtime dependency and is separate from the app's evidence assistant.

## Verified local setup (2026-11-07)

| Capability | Status and evidence |
| --- | --- |
| CLI | Official Windows release 0.13.1 installed; archive SHA-256 verified against its release checksums. |
| Sessions | Codex's seven project hooks and Git hooks installed. User approval verified: `entire status` no longer reports unapproved hooks. Automatic checkpoint uploads remain disabled; no captured checkpoint has been demonstrated yet. |
| Graph | Official Windows release 0.6.0 installed and verified. Initial committed-tree index: 58 files, 38 Python files, 690 symbols, 2,510 relations, zero parser failures. Queries found pathway calculations and decision-review implementations/tests. |
| Brain | Official Windows release 0.5.1 downloaded and checksum verified, but Windows application control blocked execution. Not configured, and no automatic memory extraction runs. |
| Hosted Trails | Connected fork `rehanali53/climate-and-nature-navigator` is mirrored on Entire. [Trail #1](https://entire.com/gh/rehanali53/-/trails/1) links the setup branch `navigator-entire-setup`; review and merge are pending. |

The index figures refer to backend commit `ca4fecdbded727bf333c90b01ddc5921235565d5`, before these workflow files were added. They are not a current file-count guarantee.

## Use the correct checkout

Run Entire in the independent `climate-and-nature-navigator` Git checkout containing this document and the top-level `backend/` directory. The original workspace source directory sits inside a broader ancestor Git repository; do not enable or index that ancestor.

On this machine the checkout is `weatherlens-backend/var/publish/climate-and-nature-navigator` relative to the SinceAI workspace. The checksum-verified executables are in `weatherlens-backend/var/tools/entire`, added to the user's PATH. Open a new terminal to load that PATH.

## Another machine

Install the official CLI using the instructions at <https://docs.entire.com/installation>. Then, from this repository root:

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

Checkpoints stay local. Do not upload transcripts to this public GitHub repository without inspecting them. The shared settings disable automatic uploads; this clone also has the manual checkpoint push policy. A private checkpoint destination can be configured later.

## Code discovery

The generated `.entire/agent-guide.md` is referenced by both `AGENTS.md` and `CLAUDE.md`. Use Graph to locate code and relationships, then inspect the referenced source and run the appropriate real tests before changing behavior.

```powershell
entire graph query --repo . --head --profile full --format agent --max-context-bytes 4096 --query "pathway calculate conservative overlap scope floors"
entire graph neighbors --repo . --head --format agent --max-context-bytes 4096 --symbol PathwayService.calculate --direction in
entire graph impact --repo . --head --max-context-bytes 4096 --symbol PathwayService.calculate
```

Drop `--head` when investigating uncommitted source changes. Static relationships and ranked search are aids, not proof that every dependency has been found.

## Brain readiness

Reviewed project knowledge is in `entire-project-knowledge.md`; it is a normal document, not a fabricated Brain memory. Once a permitted Brain build can run:

```powershell
entire brain setup --no-backfill --no-daemon --no-agent-hooks
entire brain status
entire brain remember "Missing evidence remains unavailable; do not replace missing business quantities with zero." --path constraints.evidence.missing
entire brain recall "missing evidence"
```

Inspect setup help for the installed release before using these commands. Keep extraction/backfill and background model calls off until deliberately needed. Do not weaken Windows application-control policy to run a blocked executable.

## Hosted Trails and award evidence

Login with your own account using `entire login --device`. Mirroring the existing GitHub repository requires the repository owner's authorization for the Entire GitHub App; a contributor's Git push permission alone does not grant that installation permission. Check the chosen project, visibility and any billing settings before enabling hosted services.

This checkout keeps `origin` pointed at `BehrozKarim/climate-and-nature-navigator`, while the additional `entire` remote points at the user's connected fork, `rehanali53/climate-and-nature-navigator`, in the EU cluster. Always check the repository namespace before publishing or creating a Trail. Entire rejected a direct push to protected `main`; the setup is submitted through Trail #1 instead. Use a regular branch name such as `navigator-entire-setup`: the Trail API reserves the `entire/` prefix even though a Git push can accept it.

Once connected, create a real feature branch and Trail for an actual task. Use Graph to find its implementation, capture the new session, run the real tests, and review whether the change matches its stated intent. Do not create dummy changes solely to imply adoption.

For an award recording, show:

1. Graph finding the calculation and its callers in this repository.
2. A new captured checkpoint, inspected with `checkpoint explain`.
3. Brain recalling an actual project decision, if it becomes available.
4. A real Trail and its review, if hosted setup is completed.

Run `python backend/scripts/verify_entire.py` for repeatable local checks. The ignored `backend/var/entire/evidence.json` records actual command outputs, latency, byte counts and failures. It does not call a model or upload checkpoints. Report token savings only after a controlled comparison of the same task/model with measured usage; the sponsor's “up to 71%” is not a Navigator result.

Official references: [CLI](https://github.com/entireio/cli), [Graph](https://docs.entire.com/guides/graph/overview), [Codex hooks](https://docs.entire.com/agents/codex), [Brain](https://docs.entire.com/guides/brain/overview).
