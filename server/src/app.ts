// © 2025 Joe Pruskowski
import express from 'express';
import cors from 'cors';
import { appConfig } from './config/env';
import { getMongoClient } from './db/mongo';

export const app = express();

app.use(express.json());
app.use(cors({ origin: appConfig.CORS_ORIGIN }));

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/readyz', (_req, res) => {
  // Minimal readiness until DB/Redis wiring is added
  const mongoReady = getMongoClient() !== null;
  res.json({ ready: mongoReady });
});

// Simple JSON echo to validate express.json() middleware
app.post('/echo', (req, res) => {
  res.json({ body: req.body });
});


