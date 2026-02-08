# Backend: Cloudflare Worker (optional)

**You do not need a backend API for arena state.** The program is on devnet; the **client can fetch everything** in the browser (Solana RPC, program ID, arena PDA, getAccountInfo). No API required.

**app/worker/** is an **optional** Cloudflare Worker if you ever want a server-side API (e.g. for features that can't run in the client). For the current app (arena state, health), the frontend talks to devnet directly — no Worker needed.

## Layout

- **app/frontend/** — UI only (static or React). Fetches from Solana devnet in the client. Deploys to Bunny (agent-arena.b-cdn.net).
- **app/worker/** — Optional. Cloudflare Worker with `/api/arena` and `/api/health` only if you want a single API URL; otherwise the client fetches from RPC.

Local dev: **app/server.js** serves app/frontend/public and can proxy API locally. Production: UI on Bunny; client fetches from devnet. Worker deploy only if you add server-side logic that requires it.

## What you need to deploy the Worker

1. **Wrangler CLI:** `npm install -g wrangler` or `npx wrangler` from app/worker.
2. **Cloudflare account:** Log in with `npx wrangler login` (once).
3. **Env vars / secrets** (in **app/worker/wrangler.toml** [vars] or via `npx wrangler secret put ...`):
   - **SOLANA_RPC_URL** — e.g. `https://api.devnet.solana.com`
   - **AGENT_ARENA_PROGRAM_ID** — program ID (e.g. `7fqdzB8EBUcRP3omn8BPfitNAAFybcjv7CQT8V4AfeWT`)
   - **AGENT_ARENA_ARENA_PDA** — arena account address (PDA with seed `"arena"`). Compute once: e.g. use `@solana/web3.js` `PublicKey.findProgramAddressSync([Buffer.from("arena")], programId)` or get from init_arena logs; then set in Worker vars.

Optional: add **CLOUDFLARE_ACCOUNT_ID** and **CLOUDFLARE_API_TOKEN** to repo **.env** if the agent deploys via CI or script (wrangler deploy uses them when not interactive).

## Deploy

From repo root or app/worker:

```bash
cd app/worker
npx wrangler deploy
```

Worker URL will be like `https://agent-arena-api.<your-subdomain>.workers.dev`. Point the frontend at this URL for API calls (e.g. set `window.API_BASE` or build-time env so the UI fetches `API_BASE + '/api/arena'`).

## Checklist (every run)

- Keep **app/frontend** (UI) and **app/worker** (backend) separate. Do not mix UI and API in the same deploy artifact.
- Deploy **UI** to Bunny (build frontend, upload, purge CDN).
- Deploy **Worker** when backend changes: `cd app/worker && npx wrangler deploy`. Ensure AGENT_ARENA_ARENA_PDA and program ID are set for the current devnet program.
