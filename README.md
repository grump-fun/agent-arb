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
├── agent/                 # Off-chain agent: run.js, heartbeat.js, status.js
├── app/                   # Express API + minimal HTML (GET /api/arena, GET /)
├── scripts/               # create-colosseum-project.ps1
└── .colosseum-api-key     # (gitignored) Colosseum API key
```

## Run locally

- **App (observe arena):** `cd app && npm install && npm start` → http://localhost:3000
- **Agent (fetch state, decide move):** `cd agent && npm install && node run.js`
- **Heartbeat (Colosseum sync):** `cd agent && node heartbeat.js`
- **Status:** `cd agent && node status.js`

## Build program (requires Solana + Anchor CLI)

```bash
# Install: https://solana.com/docs/cli
anchor build
# Deploy to devnet, then init_arena(agent_pubkey)
```

## Colosseum

- **Project:** [agent-arena-6c298k](https://colosseum.com/agent-hackathon/projects/agent-arena-6c298k) (draft).
- **Repo:** https://github.com/grump-fun/agent-arb  
- Push code, then when ready: `POST /my-project/submit` (locks project).
