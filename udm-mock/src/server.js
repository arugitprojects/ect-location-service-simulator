import { createServer } from './app.js';

const PORT = process.env.PORT || 8080;

const server = createServer();

server.listen(PORT, () => {
  console.log(`UDM Mock HTTP/2 (h2c) listening on :${PORT}`);
});
