<!-- entire-agent:begin -->
Read .entire/agent-guide.md for this repository's workflow, source inspection, and verification guidance.
@.entire/agent-guide.md
<!-- entire-agent:end -->

## Team handoff

Follow `backend/docs/team-entire-handoff.md` for every coding task and push.
Start with Brain brief/recall when configured, then use Graph to locate current code and dependencies. Check the source before editing.
Work in a feature branch with Entire capture enabled in this checkout. Verify the session/checkpoint exists; never claim capture just because hooks are installed.
Do not write or run unit tests unless the user explicitly asks. Use a relevant build and source review, and report what was actually checked.
Before pushing, inspect the checkpoint context. Uploads remain disabled until the user approves sharing captured prompts/responses/tool outputs to the connected fork, `rehanali53/climate-and-nature-navigator`. Once approved, each clone must permit uploads and use the automatic push policy for push-time sharing.
Push code, verify checkpoint upload, and create/link a Trail with intent, Graph evidence, verification and limitations. A teammate reviews it; do not self-approve or merge unless authorized.
Save supported decisions with Brain remember using an explicit taxonomy path and `--agent none`. Brain is local unless explicitly connected for hosted memory sync. Never invent sessions, memory extraction, review outcomes or token savings.
