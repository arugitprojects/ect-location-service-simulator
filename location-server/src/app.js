import express from 'express';
import cors from 'cors';
import { queryUdm, UdmError } from './udmClient.js';

const IMSI_PATTERN = /^\d{14,15}$/;

export function isValidImsi(imsi) {
  return typeof imsi === 'string' && IMSI_PATTERN.test(imsi);
}

/**
 * Builds the Express app. UDM connection details are injectable so tests
 * can point the app at an in-process mock UDM instead of a real network call.
 */
export function createApp({
  udmUrl = process.env.UDM_URL || 'http://localhost:8080',
  udmTimeoutMs = Number(process.env.UDM_TIMEOUT_MS) || 3000
} = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'UP', service: 'location-server' });
  });

  app.post('/api/location', async (req, res) => {
    const { imsi } = req.body ?? {};

    if (imsi === undefined || imsi === null || imsi === '') {
      return res.status(400).json({ error: 'imsi is required' });
    }
    if (!isValidImsi(imsi)) {
      return res.status(400).json({ error: 'imsi must contain 14 or 15 digits' });
    }

    const started = Date.now();
    try {
      const udm = await queryUdm(udmUrl, imsi, udmTimeoutMs);
      res.json({
        imsi,
        location: udm.location,
        subscriber: udm.subscriber,
        source: 'UDM-MOCK',
        protocol: 'HTTP/2 (h2c)',
        latencyMs: Date.now() - started
      });
    } catch (err) {
      if (err instanceof UdmError) {
        const status = err.code === 'TIMEOUT' ? 504 : 502;
        return res.status(status).json({ error: 'UDM integration failed', detail: err.message });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Handles malformed JSON bodies and any other unexpected errors.
  app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Malformed JSON body' });
    }
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
