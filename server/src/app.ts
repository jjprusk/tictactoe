// © 2025 Joe Pruskowski
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './logger';
import { z } from 'zod';
import { appConfig } from './config/env';
import { getMongoClient } from './db/mongo';
import { getRedisClient } from './db/redis';
import { randomUUID } from 'crypto';
import { getMetricsText, recordHttpMetricsMiddleware } from './metrics';

export const app = express();

app.use(express.json());
app.use(cors({ origin: appConfig.CORS_ORIGIN }));
// Ensure every response has an x-request-id header and attach it to req for downstream tools
app.use((req, res, next) => {
  const headerId = req.headers['x-request-id'];
  const candidate = typeof headerId === 'string' ? headerId : Array.isArray(headerId) ? headerId[0] : undefined;
  const id = candidate && candidate.trim().length > 0 ? candidate.trim() : randomUUID();
  res.setHeader('x-request-id', id);
  (req as unknown as { id?: string }).id = id;
  next();
});
app.use(
  helmet({
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'no-referrer' },
    xssFilter: true,
    noSniff: true,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", appConfig.CORS_ORIGIN],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);
app.use(recordHttpMetricsMiddleware());
app.use(
  pinoHttp({
    logger,
  })
);

app.get('/', (_req, res) => {
  res.json({ message: 'Hello, TicTacToe' });
});

app.get('/metrics', async (_req, res) => {
  const body = await getMetricsText();
  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(body);
});

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/readyz', (_req, res) => {
  const mongoReady = getMongoClient() !== null;
  const redisReady = getRedisClient() !== null;
  res.json({ ready: mongoReady && redisReady, mongo: mongoReady, redis: redisReady });
});

// Simple JSON echo to validate express.json() middleware
app.post('/echo', (req, res) => {
  res.json({ body: req.body });
});

// Accept client-side logs and write to server LOG via pino
const clientLogSchema = z.object({
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  message: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional(),
});

app.post('/logs', (req, res) => {
  const parsed = clientLogSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'invalid-payload' });
    return;
  }
  const { level, message, context } = parsed.data;
  const ctx: Record<string, unknown> = context ?? {};
  switch (level) {
    case 'trace':
      logger.trace(ctx, message);
      break;
    case 'debug':
      logger.debug(ctx, message);
      break;
    case 'info':
      logger.info(ctx, message);
      break;
    case 'warn':
      logger.warn(ctx, message);
      break;
    case 'error':
      logger.error(ctx, message);
      break;
    case 'fatal':
      logger.fatal(ctx, message);
      break;
  }
  res.status(204).end();
});


