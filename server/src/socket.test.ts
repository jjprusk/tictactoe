// © 2025 Joe Pruskowski
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as Client } from 'socket.io-client';
import { buildHttpServer, buildIoServer } from './bootstrap';

describe('socket.io bootstrap', () => {
  let client: ReturnType<typeof Client> | null = null;

  let server: ReturnType<typeof buildHttpServer>;
  beforeAll(async () => {
    server = buildHttpServer();
    buildIoServer(server); // attach io
    await new Promise<void>((resolve) => server.listen(0, resolve));
  });

  afterAll(async () => {
    if (client && client.connected) client.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('connects and disconnects successfully', async () => {
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const url = `http://localhost:${port}`;

    await new Promise<void>((resolve, reject) => {
      client = Client(url, { transports: ['websocket'], timeout: 3000 });
      client.on('connect', () => {
        expect(client?.connected).toBe(true);
        client?.disconnect();
      });
      client.on('disconnect', () => {
        resolve();
      });
      client.on('connect_error', (err) => reject(err));
    });
  });
});


