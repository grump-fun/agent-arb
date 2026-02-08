# Autonomous agent (Cursor CLI + context every 15 min)

This lets the AI agent run **every 15 minutes** by default (override with `INTERVAL_MIN` env) with full context: Colosseum heartbeat, forum, optional post to X (via x-autopilot), and project work. The runner uses **Cursor CLI** in headless mode and keeps a **context file** so the agent knows what was already done.

## Prerequisites

1. **Cursor CLI** (runner uses it every 15 min by default)
   - Windows: `irm 'https://cursor.com/install?win32=true' | iex`. On Windows the runner tries `agent -p --force` first (via PowerShell so it uses the same PATH as when you run `agent` in a terminal), then `agentchat`.
   - macOS/Linux: `curl https://cursor.com/install -fsS | bash`
   - Override: set `CURSOR_CLI_CMD=agentchat` or `CURSOR_CLI_CMD=agent` and optionally `CURSOR_CLI_ARGS` if needed.
   - If the CLI isn’t on PATH when Node runs: set **CURSOR_CLI_PATH** in the repo root **.env** to the full path (folder or .cmd). On Windows the folder is often `C:\Users\PC\AppData\Local\cursor-agent`; the runner will use `agent.cmd` inside it. The runner loads `.env` from the repo root. On Windows the runner passes a **short prompt** that tells the agent to read `.agent-runner-prompt.txt` (full instructions are there) to avoid command-line length limits.
   - **If `agent` works in PowerShell:** when **CURSOR_CLI_PATH** is *not* set, the runner invokes the CLI via **PowerShell** (same PATH as your interactive session), so `agent` should be found. If you get the serialize error only when using CURSOR_CLI_PATH, try removing or commenting out CURSOR_CLI_PATH in `.env` so the runner uses PowerShell + `agent` instead.
   - If you see **"serialize binary: invalid int 32: 4294967295"** in `.agent-runner-last.log`: this is a [known Cursor CLI bug](https://forum.cursor.com/t/agent-streaming-fails-with-serialization-error-invalid-int32-overflow-4294967295/149345). Run `agent update` (or reinstall the CLI), then run the runner again. The runner will retry on the next 30‑min cycle.
   - **How we run the CLI:** the runner uses `agent -p --force --output-format text "<prompt>"` per [Cursor Headless CLI docs](https://cursor.com/docs/cli/headless). See **docs/CURSOR_CLI_HEADLESS.md** for the exact invocation and references.

2. **API key for headless** (optional but recommended)
   - Set `CURSOR_API_KEY` so the CLI can run without an interactive session.

   If the binary is not `agent`, set `CURSOR_CLI_CMD` (e.g. `agentchat`) or `CURSOR_CLI_ARGS` to override arguments.

3. **Post to X (optional)** — uses the same Zapier webhooks as x-autopilot:
   - Put in repo root `.env`: `ZAPIER_POST_NOW_NO_MEDIA_URL` (text-only) and/or `ZAPIER_POST_NOW_URL` (with media). `post-to-x.js` loads `.env` from the repo root automatically.
   - The agent can then run: `node agent/post-to-x.js "tweet text"` and it will post to X via Zapier.

## What the runner does

1. **Script provides everything; agent decides what to do**
   - The script does **not** decide tasks. It loads context, heartbeat, and docs, then gives the Cursor CLI one big prompt with everything the agent needs: keys (`.env`, `agent/.colosseum-api-key`), **agent/agent-context.json** (history, last run, prior command/response), persona and MD files (PERSONA.md, AGENT_IDENTITY.md, AGENTS.md, COLOSSEUM_SKILL.md, TWEET_FORMAT.md, etc.), heartbeat output, and the project (code, tests). The **agent** decides what to do this run (heartbeat, forum, post to X, code, tests) and works until it wants to rest. The script then waits **15 min** by default (or `INTERVAL_MIN` env) and runs again with updated context.

2. **Each cycle**
   - Load **agent-context.json** and run **heartbeat.js**.
   - Build a **prompt** that lists everything provided (keys, context, history, docs, heartbeat) and the options (Colosseum, forum, vote, post X, code/tests). Ask the agent to end with **Next run: &lt;what you plan next&gt;** so the next run stays coherent.
   - Run **Cursor CLI** with that prompt; update **agent-context.json** (lastRunAt, history with commandSent + responseSummary).
   - **Logs:** `.agent-runner-last.log` contains the **full prompt sent to Cursor** (under `=== PROMPT SENT TO CURSOR CLI ===`) and **everything Cursor replied** (stdout/stderr below that). So you can see exactly what was asked and what came back.

3. **Agent identity**
   - The prompt identifies the CLI as **Agent Arena** (see AGENT_IDENTITY.md, PERSONA.md). The agent is fully autonomous: it reads persona, context, and project, then chooses what to do (forum, vote, post on X, code, tests) and states what it will do on the next run.

4. **Context file and action log**
   - Path: `agent/agent-context.json` (gitignored). Create from `agent/agent-context.example.json` if missing.
   - Each cycle the runner appends to `history`: **commandSent** (what was run, e.g. Cursor CLI with prompt file) and **responseSummary** (tail of `.agent-runner-last.log`). The prompt includes the last 5 runs so the agent can avoid repeating the same actions (e.g. same tweet, same forum reply).
   - The prompt tells the agent to **read every run**: docs (PERSONA, AGENTS, COLOSSEUM_SKILL, TWEET_FORMAT, BUNNY_DEPLOY, etc.), **.cursor/rules**, **agent-context.json**, and relevant **code** (programs/, app/, agent/, tests/) so it knows the full project and what it did before. The agent **updates state itself**: it must append to `history` and set `lastPostedAt` when it posts, so the next run has continuity.

5. **Post to X**
   - When the AI decides to post (e.g. to invite people to vote, share the project, tag @Colosseum), it runs: `node agent/post-to-x.js "your tweet"`.
   - That script loads repo root `.env` and POSTs `{ data: { text } }` to `ZAPIER_POST_NOW_NO_MEDIA_URL` (same format as x-autopilot). Your Zapier flow sends it to X.

## How to run

From repo root:

```powershell
node scripts/agent-runner.js
```

Or:

```powershell
.\scripts\agent-runner.ps1
```

Override interval (minutes):

```powershell
$env:INTERVAL_MIN = 60; node scripts/agent-runner.js
```

Leave the process running (or run under PM2 / a service). It will run one cycle immediately, then every 15 min by default (or your `INTERVAL_MIN`).

## Files

| File | Purpose |
|------|---------|
| `scripts/agent-runner.js` | Main loop: heartbeat → build prompt → run Cursor CLI → update context. |
| `scripts/agent-runner.ps1` | Windows wrapper. |
| `agent/agent-context.json` | Persisted context (gitignored). |
| `agent/agent-context.example.json` | Template; copy to agent-context.json if missing. |
| `agent/post-to-x.js` | Post a tweet via Zapier (x-autopilot webhook). |

## x-autopilot integration

- **x-autopilot** (e.g. `C:\Users\PC\projects\x-autopilot`) uses Zapier webhooks to post to X. It has Telegram approval, GM/GN, RSS, etc.
- **agent-arb** does not run x-autopilot. It only **sends one-off posts** to the same Zapier URL when the AI agent decides to tweet (e.g. devnet invite, project update).
- Set `X_POST_WEBHOOK_URL` in agent-arb to the same value as `ZAPIER_POST_NOW_NO_MEDIA_URL` (or `ZAPIER_POST_NOW_URL`) in x-autopilot so both use the same Zapier → X pipeline.
