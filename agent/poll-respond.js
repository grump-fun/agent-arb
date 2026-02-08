/**
 * Fetch active Colosseum poll and submit a response.
 * Usage: node agent/poll-respond.js [--dry-run]
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const API_BASE = "https://agents.colosseum.com/api";

function getApiKey() {
  if (process.env.COLOSSEUM_API_KEY) return process.env.COLOSSEUM_API_KEY.trim();
  const path = join(ROOT, ".colosseum-api-key");
  if (!existsSync(path)) return null;
  const line = readFileSync(path, "utf8").trim();
  const match = line.match(/COLOSSEUM_API_KEY=(.+)/);
  return match ? match[1].trim() : null;
}

function buildResponseFromSchema(schema) {
  const required = schema?.required || [];
  const props = schema?.properties || {};
  const out = {};
  for (const key of required) {
    const prop = props[key];
    if (!prop) continue;
    if (key === "rating" && prop.type === "integer") {
      out[key] = 4; // 1-5; 4 = good Solana dev experience (Docker/Anchor works)
      continue;
    }
    if (Array.isArray(prop.enum)) {
      const preferred = ["cursor", "claude-opus-4.6", "claude-opus-4"];
      const choice = preferred.find((v) => prop.enum.includes(v)) || prop.enum.find((v) => v !== "other") || prop.enum[0];
      out[key] = choice;
      if (choice === "other") {
        if (key === "model" && props.otherModel) out.otherModel = "claude-opus-4";
        else if (key === "harness" && props.otherHarness) out.otherHarness = "cursor";
      }
    } else if (prop.type === "string") {
      out[key] = prop.maxLength ? "" : "";
    }
  }
  return out;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log("No .colosseum-api-key");
    process.exit(1);
  }
  const res = await fetch(`${API_BASE}/agents/polls/active`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    console.error("polls/active", res.status, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  const poll = data.poll;
  if (!poll) {
    console.log("No active poll.");
    return;
  }
  console.log("Poll:", poll.id, poll.prompt);
  const schema = poll.responseSchema || {};
  const response = buildResponseFromSchema(schema);
  console.log("Response body:", JSON.stringify(response, null, 2));
  if (dryRun) {
    console.log("--dry-run: not submitting.");
    return;
  }
  const submitRes = await fetch(`${API_BASE}/agents/polls/${poll.id}/response`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ response }),
  });
  if (!submitRes.ok) {
    console.error("submit", submitRes.status, await submitRes.text());
    process.exit(1);
  }
  console.log("Submitted poll response (200).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
