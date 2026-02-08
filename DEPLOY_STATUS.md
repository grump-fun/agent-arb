# Deploy status (autonomous agent)

Keypairs were created by the agent. **Funding is required once** via AgentWallet (per Colosseum skill).

## How this follows the skills

- **Colosseum:** “Use AgentWallet for Solana keys/signing/funding — do not use solana-keygen or faucet airdrops.” We use **AgentWallet for all funding**: faucet sends SOL to your AgentWallet; `fund-deploy-keypair.js` uses AgentWallet **transfer-solana** to send SOL to the deploy keypair. No public airdrops.
- **AgentWallet:** “Custom program tx signing: use local keypair in this agent; AgentWallet does not expose raw Solana tx signing.” So the **wallet that signs** deploy and `submit_move` must be a local keypair (we have no API to ask AgentWallet to sign our program’s instructions). We create those keypairs locally and **fund them from AgentWallet** only. The “wallet” for funding is AgentWallet; the keys that sign our program’s txs are local, as the skill allows.

## Keypair addresses (local only; gitignored)

| Keypair | Purpose | Address |
|--------|---------|---------|
| Deploy | Program deploy + init_arena payer | `BDwABxmu9Mtu3qSCUZWmaJfon6DwA6AKiFdntA5o9qF5` |
| Agent | Arena authority (only key that can submit moves) | `4U5oqpNFBrKMVfcPST5mGgj7TdGN4Drc8aZoTEbmV3t1` |

## One-time: fund deploy keypair

1. **Connect AgentWallet** (if not done): [https://agentwallet.mcpay.tech/connect](https://agentwallet.mcpay.tech/connect) — save `AGENTWALLET_USERNAME` and `AGENTWALLET_API_TOKEN` (or `~/.agentwallet/config.json`).
2. **Fund AgentWallet with devnet SOL:** `node agent/faucet.js` (rate-limited; run up to 3×/24h if needed).
3. **Send SOL to deploy keypair:** Deploy needs ~1.77 SOL. Run `FUND_AMOUNT_LAMPORTS=1770000000 node agent/fund-deploy-keypair.js` once (sends 1.77 SOL). To get that much in AgentWallet first: use [Fund page](https://agentwallet.mcpay.tech/u/YOUR_USERNAME) or run `node agent/faucet.js` multiple times over 24h (3×/day = 0.3 SOL/day).

**Or** send devnet SOL to `BDwABxmu9Mtu3qSCUZWmaJfon6DwA6AKiFdntA5o9qF5` by any means (e.g. another wallet), then skip AgentWallet steps.

## After funding: deploy program + init + run agent

From repo root (Docker Desktop running):

```powershell
.\scripts\deploy-devnet-then-run.ps1
```

That script: builds if needed, deploys program, runs init_arena, then runs the agent once. Program ID is printed and stored for the app.

## App deploy

- **Render:** Use the [Deploy to Render](https://render.com/deploy?repo=https://github.com/grump-fun/agent-arb) button in README; set `AGENT_ARENA_PROGRAM_ID` in the dashboard after deploy.
- **UI build → Bunny.net CDN:** The agent can deploy the built UI to Bunny.net storage and serve it via the CDN **agent-arena.b-cdn.net**. All credentials and IDs are in repo root `.env` (BUNNY_FTP_*, BUNNY_PULL_ZONE_ID). See **agent/BUNNY_DEPLOY.md** for deploy flow and cache purge.
- After the program is deployed, set Colosseum project `technicalDemoLink` to the app URL (Render or CDN as appropriate).
