// © 2025 Joe Pruskowski
import type http from 'http';
import { buildHttpServer, buildIoServer } from './bootstrap';
import type { Server as SocketIOServer } from 'socket.io';
import { attachSocketHandlers } from './socket_handlers';

export type Servers = { httpServer: http.Server; io: SocketIOServer };

export function createServers(): Servers {
  const httpServer = buildHttpServer();
  const io = buildIoServer(httpServer, {});
  attachSocketHandlers(io);
  return { httpServer, io };
}


