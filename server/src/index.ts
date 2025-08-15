// © 2025 Joe Pruskowski
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { appConfig } from './config/env';

const app = express();
app.use(express.json());
app.use(cors({ origin: appConfig.CORS_ORIGIN }));

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/readyz', (_req, res) => {
  // Minimal readiness until DB/Redis wiring is added
  res.json({ ready: true });
});

const server = http.createServer(app);

// Attach Socket.IO to the HTTP server (no events yet; see S023)
export const io = new SocketIOServer(server, {
  cors: { origin: appConfig.CORS_ORIGIN },
});

server.listen(appConfig.SERVER_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${appConfig.SERVER_PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});


