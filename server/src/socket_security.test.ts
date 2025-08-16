// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import { io as Client } from 'socket.io-client';
import { buildHttpServer, buildIoServer } from './bootstrap';
import { attachSocketHandlers } from './socket_handlers';

describe('security/transport', () => {
  it('rejects disallowed origin via allowRequest', async () => {
    const server = buildHttpServer();
    const io = buildIoServer(server, {
      allowRequest: (req, callback) => {
        const origin = req.headers.origin || '';
        callback(null, origin === 'http://allowed.test');
      },
    });
    attachSocketHandlers(io);
    await new Promise<void>((resolve) => server.listen(0, () => resolve()));
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const url = `http://localhost:${port}`;

    await new Promise<void>((resolve) => {
      const c = Client(url, {
        transports: ['websocket'],
        extraHeaders: { Origin: 'http://bad.test' },
        timeout: 1000,
      });
      c.on('connect', () => {
        // Should not connect
        expect(true).toBe(false);
      });
      c.on('connect_error', () => {
        resolve();
      });
    });

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('connects using polling-only transport', async () => {
    const server = buildHttpServer();
    const io = buildIoServer(server, {});
    attachSocketHandlers(io);
    await new Promise<void>((resolve) => server.listen(0, () => resolve()));
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const url = `http://localhost:${port}`;

    await new Promise<void>((resolve, reject) => {
      const c = Client(url, { transports: ['polling'], timeout: 3000 });
      c.on('connect', () => {
        c.disconnect();
      });
      c.on('disconnect', () => resolve());
      c.on('connect_error', reject);
    });

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});


