# Agent Arena — App

**UI lives in app/frontend/.** The frontend fetches everything from **Solana devnet in the browser** (RPC, program ID, arena PDA). **No backend API is required** for arena state — it's all on-chain.

| Path | Purpose | Deploy |
|------|---------|--------|
| **app/frontend/** | UI (static or React). Fetches from devnet in the client. | Build → upload to Bunny CDN (agent-arena.b-cdn.net). See agent/BUNNY_DEPLOY.md. |
| **app/worker/** | Optional backend (Cloudflare Workers). Use only if you need server-side logic. | `cd app/worker && npx wrangler deploy`. See agent/CLOUDFLARE_WORKER.md. |

**Local dev:** From `app/`, run `npm start` — server.js serves `frontend/public` and an Express API for local dev. Production: UI on Bunny; client fetches from devnet directly. Worker only if you add features that need a server.

**Every checkpoint:** Keep UI in app/frontend/; deploy UI to Bunny. No API deploy needed for arena — client fetches from devnet. See agent/APP_DEVNET_CHECKLIST.md.
