/**
 * Agent Arena — API + UI.
 * GET /            -> static UI (public/index.html) — polished dashboard for arena observation.
 * GET /api/arena   -> arena state (round, wins, authority) from on-chain RPC.
 * GET /api/health  -> service health, network, program ID.
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

// CORS for API routes — allow external integrations
app.use("/api", (_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (_req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// UI lives in app/frontend/public (separate from backend). Local dev serves it here.
app.use(express.static(join(__dirname, "frontend", "public")));

app.get("/api/arena", async (_req, res) => {
  try {
    const connection = new Connection(RPC);
    const arena = await fetchArena(connection, PROGRAM_ID);
    res.json(arena || { error: "Arena not initialized" });
  } catch (e) {
    res.status(500).json({ error: e?.message ?? String(e) });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "agent-arena",
    network: RPC.includes("devnet") ? "devnet" : RPC.includes("mainnet") ? "mainnet" : "custom",
    programId: PROGRAM_ID,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/activity", (_req, res) => {
  try {
    const ctxPath = join(__dirname, "..", "agent", "agent-context.json");
    if (!existsSync(ctxPath)) return res.json({ history: [], lastRunAt: null });
    const ctx = JSON.parse(readFileSync(ctxPath, "utf8"));
    const history = (ctx.history || [])
      .filter((h) => h.summary && h.summary !== "Cursor agent exited 1")
      .slice(-8)
      .reverse();
    res.json({
      lastRunAt: ctx.lastRunAt || null,
      lastPostedAt: ctx.lastPostedAt || null,
      history: history.map((h) => ({
        at: h.at,
        summary: h.summary.length > 200 ? h.summary.slice(0, 200) + "…" : h.summary,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e?.message ?? String(e) });
  }
});

app.get("/api/project", (_req, res) => {
  res.json({
    name: "Agent Arena",
    description: "Autonomous on-chain duels on Solana. The agent signs every move; humans observe and stake.",
    hackathon: "Colosseum Agent Hackathon 2026",
    projectUrl: "https://colosseum.com/agent-hackathon/projects/agent-arena-6c298k",
    repo: "https://github.com/grump-fun/agent-arb",
    twitter: "https://x.com/GrumpyOnChain",
    stack: ["Anchor", "Solana", "Node.js", "Express"],
    features: [
      "Agent-signed moves (only registered agent pubkey can submit)",
      "PDA vaults for per-round stake isolation",
      "Agent treasury PDA for winnings accumulation",
      "Atomic stake resolution in same tx as move",
      "Real-time dashboard with auto-refresh"
    ],
    network: RPC.includes("devnet") ? "devnet" : RPC.includes("mainnet") ? "mainnet" : "custom",
    programId: PROGRAM_ID,
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Agent Arena app on http://localhost:" + port));
