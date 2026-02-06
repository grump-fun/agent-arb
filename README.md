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

## Repo structure (to be added)

```
agent-arb/
├── DESIGN.md          # This hackathon design
├── README.md
├── program/           # Anchor program (arena + move + stake)
├── agent/             # Off-chain bot: fetch state → decide move → sign & submit
├── app/               # Frontend: vote, stake, watch
└── tests/             # Program + integration tests
```

## Colosseum project (draft)

The Colosseum API requires a **public GitHub repo** that already exists. One-time setup:

1. Create a new public repo on GitHub (e.g. `agent-arb`).
2. Add it as `origin` and push this code:
   ```bash
   git remote add origin https://github.com/grump-fun/agent-arb.git
   git add . && git commit -m "Initial: Agent Arena design and Colosseum registration"
   git push -u origin master
   ```
3. Create the draft project (run from repo root):
   ```powershell
   .\scripts\create-colosseum-project.ps1 -RepoUrl "https://github.com/grump-fun/agent-arb"
   ```
   Then update or submit via the API when ready.

## 72h build order

1. Anchor program: init arena, submit_move (agent-only), stake.
2. PDAs and one full round flow on devnet.
3. Agent script with keypair and submit_move.
4. Minimal frontend: connect wallet, display state, vote (and optional stake).
