# App & devnet program — checklist and rules

## No backend API needed for arena

The program is on **devnet**. The **client (frontend) can fetch everything** from Solana RPC in the browser: connect to devnet, derive the arena PDA (seed `"arena"` + program ID), call `getAccountInfo(arenaPda)`, parse the account. **You do not need an API** for arena state — it's completely on Solana; the frontend talks to the RPC and the program directly.

## Separation (every checkpoint)

- **Keep UI and backend separate.** **app/frontend/** = UI only (static or React). If you add a backend (e.g. **app/worker/** for Cloudflare Workers), keep it separate; do not mix UI and API in one artifact. Every run: ensure this separation; deploy UI to Bunny. Deploy a backend only if you actually need server-side logic (e.g. secrets, server-only aggregations).

## Live app

- **URL:** https://agent-arena.b-cdn.net/ (UI from Bunny CDN). **No API required** — the UI fetches arena state from Solana devnet (RPC + program + PDA) in the client.
- **app/frontend/** — UI only. Prefer **React**; nice UI; build and upload to Bunny. The UI should fetch from Solana RPC in the browser (program ID, arena PDA, getAccountInfo). No backend needed for that.
- **app/worker/** — Optional. Use only if you need a server-side API (e.g. for something that can't be done in the client). For arena state, the client fetches from devnet directly.

## Program (Solana / Anchor)

- **Deploy every time it changes** — When you change `programs/agent_arena`, build and deploy to devnet. Update the app program ID if redeployed.
- **Best practices** — Write the program with Anchor/Solana best practices: clear account constraints, security, clean PDAs. Keep it production-ready.

## Checklist (every run when working on app/program)

1. **Keep UI and backend separate** — app/frontend/ (UI). If you have a backend (app/worker/), keep it separate. UI fetches from Solana in the client; no API required for arena.
2. **Check the live app** — https://agent-arena.b-cdn.net/. Does it load and show arena state? (Frontend should fetch from devnet RPC + program ID + arena PDA in the browser.)
3. **Improve frontend** — Prefer React; nice UI; ensure it fetches arena from Solana devnet in the client (program ID, derive PDA, getAccountInfo). Use generated IDL if helpful.
4. **Deploy the program** every time it changes; update the app's program ID in the frontend if redeployed. No backend deploy needed for arena — client fetches from devnet.
5. **Iterate** — Build/upload UI to Bunny; deploy program when it changes. Until the app and devnet program work. Deploy a backend (e.g. Worker) only if you add server-side features that require it.

## Summary

- **UI** = app/frontend/, deploy to Bunny. The **client fetches everything from Solana devnet** (RPC, program, PDA). No API needed for arena state.
- **Program** = deploy every time it changes; best practices; keep frontend program ID in sync.
- Every run: separate UI (and optional backend) → check app → improve → deploy program when changed → iterate. Backend (Worker) only if you need server-side logic.
