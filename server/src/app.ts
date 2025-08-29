// © 2025 Joe Pruskowski
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './logger';
import { bus } from './bus';
import { z } from 'zod';
import { appConfig } from './config/env';
import { getMongoClient } from './db/mongo';
import { getRedisClient } from './db/redis';
import { randomUUID } from 'crypto';
import { getMetricsText, recordHttpMetricsMiddleware } from './metrics';
import type { MongoClient } from 'mongodb';

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

// Batched client logs endpoint
app.post('/logs/batch', (req, res) => {
  const arr = Array.isArray(req.body) ? req.body : null;
  if (!arr || arr.length === 0) {
    res.status(400).json({ ok: false, error: 'invalid-payload' });
    return;
  }
  for (const item of arr) {
    const parsed = clientLogSchema.safeParse(item);
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
  }
  res.status(204).end();
});

// Admin: change log level (simple shared-key auth)
const logLevelSchema = z.object({ level: z.enum(['trace','debug','info','warn','error','fatal','silent']) });
app.post('/admin/log-level', (req, res) => {
  const adminKey = (req.headers['x-admin-key'] as string | undefined)?.trim();
  const expected = process.env.ADMIN_KEY || 'dev-admin-key';
  if (!adminKey || adminKey !== expected) {
    res.status(403).json({ ok: false, error: 'forbidden' });
    return;
  }
  const parsed = logLevelSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'invalid-payload' });
    return;
  }
  logger.level = parsed.data.level;
  // Notify other modules (e.g., socket handlers) to propagate change
  try { bus.emit('log-level-changed', logger.level as unknown as 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent'); } catch {
    // ignore
  }
  res.json({ ok: true, level: logger.level });
});

// Admin: export logs as JSON or CSV (streaming)
const exportQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  level: z.enum(['trace','debug','info','warn','error','fatal']).optional(),
  format: z.enum(['json','csv']).default('json'),
});

app.get('/admin/logs/export', async (req, res) => {
  const adminKey = (req.headers['x-admin-key'] as string | undefined)?.trim();
  const expected = process.env.ADMIN_KEY || 'dev-admin-key';
  if (!adminKey || adminKey !== expected) {
    res.status(403).json({ ok: false, error: 'forbidden' });
    return;
  }
  const parsed = exportQuerySchema.safeParse({
    from: req.query.from,
    to: req.query.to,
    level: req.query.level,
    format: req.query.format ?? 'json',
  });
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'invalid-query' });
    return;
  }
  const { from, to, level, format } = parsed.data;
  const client = getMongoClient() as MongoClient | null;
  if (!client) {
    res.status(503).json({ ok: false, error: 'mongo-unavailable' });
    return;
  }
  const coll = client.db('tictactoe').collection('logs');
  type DateRange = { $gte?: Date; $lte?: Date };
  const query: { level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'; createdAt?: DateRange } = {};
  if (level) query.level = level;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = from;
    if (to) query.createdAt.$lte = to;
  }
  const cursorRaw = coll.find(query as Record<string, unknown>).sort({ createdAt: 1 }).batchSize(1000);
  type ExportLog = { createdAt?: Date | string | number; level?: string; message?: unknown; gameId?: string; sessionId?: string; source?: string; origin?: string; _id?: unknown };
  const cursorIter: AsyncIterable<ExportLog> = cursorRaw as unknown as AsyncIterable<ExportLog>;

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.write('[');
    let first = true;
    for await (const doc of cursorIter) {
      const safe: Record<string, unknown> = { ...doc, _id: undefined };
      res.write((first ? '' : ',') + JSON.stringify(safe));
      first = false;
    }
    res.write(']');
    res.end();
    return;
  }

  // CSV
  res.setHeader('Content-Type', 'text/csv');
  // Fixed header set for known fields; unknown context keys omitted
  const headers = ['createdAt','level','message','gameId','sessionId','source'];
  res.write(headers.join(',') + '\n');
  for await (const doc of cursorIter) {
    const createdAtValue = new Date(doc.createdAt as unknown as Date).toISOString();
    const levelValue = doc.level ?? '';
    const messageText = String((doc as Record<string, unknown>).message ?? '').replaceAll('\n',' ').replaceAll('"','""');
    const gameIdValue = doc.gameId ?? '';
    const sessionIdValue = doc.sessionId ?? '';
    const sourceValue = doc.source ?? doc.origin ?? 'server';
    const row = [
      createdAtValue,
      levelValue,
      messageText,
      gameIdValue,
      sessionIdValue,
      sourceValue,
    ];
    // CSV quoting
    res.write(row.map((v) => `"${String(v)}"`).join(',') + '\n');
  }
  res.end();
});


