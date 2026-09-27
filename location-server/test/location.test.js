import test from 'node:test';
import assert from 'node:assert/strict';
import http2 from 'node:http2';
import request from 'supertest';
import { createApp } from '../src/app.js';

function startMockUdm({ status = 200, body, delayMs = 0 } = {}) {
  const server = http2.createServer((req, res) => {
    setTimeout(() => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body ?? {
        subscriber: { imsi: '262011234567890', status: 'ACTIVE' },
        location: { city: 'Munich', country: 'Germany', cellId: 'MUC-01' }
      }));
    }, delayMs);
  });
  return new Promise(resolve => server.listen(0, () => resolve(server)));
}

test('GET /health reports UP', async () => {
  const app = createApp({ udmUrl: 'http://127.0.0.1:1' });
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'UP');
});

test('POST /api/location rejects a missing imsi', async () => {
  const app = createApp({ udmUrl: 'http://127.0.0.1:1' });
  const res = await request(app).post('/api/location').send({});
  assert.equal(res.status, 400);
});

test('POST /api/location rejects a malformed imsi', async () => {
  const app = createApp({ udmUrl: 'http://127.0.0.1:1' });
  const res = await request(app).post('/api/location').send({ imsi: '123abc' });
  assert.equal(res.status, 400);
});

test('POST /api/location returns location data on a successful UDM call', async () => {
  const udm = await startMockUdm();
  const { port } = udm.address();
  const app = createApp({ udmUrl: `http://127.0.0.1:${port}` });

  const res = await request(app).post('/api/location').send({ imsi: '262011234567890' });

  assert.equal(res.status, 200);
  assert.equal(res.body.imsi, '262011234567890');
  assert.equal(res.body.location.city, 'Munich');
  assert.equal(res.body.protocol, 'HTTP/2 (h2c)');

  udm.close();
});

test('POST /api/location returns 502 when the UDM is unreachable', async () => {
  const app = createApp({ udmUrl: 'http://127.0.0.1:1', udmTimeoutMs: 1000 });
  const res = await request(app).post('/api/location').send({ imsi: '262011234567890' });
  assert.equal(res.status, 502);
});

test('POST /api/location returns 504 when the UDM times out', async () => {
  const udm = await startMockUdm({ delayMs: 300 });
  const { port } = udm.address();
  const app = createApp({ udmUrl: `http://127.0.0.1:${port}`, udmTimeoutMs: 50 });

  const res = await request(app).post('/api/location').send({ imsi: '262011234567890' });
  assert.equal(res.status, 504);

  udm.close();
});

test('POST /api/location returns 502 on an unexpected UDM response', async () => {
  const udm = await startMockUdm({ body: { not: 'a location payload' } });
  const { port } = udm.address();
  const app = createApp({ udmUrl: `http://127.0.0.1:${port}` });

  const res = await request(app).post('/api/location').send({ imsi: '262011234567890' });
  assert.equal(res.status, 502);

  udm.close();
});
