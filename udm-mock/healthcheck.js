// Docker/Render HEALTHCHECK probe. Plain curl/wget can't speak cleartext
// HTTP/2 "prior knowledge", so this uses Node's http2 client, same as the
// Location Server does for the real /udm/location lookup.
import http2 from 'node:http2';

const port = process.env.PORT || 8080;
const client = http2.connect(`http://127.0.0.1:${port}`);

setTimeout(() => process.exit(1), 2000);

client.on('error', () => {
  process.exit(1);
});

const req = client.request({ ':method': 'GET', ':path': '/health' });
let status;
req.on('response', headers => { status = headers[':status']; });
req.resume();
req.on('end', () => {
  client.close();
  process.exit(status === 200 ? 0 : 1);
});
req.on('error', () => process.exit(1));
req.end();
