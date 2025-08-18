// © 2025 Joe Pruskowski
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as Client, Socket } from 'socket.io-client';
import { buildHttpServer, buildIoServer } from './bootstrap';
import { attachSocketHandlers } from './socket_handlers';

function ack<T = any>(s: Socket, event: string, payload: any, timeout = 800): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), timeout);
    s.emit(event, payload, (res: any) => {
      clearTimeout(t);
      resolve(res);
    });
  });
}

describe('socket handlers (extra coverage)', () => {
  let server: ReturnType<typeof buildHttpServer>;
  let url: string;

  beforeAll(async () => {
    server = buildHttpServer();
    const io = buildIoServer(server);
    attachSocketHandlers(io);
    await new Promise<void>((resolve) => server.listen(0, () => resolve()));
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    url = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('room:leave invalid payload returns invalid-payload', async () => {
    const c = Client(url, { transports: ['websocket'] });
    await new Promise<void>((r) => c.on('connect', () => r()));
    const res: any = await ack(c, 'room:leave', {});
    expect(res).toEqual({ ok: false, error: 'invalid-payload' });
    c.disconnect();
  });

  it('move:make invalid payload returns invalid-payload and does not crash', async () => {
    const c = Client(url, { transports: ['websocket'] });
    await new Promise<void>((r) => c.on('connect', () => r()));
    const res: any = await ack(c, 'move:make', {});
    expect(res).toEqual({ ok: false, error: 'invalid-payload' });
    c.disconnect();
  });

  it('disconnect cleanup frees player slot and allows upgrade to player', async () => {
    const p1 = Client(url, { transports: ['websocket'] });
    const p2 = Client(url, { transports: ['websocket'] });
    const obs = Client(url, { transports: ['websocket'] });
    await Promise.all([
      new Promise<void>((r) => p1.on('connect', () => r())),
      new Promise<void>((r) => p2.on('connect', () => r())),
      new Promise<void>((r) => obs.on('connect', () => r())),
    ]);
    await ack(p1, 'room:join', { roomId: 'r-disc' });
    await ack(p2, 'room:join', { roomId: 'r-disc' });
    await ack(obs, 'room:join', { roomId: 'r-disc' });

    // Disconnect one player without sending leave
    p1.disconnect();
    await new Promise((r) => setTimeout(r, 50));

    // Observer should now be able to upgrade to player (allow a few retries for cleanup)
    let up: any = { ok: false, role: 'observer' };
    for (let i = 0; i < 10; i++) {
      try {
        // small delay between retries
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 80));
        // eslint-disable-next-line no-await-in-loop
        up = await ack(obs, 'room:upgrade', { roomId: 'r-disc' });
        if (up.ok && up.role === 'player') break;
      } catch (_) {
        // continue retrying
      }
    }
    expect(up.ok).toBe(true);
    expect(up.role).toBe('player');

    p2.disconnect();
    obs.disconnect();
  });

  it('move:make supports delayed ack in test mode', async () => {
    const c = Client(url, { transports: ['websocket'] });
    await new Promise<void>((r) => c.on('connect', () => r()));
    await ack(c, 'room:join', { roomId: 'r-delay' });
    const start = Date.now();
    const res: any = await ack(c, 'move:make', { roomId: 'r-delay', nonce: 'n-delay', delayMs: 40 }, 1000);
    expect(res).toEqual({ ok: true });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(30);
    c.disconnect();
  });
});


