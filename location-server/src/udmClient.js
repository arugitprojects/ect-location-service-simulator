import http2 from 'node:http2';

export class UdmError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'UdmError';
    this.code = code; // 'UNAVAILABLE' | 'TIMEOUT' | 'BAD_RESPONSE'
  }
}

/**
 * Calls the UDM Mock over a real HTTP/2 (h2c) connection.
 * Resolves with the parsed JSON body, or rejects with a UdmError.
 */
export function queryUdm(udmUrl, imsi, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const url = new URL(`/udm/location/${encodeURIComponent(imsi)}`, udmUrl);
    const client = http2.connect(url.origin);
    let settled = false;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      client.close();
      fn(value);
    };

    const timer = setTimeout(() => {
      finish(reject, new UdmError('UDM request timed out', 'TIMEOUT'));
    }, timeoutMs);

    client.on('error', err => {
      finish(reject, new UdmError(`UDM connection failed: ${err.message}`, 'UNAVAILABLE'));
    });

    const req = client.request({ ':method': 'GET', ':path': url.pathname });
    let status;
    let body = '';

    req.on('response', headers => {
      status = headers[':status'];
    });

    req.setEncoding('utf8');
    req.on('data', chunk => { body += chunk; });

    req.on('end', () => {
      if (status !== 200) {
        finish(reject, new UdmError(`UDM responded with status ${status}`, 'BAD_RESPONSE'));
        return;
      }
      try {
        const data = JSON.parse(body);
        if (!data || typeof data !== 'object' || !data.location) {
          finish(reject, new UdmError('Unexpected UDM response shape', 'BAD_RESPONSE'));
          return;
        }
        finish(resolve, data);
      } catch {
        finish(reject, new UdmError('UDM returned invalid JSON', 'BAD_RESPONSE'));
      }
    });

    req.on('error', err => {
      finish(reject, new UdmError(`UDM request failed: ${err.message}`, 'UNAVAILABLE'));
    });

    req.end();
  });
}
