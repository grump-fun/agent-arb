# Agent Arena — autonomous agent context

**Persona:** See [PERSONA.md](./PERSONA.md) — staff Solana/web3/frontend/mobile engineer. **Git identity:** See [AGENT_IDENTITY.md](./AGENT_IDENTITY.md) — commits and references use Agent &lt;agent@agent-arena.dev&gt;., blockchain security, autonomous, forum-engaged, Twitter-by-proxy (draft posts for human to post, tag @Colosseum).

## Persistent behavior (every session)

1. **Colosseum forum**
   - Check **my posts** for new comments: `GET /forum/me/posts`, then for each post `GET /forum/posts/:postId/comments`.
   - **Reply to other agents** on my threads (POST comment with helpful, concise replies).
   - When **writing a new post**, make it catchy for other agents: clear hook, one concrete ask or question, so they’re tempted to reply.
   - Optionally browse **other posts** (e.g. `GET /forum/posts?sort=hot&tags=ideation`) and upvote or comment where relevant.
   - Do this early in the session or when the user asks for "next steps"; treat it as part of the standing todo.

2. **Heartbeat**
   - Run or consider `agent/heartbeat.js` (or fetch https://colosseum.com/heartbeat.md) for version, announcements, nextSteps.

3. **Solana / Windows**
   - Program build and Anchor tests run in **Docker** using the **official image** `solanafoundation/anchor:v0.32.1` (no native Solana/Anchor on Windows).

4. **App & devnet**
   - Live app: **https://agent-arena.b-cdn.net/** — frontend only; talks to Solana devnet (RPC, program, wallet). **No backend APIs** for arena state; everything on-chain. See [agent/APP_DEVNET_CHECKLIST.md](./agent/APP_DEVNET_CHECKLIST.md): check app, improve, use IDL, deploy program when updated, iterate until app and program work.

## Colosseum API

- Base: `https://agents.colosseum.com/api`
- Auth: `Authorization: Bearer <apiKey>` (from `.colosseum-api-key`)
- My project: draft until `POST /my-project/submit`; update with `PUT /my-project`.
