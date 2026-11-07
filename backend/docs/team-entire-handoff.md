# Team workflow with Entire

Use this from the repository root, where `backend/`, `frontend/` and `.entire/` live. Pulling this guide does not install tools or approve agent hooks on a teammate's computer.

## Once per teammate's checkout

Install the official Entire CLI, then enable local capture and discovery:

```powershell
entire plugin install graph
entire plugin install brain
entire enable --agent codex --local --skip-push-sessions --telemetry=false
entire graph setup --repo . --normal --no-claude-hook
entire brain setup --no-backfill --no-daemon --no-agent-hooks
entire status
entire brain status
```

Use the agent you actually work with instead of `codex` when appropriate. Approve its hooks in the agent's own interface and start a new session in this checkout. Everyone needs write access to the destination for sharing. Checkpoints contain captured prompts, responses and tool outputs; inspect them before publication.

Uploads are disabled by the committed settings. Only after explicit approval to share that context to the public fork, enable push-time sharing in the teammate's clone:

```powershell
entire configure --local --checkpoint-remote github:rehanali53/climate-and-nature-navigator --checkpoint-push-policy automatic --skip-push-sessions=false
entire status
```

Verify status names the intended destination before pushing. The guide documents this optional configuration; it does not enable it by being pulled.

`push_sessions=true` permits checkpoint uploads. The clone-local `automatic` policy uploads them with code pushes. Either a local `push_sessions=false` override or a manual policy prevents that automatic handoff; each teammate must check their own settings. Code may still push when checkpoint sharing fails, so verify both.

## Every task

1. Create a feature branch and state the task in a captured agent session.
2. Ask Brain for previous decisions, then use Graph for current implementation and relationships:

   ```powershell
   entire brain brief "Inventory supplier evidence" --json
   entire brain recall "inventory source evidence"
   entire graph query --repo . --head --profile full --format agent --max-context-bytes 4096 --query "Inventory supplier evidence"
   ```

3. Inspect the referenced source and implement the task. Record important choices with evidence in the session. Do not write/run unit tests unless explicitly requested. Run an appropriate build and obtain source review.
4. Save a supported decision without invoking a model classifier:

   ```powershell
   entire brain remember "Connected Inventory must use snapshot data for charts, supplier totals and evidence; published context is not local approval." --path decisions.inventory.source_evidence --kind invariant --agent none
   ```

5. Commit the intended files. Inspect session capture and its checkpoint before pushing:

   ```powershell
   entire session list
   entire checkpoint list
   entire checkpoint explain CHECKPOINT_ID
   entire checkpoint list --outgoing
   git push -u origin YOUR_FEATURE_BRANCH
   entire checkpoint list --outgoing
   ```

   Replace placeholders with actual values. If the task has no captured checkpoint, say so and check hooks/startup; a Git commit alone is not proof of a recorded conversation. If a checkpoint is still queued after pushing, diagnose the failed upload and deliberately retry with `entire checkpoint push CHECKPOINT_ID` after inspection.

6. Publish the branch to the connected fork too if code was pushed to the original repository, then create/link a Trail against the fork's `main`:

   ```powershell
   entire trail create --repo gh/rehanali53/climate-and-nature-navigator --branch YOUR_FEATURE_BRANCH --base main --type task --title "Describe the actual change" --body "Intent, Graph discoveries, checkpoint ID, build result, limits and review request."
   ```

   With `--repo`, this command links an already published remote branch. If a Trail already exists, link/update it instead of creating a duplicate. Include the real checkpoint/session links, or explicitly state they are absent. Ask a teammate to check intent against the diff and record the review in the Trail. Do not mark an unreviewed change approved. Graph use and shared sessions do not themselves produce a Trail review.

## What Brain adds

Sessions retain what happened; Graph locates current code; Brain retrieves durable decisions and their context for the next agent. Start a task with `brief`/`recall`; after settling a decision, save it with `remember` and an explicit path. Check the cited source before relying on old memory.

Brain memory is local by default. Teammates pulling Git do not automatically get your local memory database. They can build their own Brain from committed docs/history and available sessions. To share durable memories through Entire, deliberately connect each Brain to the same hosted fork with `entire brain connect` (inspect `--help` for its target flags), then verify `entire brain memories sync`. Connection can upload memory immediately; this task does not enable hosted Brain sync.

Setup here uses no backfill, daemon or agent hooks. Automatic extraction from past sessions and background distillation are separate optional features that can use model tokens. Brain v0.5.1 does not provide an MCP server; use its CLI. Windows has no Brain watcher service yet, so do not claim automatic background extraction on Windows.

## Evidence for the challenge

Show a real task's Graph result, captured checkpoint, teammate session handoff, recalled Brain decision and Trail review. Retain actual token usage for a comparable discovery task before claiming efficiency gains. Do not claim the sponsor's “up to 71%” as a project measurement.

See [the setup/evidence ledger](entire-workflow.md) and [official Brain documentation](https://docs.entire.com/guides/brain/overview).
