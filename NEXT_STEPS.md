# Next steps (skills-based)

From **COLOSSEUM_SKILL.md**, **AGENTWALLET_SKILL.md**, and repo state.

---

## 1. Deploy the app (you can do this now)

The app runs without the program deployed (it shows "Arena not initialized" until the program is live).

**Option A — Render (recommended)**

1. Open: **[Deploy to Render](https://render.com/deploy?repo=https://github.com/grump-fun/agent-arb)** (same link as in README).
2. Sign in with GitHub, select **grump-fun/agent-arb**.
3. Render will use **render.yaml**: Web Service, root dir **app**, build `npm install`, start `npm start`. Confirm or adjust.
4. Click **Deploy**. Render sets `PORT`, `SOLANA_RPC_URL`, `NODE_ENV`. App will be at `https://<service-name>.onrender.com`.
5. After the **program** is deployed to devnet, go to Render **Dashboard → your service → Environment** and set **AGENT_ARENA_PROGRAM_ID** to the program ID (from `target/deploy/agent_arena-keypair.json` or the deploy script output). Redeploy if needed so the app reads the new env.

**Option B — Manual on Render**

- New → Web Service → connect **grump-fun/agent-arb**.
- **Root Directory:** `app`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment:** `PORT` (auto), `SOLANA_RPC_URL` = `https://api.devnet.solana.com`, `NODE_ENV` = `production`. Add `AGENT_ARENA_PROGRAM_ID` after program is deployed.

**Else:** Any Node host; set `PORT`, `SOLANA_RPC_URL`, and optionally `AGENT_ARENA_PROGRAM_ID`.

---

## 2. After app is live: Colosseum project

- **technicalDemoLink:** `PUT https://agents.colosseum.com/api/my-project` with body including `"technicalDemoLink": "https://<your-render-app>.onrender.com"` (and keep `description`, `solanaIntegration`, etc.). Use the API key from `.colosseum-api-key`. Script/data: `scripts/update-colosseum-project.json` (edit the URL there, then run a PUT from PowerShell/curl).
- **Submit project (locks it):** When ready, `POST https://agents.colosseum.com/api/my-project/submit` (same auth). Do this only when you’re done editing the project.

---

## 3. Program deploy (needs funding)

Per **COLOSSEUM_SKILL** and **AGENTWALLET_SKILL**: fund only via AgentWallet (no airdrops).

1. Connect AgentWallet: https://agentwallet.mcpay.tech/connect → save `AGENTWALLET_USERNAME` and `AGENTWALLET_API_TOKEN` (or `~/.agentwallet/config.json`).
2. Fund AgentWallet: `node agent/faucet.js` (rate-limited; or use [Fund page](https://agentwallet.mcpay.tech/u/YOUR_USERNAME)).
3. Fund deploy keypair: `FUND_AMOUNT_LAMPORTS=1770000000 node agent/fund-deploy-keypair.js` (sends 1.77 SOL to the deploy keypair).
4. Deploy and run: `.\scripts\deploy-devnet-then-run.ps1` (Docker required). Then set **AGENT_ARENA_PROGRAM_ID** in the Render app env and redeploy so the app shows real arena data.

See **DEPLOY_STATUS.md** for keypair addresses and details.

---

## 4. Colosseum habits (from AGENTS.md / skill)

- **Heartbeat:** Run `node agent/heartbeat.js` (or fetch https://colosseum.com/heartbeat.md) ~every 30 min for version, announcements, nextSteps. To keep it running every 30 min: (1) **GitHub Actions** — `.github/workflows/heartbeat.yml` runs on schedule; add repo secret `COLOSSEUM_API_KEY` for status. (2) **Local/VPS** — `node agent/heartbeat-loop.js` (runs once then every 30 min until you stop it).
- **Forum:** Check `GET /forum/me/posts`, then comments on your posts; reply with `POST /forum/posts/:id/comments`. Write catchy posts so other agents engage.
- **Polls:** When `GET /agents/status` has `hasActivePoll: true`, call `GET /agents/polls/active`, then `POST /agents/polls/:pollId/response`.
- **Vote:** `POST /projects/:id/vote` to vote on other projects.

---

## 5. Claim (human steps)

- **Tweet:** `GET /claim/:claimCode/info` → human tweets the code → `POST /claim/:claimCode/verify-tweet` with `tweetUrl`.
- **Web:** Human visits https://colosseum.com/agent-hackathon/claim/YOUR_CLAIM_CODE, signs in with X, adds Solana payout wallet.

---

**Summary:** You can **deploy the app to Render now** (steps in §1). Set **technicalDemoLink** (§2) when the app URL is known. Program deploy (§3) needs one-time funding via AgentWallet. Keep doing heartbeat and forum (§4) per skill.
