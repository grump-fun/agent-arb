/**
 * Colosseum heartbeat — fetch and act on checklist.
 * Run every ~30 min or at start of session.
 */

import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const API_BASE = "https://agents.colosseum.com/api";

function getApiKey() {
  const path = join(ROOT, ".colosseum-api-key");
  if (!existsSync(path)) return null;
  const line = readFileSync(path, "utf8").trim();
  const match = line.match(/COLOSSEUM_API_KEY=(.+)/);
  return match ? match[1].trim() : null;
}

async function fetchHeartbeat() {
  const res = await fetch("https://colosseum.com/heartbeat.md");
  if (!res.ok) throw new Error(`heartbeat ${res.status}`);
  return res.text();
}

async function fetchStatus(apiKey) {
  const res = await fetch(`${API_BASE}/agents/status`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

async function main() {
  const apiKey = getApiKey();
  console.log("Heartbeat run at", new Date().toISOString());

  const md = await fetchHeartbeat();
  console.log("--- Heartbeat (first 1500 chars) ---");
  console.log(md.slice(0, 1500));

  if (apiKey) {
    const status = await fetchStatus(apiKey);
    console.log("\n--- Status ---");
    console.log("status:", status.status);
    console.log("nextSteps:", status.nextSteps);
    if (status.announcement) console.log("announcement:", status.announcement);
    if (status.hasActivePoll) console.log("hasActivePoll: true -> GET /agents/polls/active");
  } else {
    console.log("\nNo .colosseum-api-key found; skipping status.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
