/**
 * Agent Arena API — Cloudflare Worker.
 * GET /api/arena  -> arena state from Solana RPC (getAccountInfo(ARENA_PDA)).
 * GET /api/health -> service health, network, program ID.
 * Bindings (wrangler.toml [vars] or secrets): SOLANA_RPC_URL, AGENT_ARENA_PROGRAM_ID, AGENT_ARENA_ARENA_PDA.
 */

function getEnv(env) {
  const RPC = env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const PROGRAM_ID = env.AGENT_ARENA_PROGRAM_ID || "7fqdzB8EBUcRP3omn8BPfitNAAFybcjv7CQT8V4AfeWT";
  const ARENA_PDA = env.AGENT_ARENA_ARENA_PDA || null;
  return { RPC, PROGRAM_ID, ARENA_PDA };
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function parseArenaAccount(data, arenaPda) {
  if (!data || data.length < 8 + 32 + 8 + 8 + 8 + 1) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let o = 8;
  const authorityBytes = data.slice(o, o + 32);
  o += 32;
  const authority = base58Encode(authorityBytes);
  const round = Number(view.getBigUint64(o, true));
  o += 8;
  const agentWins = Number(view.getBigUint64(o, true));
  o += 8;
  const crowdWins = Number(view.getBigUint64(o, true));
  return { authority, round, agentWins, crowdWins, pda: arenaPda || "unknown" };
}

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58Encode(bytes) {
  let num = 0n;
  for (let i = 0; i < bytes.length; i++) num = num * 256n + BigInt(bytes[i]);
  let s = "";
  while (num > 0n) {
    s = BASE58[Number(num % 58n)] + s;
    num = num / 58n;
  }
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) s = "1" + s;
  return s;
}

async function fetchArena(rpc, arenaPda) {
  if (!arenaPda) return { error: "AGENT_ARENA_ARENA_PDA not configured" };
  const res = await fetch(rpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getAccountInfo",
      params: [arenaPda, { encoding: "base64" }],
    }),
  });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message || "RPC error");
  const value = j.result?.value;
  if (!value?.data) return null;
  const raw = Uint8Array.from(atob(value.data), (c) => c.charCodeAt(0));
  return parseArenaAccount(raw, arenaPda);
}

export default {
  async fetch(request, env, ctx) {
    const { RPC, PROGRAM_ID, ARENA_PDA } = getEnv(env);
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });

    if (url.pathname === "/api/arena") {
      try {
        const arena = await fetchArena(RPC, ARENA_PDA);
        return json(arena || { error: "Arena not initialized" });
      } catch (e) {
        return json({ error: e?.message ?? String(e) }, 500);
      }
    }

    if (url.pathname === "/api/health") {
      return json({
        status: "ok",
        service: "agent-arena-api",
        network: RPC.includes("devnet") ? "devnet" : RPC.includes("mainnet") ? "mainnet" : "custom",
        programId: PROGRAM_ID,
        timestamp: new Date().toISOString(),
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};
