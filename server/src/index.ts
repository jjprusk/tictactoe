// © 2025 Joe Pruskowski
import http from 'http';
import { logger } from './logger';
import { loadConfig } from './config/env';
import { buildMongoClient, connectWithRetry } from './db/mongo';
import { app } from './app';
import { createServers } from './server_factory';

export const httpServer = http.createServer(app);

// Attach Socket.IO to the HTTP server (no events yet; see S023)
try {
  const appConfig = loadConfig();
  // Build Socket.IO via factory to ease testing
  const built = createServers();
  // close the temporary http created by factory and reuse our app-bound server
  built.httpServer.close();

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

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0));
});


