/**
 * Run Colosseum heartbeat every 30 minutes (per skill).
 * Keeps running until stopped. Use for a long-lived process (local, VPS, or PM2).
 * Usage: node heartbeat-loop.js
 */

import { spawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INTERVAL_MS = 30 * 60 * 1000; // 30 min

function runHeartbeat() {
  return new Promise((resolve, reject) => {
    const child = spawn("node", ["heartbeat.js"], {
      cwd: __dirname,
      stdio: "inherit",
      env: { ...process.env },
    });
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
    child.on("error", reject);
  });
}

async function loop() {
  await runHeartbeat();
  setInterval(() => runHeartbeat().catch(console.error), INTERVAL_MS);
  console.log("\nNext run in 30 min. Ctrl+C to stop.");
}

loop().catch((e) => {
  console.error(e);
  process.exit(1);
});
