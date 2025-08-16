// © 2025 Joe Pruskowski
import http from 'http';
import { Server as SocketIOServer, type ServerOptions } from 'socket.io';
import { app } from './app';

export function buildHttpServer(): http.Server {
  return http.createServer(app);
}

export function buildIoServer(server: http.Server, options?: Partial<ServerOptions>): SocketIOServer {
  // CORS is already handled at Express layer for HTTP; Socket.IO needs its own CORS for browser clients
  return new SocketIOServer(server, { ...(options ?? {}) });
}


