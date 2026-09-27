import http2 from 'node:http2';

export const subscribers = {
  '262011234567890': { city: 'Munich', country: 'Germany', latitude: 48.1351, longitude: 11.5820, cellId: 'MUC-01', technology: '5G' },
  '262021234567891': { city: 'Berlin', country: 'Germany', latitude: 52.5200, longitude: 13.4050, cellId: 'BER-07', technology: '5G' },
  '262031234567892': { city: 'Hamburg', country: 'Germany', latitude: 53.5511, longitude: 9.9937, cellId: 'HAM-03', technology: '4G' }
};

const DEFAULT_LOCATION = {
  city: 'Frankfurt', country: 'Germany', latitude: 50.1109, longitude: 8.6821, cellId: 'DEMO-42', technology: '5G'
};

function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(payload));
}

/**
 * Real HTTP/2 (h2c, cleartext, "prior knowledge") server simulating a telecom
 * UDM location lookup, the same way 3GPP service-based interfaces use HTTP/2
 * without TLS-negotiated ALPN. Clients must speak HTTP/2 directly — see
 * healthcheck.js for how to reach /health without a browser.
 */
export function createServer() {
  return http2.createServer((req, res) => {
    if (req.method !== 'GET') {
      return sendJson(res, 405, { error: 'Method not allowed' });
    }

    if (req.url === '/health') {
      return sendJson(res, 200, { status: 'UP', service: 'udm-mock' });
    }

    const match = req.url.match(/^\/udm\/location\/(\d{14,15})$/);
    if (!match) {
      return sendJson(res, 404, { error: 'Not found' });
    }

    const imsi = match[1];
    const location = subscribers[imsi] ?? DEFAULT_LOCATION;

    sendJson(res, 200, {
      subscriber: { imsi, status: 'ACTIVE' },
      location,
      servedBy: 'UDM-MOCK'
    });
  });
}
