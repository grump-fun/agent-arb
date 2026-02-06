/**
 * Minimal API + static UI for Agent Arena.
 * GET /api/arena -> arena state (from RPC).
 * GET / -> simple HTML to observe and (placeholder) vote.
 */

import express from "express";
import { Connection, PublicKey } from "@solana/web3.js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const RPC = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = process.env.AGENT_ARENA_PROGRAM_ID || "11111111111111111111111111111111";
const ARENA_SEED = Buffer.from("arena");

function getArenaPda(programId) {
  const [pda] = PublicKey.findProgramAddressSync(
    [ARENA_SEED],
    new PublicKey(programId)
  );
  return pda;
}

async function fetchArena(connection, programId) {
  const pda = getArenaPda(programId);
  const info = await connection.getAccountInfo(pda);
  if (!info?.data || info.data.length < 8 + 32 + 8 + 8 + 8 + 1) return null;
  const d = info.data;
  let o = 8;
  const authority = new PublicKey(d.subarray(o, o + 32)).toBase58();
  o += 32;
  const round = Number(d.readBigUInt64LE(o));
  o += 8;
  const agentWins = Number(d.readBigUInt64LE(o));
  o += 8;
  const crowdWins = Number(d.readBigUInt64LE(o));
  return { authority, round, agentWins, crowdWins, pda: pda.toBase58() };
}

app.use(express.json());
app.use(express.static(join(__dirname, "public")));

app.get("/api/arena", async (_req, res) => {
  try {
    const connection = new Connection(RPC);
    const arena = await fetchArena(connection, PROGRAM_ID);
    res.json(arena || { error: "Arena not initialized" });
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/", (_req, res) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Agent Arena</title>
  <style>
    body { font-family: system-ui,sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem; }
    h1 { font-size: 1.5rem; }
    .arena { background: #1a1a2e; color: #eee; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
    .arena p { margin: 0.5rem 0; }
    .refresh { margin-top: 1rem; }
    button { padding: 0.5rem 1rem; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Agent Arena</h1>
  <p>Humans vote and stake. The agent decides and executes.</p>
  <div class="arena" id="arena">Loading…</div>
  <div class="refresh"><button onclick="load()">Refresh</button></div>
  <script>
    async function load() {
      const el = document.getElementById('arena');
      el.textContent = 'Loading…';
      const r = await fetch('/api/arena');
      const d = await r.json();
      if (d.error) { el.innerHTML = '<p>' + d.error + '</p>'; return; }
      el.innerHTML = '<p><b>Round</b> ' + d.round + '</p>' +
        '<p>Agent wins: ' + d.agentWins + ' | Crowd wins: ' + d.crowdWins + '</p>' +
        '<p>Agent authority: <code>' + d.authority?.slice(0,8) + '…</code></p>';
    }
    load();
  </script>
</body>
</html>
  `;
  res.send(html);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Agent Arena app on http://localhost:" + port));
