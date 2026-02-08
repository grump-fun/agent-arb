/**
 * Run the game agent (run.js) in a loop so it keeps playing.
 * Use for perpetual / 24-7 agent: local, VPS, or PM2.
 *
 * Usage: node run-loop.js
 * Env: RUN_INTERVAL_SEC (default 120 = 2 min between runs)
 *      Same as run.js: SOLANA_RPC_URL, AGENT_ARENA_PROGRAM_ID, AGENT_KEYPAIR_PATH
 */

import { spawn } from "child_process";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INTERVAL_SEC = Math.max(60, parseInt(process.env.RUN_INTERVAL_SEC || "120", 10));
const INTERVAL_MS = INTERVAL_SEC * 1000;

function runAgent() {
  return new Promise((resolve, reject) => {
    const child = spawn("node", ["run.js"], {
      cwd: __dirname,
      stdio: "inherit",
      env: { ...process.env },
    });
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
    child.on("error", reject);
  });
}

async function loop() {
  await runAgent();
  setInterval(() => runAgent().catch(console.error), INTERVAL_MS);
  console.log("\nNext run in", INTERVAL_SEC, "s. Ctrl+C to stop.");
}

loop().catch((e) => {
  console.error(e);
  process.exit(1);
});
