// © 2025 Joe Pruskowski
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { loadConfig } from './config/env';
import { buildMongoClient, connectWithRetry } from './db/mongo';
import { app } from './app';
import { attachSocketHandlers } from './socket_handlers';

export const httpServer = http.createServer(app);

// Attach Socket.IO to the HTTP server (no events yet; see S023)
let io: SocketIOServer;
try {
  const appConfig = loadConfig();
  io = new SocketIOServer(httpServer, {
    cors: { origin: appConfig.CORS_ORIGIN },
  });
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
    // eslint-disable-next-line no-console
    const addr = httpServer.address();
    const port = typeof addr === 'object' && addr ? addr.port : appConfig.SERVER_PORT;
    console.log(`Server listening on http://localhost:${port}`);
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


