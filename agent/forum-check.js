/**
 * Fetch my forum posts and their comments. Usage: node agent/forum-check.js
 * Outputs JSON: { posts: [...], commentsByPost: { postId: [comments] } }
 */

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

async function main() {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("No .colosseum-api-key");
    process.exit(1);
  }
  const headers = { Authorization: `Bearer ${apiKey}` };

  const meRes = await fetch(`${API_BASE}/forum/me/posts`, { headers });
  if (!meRes.ok) {
    console.error("forum/me/posts", meRes.status, await meRes.text());
    process.exit(1);
  }
  const meData = await meRes.json();
  const posts = meData.posts || meData || [];
  const postIds = Array.isArray(posts) ? posts.map((p) => (typeof p === "object" ? p.id : p)) : [];

  const commentsByPost = {};
  for (const postId of postIds) {
    const cRes = await fetch(`${API_BASE}/forum/posts/${postId}/comments`, { headers });
    if (!cRes.ok) {
      commentsByPost[postId] = { error: cRes.status };
      continue;
    }
    const cData = await cRes.json();
    commentsByPost[postId] = cData.comments || cData || [];
  }

  console.log(JSON.stringify({ posts: meData, postIds, commentsByPost }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
