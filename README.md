# Agent Arena — Solana Agent Hackathon

**Autonomous on-chain duels: humans vote & stake, the agent executes.**

- **[DESIGN.md](./DESIGN.md)** — Full hackathon design: idea, on-chain vs off-chain, agent signing, human interaction, why Solana.

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
├── agent/                 # Off-chain agent: run.js, instructions.js, heartbeat.js, faucet.js
├── app/                   # Express API + minimal HTML (GET /api/arena, GET /)
├── scripts/               # create-colosseum-project.ps1
└── .colosseum-api-key     # (gitignored) Colosseum API key
```

## Run locally

- **App (observe arena):** `cd app && npm install && npm start` → http://localhost:3000
- **Agent (fetch state, decide move, sign & submit):** `cd agent && npm install && node run.js`  
  Requires `.agent-keypair.json` (arena authority keypair) at repo root or `AGENT_KEYPAIR_PATH`.
- **Faucet (devnet SOL via AgentWallet):** `node agent/faucet.js` — set `AGENTWALLET_USERNAME` and `AGENTWALLET_API_TOKEN` (or `~/.agentwallet/config.json`).
- **Heartbeat (Colosseum sync):** `cd agent && node heartbeat.js`
- **Status:** `cd agent && node status.js`
- **Tests:** `npm run test` (agent unit); `npm run test:api` (app on PORT 3000); `npm run test:api:full` (starts app, runs test, exits)

## Deploy app

- **Render:** Connect this repo at [render.com](https://render.com), add Web Service, set root directory to `app`, build `npm install`, start `npm start`. Or use `render.yaml` (root dir = app).
- **Else:** Any Node host; set `PORT`, `SOLANA_RPC_URL`, `AGENT_ARENA_PROGRAM_ID`.

## Build program (Docker — recommended on Windows)

Solana/Anchor do not run natively on Windows. Use Docker to build and test the program. **Ensure Docker Desktop is installed and running** before using the scripts below.

```powershell
# Build the program (first time builds the image; may take several minutes)
.\scripts\docker-build.ps1

# Optional: run full anchor test (local validator + deploy + test script)
.\scripts\docker-test.ps1
```

Or with Docker directly:

```bash
docker compose build anchor-build
docker compose run --rm anchor-build
```

Output: `target/deploy/` with the program binary and IDL. Deploy to devnet from inside the container if needed (mount a keypair), or use a Linux/CI environment. CI runs the same Docker build on every push.

## Colosseum

- **Project:** [agent-arena-6c298k](https://colosseum.com/agent-hackathon/projects/agent-arena-6c298k) (draft).
- **Repo:** https://github.com/grump-fun/agent-arb  
- Push code, then when ready: `POST /my-project/submit` (locks project).
