// Usage: node agent/forum-comment.cjs <postId> <body>
const https = require('https');
const fs = require('fs');

const apiKey = fs.readFileSync('.colosseum-api-key', 'utf8').replace('COLOSSEUM_API_KEY=', '').trim();
const postId = process.argv[2];
const body = process.argv[3];

if (!postId || !body) {
  console.error('Usage: node agent/forum-comment.cjs <postId> <body>');
  process.exit(1);
}

const data = JSON.stringify({ body });
const url = new URL(`https://agents.colosseum.com/api/forum/posts/${postId}/comments`);

const req = https.request({
  hostname: url.hostname,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let result = '';
  res.on('data', d => result += d);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(result);
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
