// © 2025 Joe Pruskowski
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { appConfig } from './config/env';
import { app } from './app';
import { attachSocketHandlers } from './socket_handlers';

export const httpServer = http.createServer(app);

// Attach Socket.IO to the HTTP server (no events yet; see S023)
export const io = new SocketIOServer(httpServer, {
  cors: { origin: appConfig.CORS_ORIGIN },
});
attachSocketHandlers(io);

httpServer.listen(appConfig.SERVER_PORT, () => {
  // eslint-disable-next-line no-console
  const addr = httpServer.address();
  const port = typeof addr === 'object' && addr ? addr.port : appConfig.SERVER_PORT;
  console.log(`Server listening on http://localhost:${port}`);
});

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0));
});


