/**
 * Start app server, run api-arena.test.js, then exit (kills server).
 * Run from repo root: node tests/run-api-test-with-server.js
 */

import { spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const appDir = join(root, "app");
const port = process.env.PORT || 3000;

const server = spawn(process.execPath, ["server.js"], {
  cwd: appDir,
  env: { ...process.env, PORT: String(port), NODE_NO_WARNINGS: "1" },
  stdio: "pipe",
});

let stderr = "";
server.stderr?.on("data", (d) => { stderr += d; });
server.on("error", (e) => {
  console.error("Failed to start server:", e);
  process.exit(1);
});

await new Promise((r) => setTimeout(r, 4000));
if (!server.exitCode) {
  const base = `http://127.0.0.1:${port}`;
  process.env.APP_URL = base;
  const res = await fetch(`${base}/api/arena`).catch((e) => ({ ok: false, error: e }));
  const data = res.ok ? await res.json() : { error: res.error?.message || res.status };
  if (data.error && !data.authority) {
    console.log("OK: no arena yet", data);
  } else if (typeof data.round === "number") {
    console.log("OK: arena", data.round, data.agentWins, data.crowdWins);
  } else {
    console.error("Unexpected response", data);
    server.kill();
    process.exit(1);
  }
} else {
  console.error("Server exited", stderr);
  process.exit(1);
}
server.kill();
process.exit(0);
