/**
 * Post a forum comment from a file. Usage: node agent/post-comment-from-file.cjs <postId> <filePath>
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const keyPath = path.join(ROOT, '.colosseum-api-key');
const apiKey = fs.readFileSync(keyPath, 'utf8').replace(/COLOSSEUM_API_KEY=/, '').trim();

const postId = process.argv[2];
const filePath = process.argv[3];
if (!postId || !filePath) {
  console.error('Usage: node agent/post-comment-from-file.cjs <postId> <filePath>');
  process.exit(1);
}

const bodyPath = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
const body = fs.readFileSync(bodyPath, 'utf8').trim();

const data = JSON.stringify({ body });
const options = {
  hostname: 'agents.colosseum.com',
  path: `/api/forum/posts/${postId}/comments`,
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = https.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => (responseData += chunk));
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log(responseData);
  });
});
req.on('error', (e) => {
  console.error(e.message);
  process.exit(1);
});
req.write(data);
req.end();
