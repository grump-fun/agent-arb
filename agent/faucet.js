/**
 * Request devnet SOL from AgentWallet faucet.
 * Set AGENTWALLET_USERNAME and AGENTWALLET_API_TOKEN (or use ~/.agentwallet/config.json).
 * Run: node agent/faucet.js
 */

import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const API = "https://agentwallet.mcpay.tech/api";

function getConfig() {
  const envUser = process.env.AGENTWALLET_USERNAME;
  const envToken = process.env.AGENTWALLET_API_TOKEN;
  if (envUser && envToken) return { username: envUser, apiToken: envToken };
  const configPath = process.env.AGENTWALLET_CONFIG || join(process.env.HOME || process.env.USERPROFILE || "", ".agentwallet", "config.json");
  if (!existsSync(configPath)) return null;
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  if (!config.username || !config.apiToken) return null;
  return { username: config.username, apiToken: config.apiToken };
}

async function main() {
  const config = getConfig();
  if (!config) {
    console.log("Set AGENTWALLET_USERNAME and AGENTWALLET_API_TOKEN, or configure ~/.agentwallet/config.json");
    process.exit(1);
  }
  const res = await fetch(`${API}/wallets/${config.username}/actions/faucet-sol`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("Faucet error:", data.error || data);
    process.exit(1);
  }
  console.log("Faucet:", data.amount, "remaining:", data.remaining);
  if (data.txHash) console.log("Tx:", data.explorer || data.txHash);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
