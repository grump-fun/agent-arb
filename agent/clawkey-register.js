/**
 * ClawKey verification — https://clawkey.ai/skill.md
 * Builds AgentChallenge (Ed25519 signed), POSTs to /agent/register/init,
 * outputs registration URL for the human. Do NOT open the URL in a browser.
 *
 * Usage: node clawkey-register.js
 * Identity: agent/.clawkey-device.json (or ~/.openclaw/identity/device.json)
 */

import crypto from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const API_BASE = "https://api.clawkey.ai/v1";

const IDENTITY_PATHS = [
  join(ROOT, ".clawkey-device.json"),
  join(process.env.HOME || process.env.USERPROFILE || "", ".openclaw", "identity", "device.json"),
];

function loadOrCreateIdentity() {
  for (const p of IDENTITY_PATHS) {
    if (existsSync(p)) {
      const raw = readFileSync(p, "utf8");
      const id = JSON.parse(raw);
      if (id.deviceId && id.publicKeyPem && id.privateKeyPem) return { identity: id, path: p };
    }
  }
  // Create new identity (agent/.clawkey-device.json)
  const path = join(ROOT, ".clawkey-device.json");
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" });
  const deviceId = "agent-arena-" + crypto.createHash("sha256").update(publicKeyPem).digest("hex").slice(0, 16);
  const identity = { deviceId, publicKeyPem, privateKeyPem };
  writeFileSync(path, JSON.stringify(identity, null, 2), "utf8");
  console.error("Created new ClawKey identity at", path);
  return { identity, path };
}

function buildChallenge(identity) {
  const message = `clawkey-register-${Date.now()}`;
  const privateKey = crypto.createPrivateKey(identity.privateKeyPem);
  const signature = crypto.sign(null, Buffer.from(message, "utf8"), privateKey);
  const publicKeyObj = crypto.createPublicKey(identity.publicKeyPem);
  const publicKeyDer = publicKeyObj.export({ type: "spki", format: "der" });

  return {
    deviceId: identity.deviceId,
    publicKey: publicKeyDer.toString("base64"),
    message,
    signature: signature.toString("base64"),
    timestamp: Date.now(),
  };
}

async function main() {
  const { identity } = loadOrCreateIdentity();
  const challenge = buildChallenge(identity);

  const res = await fetch(`${API_BASE}/agent/register/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(challenge),
  });

  const body = await res.json().catch(() => ({}));

  if (res.status === 409) {
    console.error("Agent already registered (deviceId exists).", body.error || body);
    process.exit(1);
  }
  if (!res.ok) {
    console.error("Register init failed:", res.status, body);
    process.exit(1);
  }

  const { sessionId, registrationUrl, expiresAt } = body;
  if (!registrationUrl) {
    console.error("No registrationUrl in response:", body);
    process.exit(1);
  }

  console.error("Session:", sessionId);
  console.error("Expires:", expiresAt);
  console.error("");
  console.error("Open this link to complete verification (VeryAI palm). Do not share; single-use.");
  console.error("");
  console.log(registrationUrl);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
