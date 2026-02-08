# Agent Arena — Solana Agent Hackathon

**Autonomous on-chain duels: humans vote & stake, the agent executes.**

- **Live Demo:** [agent-arena.b-cdn.net](https://agent-arena.b-cdn.net)
- **Project:** [Colosseum Project Page](https://colosseum.com/agent-hackathon/projects/agent-arena-6c298k)
- **Design:** [DESIGN.md](./DESIGN.md) — Full hackathon design: idea, on-chain vs off-chain, agent signing, human interaction, why Solana.

## Current status (Day 6)

| Area | Status |
|------|--------|
| **Anchor program** | Built and tested (Anchor 0.32, Docker). Instructions: `init_arena`, `submit_move`, `submit_move_first`, `stake`. PDAs for arena, round vault, agent treasury. |
| **Off-chain agent** | Autonomous agent loop (`run.js`, `run-loop.js`). Signs and submits moves. Heartbeat, forum, and X posting all automated. |
| **Dashboard** | Live at [agent-arena.b-cdn.net](https://agent-arena.b-cdn.net). Dark-themed UI with countdown, architecture diagram, activity feed, community engagement stats, integration map. |
| **Forum** | 3 posts, 11 replies received, 25+ cross-project comments. Active composability discussions with CLAWIN, Neo Bank, Claw, SlotScribe, MoltLaunch, AgentPay, and more. |
| **Autonomous agent** | Runs every 15 min via `agent-runner.js`. Checks heartbeat, forum, polls; posts to X; deploys UI; commits and pushes. Fully autonomous. |
| **Program deploy** | Pending devnet funding via AgentWallet. |

## Quick summary

| Requirement | Answer |
|-------------|--------|
| **Primary on-chain actor** | The agent signs every move; program allows only the agent's pubkey to advance the game. |
| **Solana usage** | One Anchor program (game state + move + staking), PDAs for arena and agent treasury. |
| **Humans** | Vote (challenge type), stake (agent vs crowd), observe (dashboard). |
| **Agent signs** | Off-chain process holds agent keypair; builds and signs `submit_move` tx; submits via RPC. |
| **Why Solana** | PDAs for agent identity, low fees for many moves/stakes, fast finality, program as referee. |

## Repo structure

```
agent-arb/
├── DESIGN.md              # Hackathon design
├── README.md
├── Anchor.toml
├── programs/agent_arena/  # Anchor program (arena, submit_move, stake)
├── agent/                 # Off-chain agent: run.js, instructions.js, init-arena.js, fund-deploy-keypair.js, faucet.js, heartbeat.js
├── app/                   # Express API + minimal HTML (GET /api/arena, GET /)
├── scripts/               # Docker build/deploy, forum drafts, Colosseum project scripts
└── .colosseum-api-key     # (gitignored) Colosseum API key
```

## Run locally

- **App (observe arena):** `cd app && npm install && npm start` → http://localhost:3000
- **Agent (fetch state, decide move, sign & submit):** `cd agent && npm install && node run.js`  
  Requires `.agent-keypair.json` (arena authority keypair) at repo root or `AGENT_KEYPAIR_PATH`.
- **Perpetual agent (run forever):** see [Perpetual run](#perpetual-run--24-7-agent) below.
- **Autonomous agent (Cursor CLI every 30 min):** context-aware loop that runs Cursor CLI (heartbeat, forum, post to X via x-autopilot webhook). See **[AUTONOMOUS_AGENT.md](./AUTONOMOUS_AGENT.md)**. Run: `node scripts/agent-runner.js`.
- **Faucet (devnet SOL to AgentWallet):** `node agent/faucet.js`. **Fund deploy keypair from AgentWallet:** `node agent/fund-deploy-keypair.js` (then run `.\scripts\docker-deploy-devnet.ps1`). Set `AGENTWALLET_USERNAME` and `AGENTWALLET_API_TOKEN` (or `~/.agentwallet/config.json`).
- **Heartbeat (Colosseum sync):** `cd agent && node heartbeat.js`. To run **every 30 min**: use `node heartbeat-loop.js` (keeps running) or rely on GitHub Actions (`.github/workflows/heartbeat.yml`, runs on schedule; add repo secret `COLOSSEUM_API_KEY` for status).
- **Status:** `cd agent && node status.js`
- **ClawKey (verify human ownership):** `cd agent && node clawkey-register.js` — prints a registration URL; **you** open it and complete VeryAI palm verification (do not automate opening the browser). See https://clawkey.ai/skill.md.
- **Tests:** `npm run test` (agent unit); `npm run test:api` (app on PORT 3000); `npm run test:api:full` (starts app, runs test, exits)

## Perpetual run (24-7 agent)

To keep the **game agent** running so it periodically submits moves:

| Method | How | Best for |
|--------|-----|----------|
| **Loop script** | `cd agent && node run-loop.js` — runs `run.js` once, then every 2 min (set `RUN_INTERVAL_SEC` to change). Leave the terminal open or run under PM2. | Local PC or VPS |
| **PM2** | `pm2 start agent/run-loop.js --name agent-arena --cwd agent` — survives logout; use `pm2 logs`, `pm2 restart agent-arena`. | VPS / server |
| **Windows Task Scheduler** | Create a task that runs every 2–5 min: `node C:\path\to\agent\run.js` (one shot per trigger). | Windows, no loop process |
| **Cron (Linux/Mac)** | `*/2 * * * * cd /path/to/agent-arb/agent && node run.js` (every 2 min). | Linux/Mac server |
| **Render cron** | Add a [Render Cron Job](https://render.com/docs/cronjobs): build `npm install`, start `node run.js`, schedule `*/2 * * * *`. Root dir `agent`. You must put the keypair in an env var (e.g. base64 of the JSON) and have the start command decode it to a file. | Cloud, no VPS |

**Requirements for perpetual run:** Program deployed and arena initialized; `.agent-keypair.json` (arena authority) present; `AGENT_ARENA_PROGRAM_ID` and `SOLANA_RPC_URL` set if needed.

## Deploy app

Per [COLOSSEUM_SKILL.md](./COLOSSEUM_SKILL.md) and [render.yaml](./render.yaml): the app is a Node service (Express, `GET /api/arena`, `GET /`). Deploy so the Colosseum project has a live **technicalDemoLink**.

- **Render (recommended):**  
  [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/grump-fun/agent-arb)  
  Or manually: New → Web Service → connect `grump-fun/agent-arb`, set **Root Directory** to `app`, Build Command `npm install`, Start Command `npm start`. Env: `PORT` (auto), `SOLANA_RPC_URL` = `https://api.devnet.solana.com`, optionally `AGENT_ARENA_PROGRAM_ID` after you deploy the program.
- **Else:** Any Node host; set `PORT`, `SOLANA_RPC_URL`, `AGENT_ARENA_PROGRAM_ID`.

## Build program (Docker — recommended on Windows)

Solana/Anchor do not run natively on Windows. Use the **official Anchor image** ([solanafoundation/anchor](https://hub.docker.com/r/solanafoundation/anchor)) to build and test. **Ensure Docker Desktop is installed and running.**

```powershell
# Build the program (pulls official image on first run)
.\scripts\docker-build.ps1

# Optional: run full anchor test (local validator + deploy)
.\scripts\docker-test.ps1
```

Or with Docker directly:

```bash
docker compose run --rm anchor-build
```

Image: `solanafoundation/anchor:v0.32.1`. Program uses Anchor 0.32.1. Output: `target/deploy/` with the program binary and IDL.

### Deploy program to devnet

Per [COLOSSEUM_SKILL.md](./COLOSSEUM_SKILL.md) and [agent/AGENTWALLET_SKILL.md](./agent/AGENTWALLET_SKILL.md): use **AgentWallet** for funding (no airdrops).

1. **Build:** Start Docker Desktop, then `.\scripts\docker-build.ps1`.
2. **Deploy keypair:** Create if needed: `solana-keygen new -o .solana-id.json` (or use existing). Put it at repo root or set `SOLANA_KEYPAIR_PATH`.
3. **Fund via AgentWallet:**  
   - Fund your AgentWallet with devnet SOL: `node agent/faucet.js` (rate-limited; set `AGENTWALLET_USERNAME` and `AGENTWALLET_API_TOKEN` or `~/.agentwallet/config.json`).  
   - Send SOL to the deploy keypair: `node agent/fund-deploy-keypair.js` (reads `.solana-id.json` pubkey, uses AgentWallet transfer-solana to that address on devnet).
4. **Deploy:** `.\scripts\docker-deploy-devnet.ps1`. Note the **program ID** printed (or from `target/deploy/agent_arena-keypair.json`).
5. **Init arena (one-off):**  
   `cd agent && AGENT_ARENA_PROGRAM_ID=<program_id> node init-arena.js`  
   Payer = `.solana-id.json`, agent authority = `.agent-keypair.json`.
6. **Run the agent:** `cd agent && AGENT_ARENA_PROGRAM_ID=<program_id> node run.js` (and `SOLANA_RPC_URL` to devnet if needed).

CI runs the same build on every push.

## Colosseum

- **Project:** [agent-arena-6c298k](https://colosseum.com/agent-hackathon/projects/agent-arena-6c298k) (draft).
- **Repo:** https://github.com/grump-fun/agent-arb  
- Push code, then when ready: `POST /my-project/submit` (locks project).
- **Next:** Deploy program (AgentWallet fund → `fund-deploy-keypair.js` → `docker-deploy-devnet.ps1` → `init-arena.js` → run agent). Deploy app (Render button above or manual). Then set Colosseum `technicalDemoLink` to the app URL and post forum/tweet invite from `scripts/`.