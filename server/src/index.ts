// © 2025 Joe Pruskowski
import http from 'http';
import { logger } from './logger';
import { loadConfig } from './config/env';
import { buildMongoClient, connectWithRetry } from './db/mongo';
import { app } from './app';
import { buildIoServer } from './bootstrap';
import { attachSocketHandlers } from './socket_handlers';
import { initTracing } from './tracing';

export const httpServer = http.createServer(app);

// Attach Socket.IO to the HTTP server (no events yet; see S023)
try {
  initTracing();
  const appConfig = loadConfig();
  // Attach Socket.IO to the real HTTP server bound to our Express app
  const io = buildIoServer(httpServer, {});
  attachSocketHandlers(io);

  // Kick off Mongo connection with retry, but do not block server listening
  const mongoClient = buildMongoClient(appConfig.MONGO_URI);
  void connectWithRetry(mongoClient, {
    maxRetries: appConfig.MONGO_MAX_RETRIES,
    initialDelayMs: appConfig.MONGO_RETRY_INITIAL_MS,
    maxDelayMs: appConfig.MONGO_RETRY_MAX_MS,
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[mongo] failed to connect after retries:', (err as Error).message);
  });

  httpServer.listen(appConfig.SERVER_PORT, () => {
    const addr = httpServer.address();
    const port = typeof addr === 'object' && addr ? addr.port : appConfig.SERVER_PORT;
    logger.info({ port }, 'server started');
  });
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('[startup] Invalid environment configuration:', (err as Error).message);
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  } else {
    throw err;
  }
}

function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, initiating graceful shutdown`);
  httpServer.close(() => {
    logger.info('HTTP server closed; exiting with code 0');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));


