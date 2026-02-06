/**
 * Fund the deploy keypair on devnet using AgentWallet (per Colosseum skill: use AgentWallet, not airdrop).
 * AgentWallet must have devnet SOL first (run node agent/faucet.js to fund AgentWallet, then run this to send to deploy keypair).
 * Usage: node agent/fund-deploy-keypair.js
 * Env: AGENTWALLET_USERNAME, AGENTWALLET_API_TOKEN (or ~/.agentwallet/config.json).
 *       SOLANA_KEYPAIR_PATH or .solana-id.json at repo root for the deploy keypair (we only read its public key).
 */

import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Keypair } from "@solana/web3.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const API = "https://agentwallet.mcpay.tech/api";

// ~0.05 SOL in lamports (enough for deploy + init)
const LAMPORTS = Number(process.env.FUND_AMOUNT_LAMPORTS) || 50_000_000;

function getAgentWalletConfig() {
  const envUser = process.env.AGENTWALLET_USERNAME;
  const envToken = process.env.AGENTWALLET_API_TOKEN;
  if (envUser && envToken) return { username: envUser, apiToken: envToken };
  const configPath =
    process.env.AGENTWALLET_CONFIG ||
    join(process.env.HOME || process.env.USERPROFILE || "", ".agentwallet", "config.json");
  if (!existsSync(configPath)) return null;
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  if (!config.username || !config.apiToken) return null;
  return { username: config.username, apiToken: config.apiToken };
}

function getDeployKeypairPubkey() {
  const keypairPath =
    process.env.SOLANA_KEYPAIR_PATH || join(ROOT, ".solana-id.json");
  if (!existsSync(keypairPath)) return null;
  const raw = readFileSync(keypairPath, "utf8");
  const arr = JSON.parse(raw);
  const kp = Keypair.fromSecretKey(Uint8Array.from(arr));
  return kp.publicKey.toBase58();
}

async function main() {
  const config = getAgentWalletConfig();
  if (!config) {
    console.error("Set AGENTWALLET_USERNAME and AGENTWALLET_API_TOKEN, or configure ~/.agentwallet/config.json");
    process.exit(1);
  }
  const toAddress = getDeployKeypairPubkey();
  if (!toAddress) {
    console.error("Deploy keypair not found. Create .solana-id.json at repo root or set SOLANA_KEYPAIR_PATH.");
    process.exit(1);
  }
  console.log("Sending", LAMPORTS / 1e9, "SOL to deploy keypair", toAddress.slice(0, 8) + "...");
  const res = await fetch(`${API}/wallets/${config.username}/actions/transfer-solana`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: toAddress,
      amount: String(LAMPORTS),
      asset: "sol",
      network: "devnet",
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("Transfer error:", data.error || data);
    process.exit(1);
  }
  console.log("Funded:", data.status, data.txHash ? "tx: " + (data.explorer || data.txHash) : "");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
