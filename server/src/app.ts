// © 2025 Joe Pruskowski
import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { logger } from './logger';
import { z } from 'zod';
import { appConfig } from './config/env';
import { getMongoClient } from './db/mongo';

export const app = express();

app.use(express.json());
app.use(cors({ origin: appConfig.CORS_ORIGIN }));
app.use(pinoHttp({ logger }));

app.get('/', (_req, res) => {
  res.json({ message: 'Hello, TicTacToe' });
});

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

// Accept client-side logs and write to server LOG via pino
const clientLogSchema = z.object({
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  message: z.string().min(1),
  context: z.record(z.string(), z.any()).optional(),
});

app.post('/logs', (req, res) => {
  const parsed = clientLogSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'invalid-payload' });
    return;
  }
  const { level, message, context } = parsed.data;
  (logger as any)[level](context ?? {}, message);
  res.status(204).end();
});


