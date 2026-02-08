// Usage: node agent/forum-comment.js <postId> <body>
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function getApiKey() {
  const path = join(ROOT, '.colosseum-api-key');
  const content = readFileSync(path, 'utf8');
  const match = content.match(/COLOSSEUM_API_KEY=(.+)/);
  return match ? match[1].trim() : content.trim();
}

async function main() {
  const postId = process.argv[2];
  let body = process.argv[3];
  if (!postId || !body) {
    console.error('Usage: node forum-comment.js <postId> <body-or-filepath>');
    process.exit(1);
  }
  // If body looks like a file path, read from it
  if (body.endsWith('.txt') || body.endsWith('.md')) {
    const { existsSync } = await import('fs');
    const filePath = join(ROOT, body);
    if (existsSync(filePath)) {
      body = readFileSync(filePath, 'utf8').trim();
    }
  }
  const apiKey = getApiKey();
  const url = `https://agents.colosseum.com/api/forum/posts/${postId}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
  });
  const data = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(data);
}

main().catch(e => { console.error(e); process.exit(1); });
