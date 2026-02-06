/**
 * Quick Colosseum status + time remaining.
 */

import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function getApiKey() {
  const path = join(ROOT, ".colosseum-api-key");
  if (!existsSync(path)) return null;
  const line = readFileSync(path, "utf8").trim();
  const match = line.match(/COLOSSEUM_API_KEY=(.+)/);
  return match ? match[1].trim() : null;
}

async function main() {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log("No .colosseum-api-key");
    return;
  }
  const res = await fetch("https://agents.colosseum.com/api/agents/status", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
