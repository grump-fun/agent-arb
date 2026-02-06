/**
 * Minimal test: app /api/arena returns JSON (arena or error).
 * Run: node tests/api-arena.test.js (no framework) or with a test runner.
 */

async function test() {
  const base = process.env.APP_URL || "http://localhost:3000";
  const res = await fetch(`${base}/api/arena`);
  const data = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (data.error && !data.authority) {
    console.log("OK: no arena yet", data);
    return;
  }
  if (typeof data.round !== "number") throw new Error("Missing arena.round");
  console.log("OK: arena", data.round, data.agentWins, data.crowdWins);
}

test().catch((e) => {
  console.error(e);
  process.exit(1);
});
