const http = require('http');
const https = require('https');

const PORT = 3789;
const VERIFY_TOKEN = 'innovatehub_verify_2024';
const B4A_HOST = 'parseapi.back4app.com';
const B4A_PATH = '/facebook/webhook';
const B4A_APP_ID = 'lOpBh4pgpWdiYJmAU4aXSNyYYY8d86hxH2hilkWN';

const server = http.createServer((req, res) => {
  // GET = Facebook webhook verification
  if (req.method === 'GET' && req.url.startsWith('/facebook/webhook')) {
    const url = new URL(req.url, 'http://localhost');
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[Webhook Relay] Verification OK');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(challenge);
    } else {
      console.log('[Webhook Relay] Verification FAILED');
      res.writeHead(403);
      res.end('Forbidden');
    }
    return;
  }

  // POST = Facebook webhook event — forward to Back4App
  if (req.method === 'POST' && req.url.startsWith('/facebook/webhook')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      // Respond to Facebook immediately
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('EVENT_RECEIVED');

      // Forward to Back4App with required headers
      const options = {
        hostname: B4A_HOST,
        port: 443,
        path: B4A_PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'X-Parse-Application-Id': B4A_APP_ID,
        },
      };

      const fwd = https.request(options, (fwdRes) => {
        let fwdBody = '';
        fwdRes.on('data', chunk => { fwdBody += chunk; });
        fwdRes.on('end', () => {
          console.log('[Webhook Relay] Forwarded -> Back4App:', fwdRes.statusCode, fwdBody.slice(0, 100));
        });
      });

      fwd.on('error', (err) => {
        console.error('[Webhook Relay] Forward error:', err.message);
      });

      fwd.write(body);
      fwd.end();
    });
    return;
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'webhook-relay' }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`[Webhook Relay] Listening on port ${PORT}`);
});
