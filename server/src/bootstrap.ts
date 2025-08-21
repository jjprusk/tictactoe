// © 2025 Joe Pruskowski
import http from 'http';
import { Server as SocketIOServer, type ServerOptions } from 'socket.io';
import { app } from './app';
import { appConfig } from './config/env';

export function buildHttpServer(): http.Server {
  return http.createServer(app);
}

export function buildIoServer(server: http.Server, options?: Partial<ServerOptions>): SocketIOServer {
  // Configure Socket.IO CORS for browser clients (5173 by default)
  const corsOrigin = appConfig.CORS_ORIGIN;
  return new SocketIOServer(server, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    ...(options ?? {}),
  });
}


