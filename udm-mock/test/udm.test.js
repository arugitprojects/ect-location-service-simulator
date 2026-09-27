import test from 'node:test';
import assert from 'node:assert/strict';
import http2 from 'node:http2';
import { createServer } from '../src/app.js';

function get(origin, path) {
  return new Promise((resolve, reject) => {
    const client = http2.connect(origin);
    client.on('error', reject);
    const req = client.request({ ':method': 'GET', ':path': path });
    let status;
    let body = '';
    req.on('response', headers => { status = headers[':status']; });
    req.setEncoding('utf8');
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      client.close();
      resolve({ status, body: JSON.parse(body) });
    });
    req.on('error', reject);
    req.end();
  });
}

async function withServer(fn) {
  const server = createServer();
  await new Promise(resolve => server.listen(0, resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
  }
}

test('GET /health reports UP over real HTTP/2', async () => {
  await withServer(async origin => {
    const res = await get(origin, '/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'UP');
  });
});

test('GET /udm/location/:imsi returns a known subscriber', async () => {
  await withServer(async origin => {
    const res = await get(origin, '/udm/location/262011234567890');
    assert.equal(res.status, 200);
    assert.equal(res.body.location.city, 'Munich');
    assert.equal(res.body.subscriber.imsi, '262011234567890');
  });
});

test('GET /udm/location/:imsi falls back to a default for unknown subscribers', async () => {
  await withServer(async origin => {
    const res = await get(origin, '/udm/location/999999999999999');
    assert.equal(res.status, 200);
    assert.equal(res.body.location.city, 'Frankfurt');
  });
});

test('GET /udm/location/:imsi with an invalid IMSI returns 404', async () => {
  await withServer(async origin => {
    const res = await get(origin, '/udm/location/not-an-imsi');
    assert.equal(res.status, 404);
  });
});
