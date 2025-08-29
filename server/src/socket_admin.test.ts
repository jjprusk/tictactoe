// © 2025 Joe Pruskowski
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import request from 'supertest';
import { io as Client } from 'socket.io-client';

vi.mock('./logger', () => {
  const base: any = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    level: 'info',
  };
  base.child = vi.fn(() => base);
  base.levels = { values: { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 } };
  return { logger: base };
});

import { app } from './app';
import { buildIoServer } from './bootstrap';
import { attachSocketHandlers } from './socket_handlers';
import { logger as mockLogger } from './logger';

describe('admin log-level endpoint', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = http.createServer(app);
    const io = buildIoServer(server);
    attachSocketHandlers(io);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('rejects without proper admin key', async () => {
    const res = await request(server).post('/admin/log-level').send({ level: 'debug' });
    expect(res.status).toBe(403);
  });

  it('accepts valid level with admin key and emits to sockets', async () => {
    const c = Client(baseUrl, { transports: ['websocket'] });
    const received: any[] = [];
    c.on('admin:log-level', (p) => received.push(p));
    await new Promise<void>((r) => c.on('connect', () => r()));

    const res = await request(server)
      .post('/admin/log-level')
      .set('x-admin-key', process.env.ADMIN_KEY || 'dev-admin-key')
      .send({ level: 'debug' });
    expect(res.status).toBe(200);
    expect(mockLogger.level).toBe('debug');

    // Allow event loop to deliver socket event
    await new Promise((r) => setTimeout(r, 20));
    expect(received.some((p) => p?.level === 'debug')).toBe(true);
    c.disconnect();
  });
});


