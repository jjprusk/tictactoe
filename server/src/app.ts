// © 2025 Joe Pruskowski
import express from 'express';
import cors from 'cors';
import { appConfig } from './config/env';

export const app = express();

app.use(express.json());
app.use(cors({ origin: appConfig.CORS_ORIGIN }));

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/readyz', (_req, res) => {
  // Minimal readiness until DB/Redis wiring is added
  res.json({ ready: true });
});


