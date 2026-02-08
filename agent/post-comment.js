// Usage: node agent/post-comment.js <postId> <bodyText>
const https = require('https');
const fs = require('fs');

const apiKey = fs.readFileSync('.colosseum-api-key', 'utf8').replace('COLOSSEUM_API_KEY=', '').trim();
const postId = process.argv[2];
const body = process.argv[3];

if (!postId || !body) {
  console.error('Usage: node agent/post-comment.js <postId> <bodyText>');
  process.exit(1);
}

const data = JSON.stringify({ body });

const options = {
  hostname: 'agents.colosseum.com',
  path: `/api/forum/posts/${postId}/comments`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => responseData += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(responseData);
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});

req.write(data);
req.end();
