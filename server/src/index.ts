// © 2025 Joe Pruskowski
import http from 'http';
import { logger } from './logger';
import { loadConfig } from './config/env';
import { buildMongoClient, connectWithRetry, closeMongoClient } from './db/mongo';
import { app } from './app';
import { buildIoServer } from './bootstrap';
import { attachSocketHandlers } from './socket_handlers';
import { initTracing } from './tracing';
import { closeRedisClient } from './db/redis';

export const httpServer = http.createServer(app);

let shutdownTimer: NodeJS.Timeout | undefined;
let ioInstance: ReturnType<typeof buildIoServer> | undefined;

// Attach Socket.IO to the HTTP server (no events yet; see S023)
try {
  initTracing();
  const appConfig = loadConfig();
  // Attach Socket.IO to the real HTTP server bound to our Express app
  const io = buildIoServer(httpServer, {});
  ioInstance = io;
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

async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, initiating graceful shutdown`);
  try {
    // Stop accepting new connections; disconnect socket.io clients
    try { ioInstance?.close(); } catch (e) { logger.info({ err: (e as Error)?.message }, 'io close failed'); }
    // Close HTTP server and then exit
    httpServer.close(() => {
      logger.info('HTTP server closed; exiting with code 0');
      closeMongoClient().catch((e) => logger.info({ err: (e as Error)?.message }, 'mongo close failed'));
      closeRedisClient().catch((e) => logger.info({ err: (e as Error)?.message }, 'redis close failed'));
      if (shutdownTimer) clearTimeout(shutdownTimer);
      process.exit(0);
    });
    // Fallback: force exit if not closed within timeout (skip in tests)
    if (process.env.NODE_ENV !== 'test') {
      shutdownTimer = setTimeout(() => {
        logger.info('Graceful shutdown timeout exceeded; forcing exit');
        closeMongoClient().catch(() => void 0);
        closeRedisClient().catch(() => void 0);
        process.exit(1);
      }, 5000).unref();
    }
  } catch (e) {
    if (process.env.NODE_ENV !== 'test') process.exit(1);
    logger.info({ err: (e as Error)?.message }, 'graceful shutdown error');
  }
}

process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));


