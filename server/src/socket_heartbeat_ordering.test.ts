// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import { io as Client, Socket } from 'socket.io-client';
import { buildHttpServer, buildIoServer } from './bootstrap';
import { attachSocketHandlers } from './socket_handlers';

function ack<T = any>(s: Socket, event: string, payload: any, timeout = 1000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), timeout);
    s.emit(event, payload, (res: any) => {
      clearTimeout(t);
      resolve(res);
    });
  });
}

describe('heartbeats and ordering/races', () => {
  it('stale client cleanup releases player slot (low ping timeouts)', async () => {
    const server = buildHttpServer();
    const io = buildIoServer(server, { pingInterval: 100, pingTimeout: 200 });
    attachSocketHandlers(io);
    await new Promise<void>((resolve) => server.listen(0, () => resolve()));
    const port = (server.address() as any).port as number;
    const url = `http://localhost:${port}`;

    const p1 = Client(url, { transports: ['websocket'] });
    const p2 = Client(url, { transports: ['websocket'] });
    const obs = Client(url, { transports: ['websocket'] });
    await Promise.all([
      new Promise<void>((resolve) => p1.on('connect', () => resolve())),
      new Promise<void>((resolve) => p2.on('connect', () => resolve())),
      new Promise<void>((resolve) => obs.on('connect', () => resolve())),
    ]);

    const j1: any = await ack(p1, 'room:join', { roomId: 'hb' });
    const j2: any = await ack(p2, 'room:join', { roomId: 'hb' });
    const jo: any = await ack(obs, 'room:join', { roomId: 'hb' });
    expect(j1.role).toBe('player');
    expect(j2.role).toBe('player');
    expect(jo.role).toBe('observer');

    // Simulate stale client: hard-close underlying transport, let server heartbeat detect it
    // @ts-ignore - engine internals for test only
    p1.io.engine.transport.close();

    // Wait longer than pingTimeout for cleanup
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 400));

    const up: any = await ack(obs, 'room:upgrade', { roomId: 'hb' });
    expect(up.ok).toBe(true);
    expect(up.role).toBe('player');

    p2.disconnect();
    obs.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('ordering: delayed ack returns after immediate ack', async () => {
    const server = buildHttpServer();
    const io = buildIoServer(server, {});
    attachSocketHandlers(io);
    await new Promise<void>((resolve) => server.listen(0, () => resolve()));
    const port = (server.address() as any).port as number;
    const url = `http://localhost:${port}`;

    const c = Client(url, { transports: ['websocket'] });
    await new Promise<void>((resolve) => c.on('connect', () => resolve()));
    await ack(c, 'room:join', { roomId: 'ord' });

    const start = Date.now();
    const pFast = ack(c, 'move:make', { roomId: 'ord', nonce: 'fast', delayMs: 0 });
    const pSlow = ack(c, 'move:make', { roomId: 'ord', nonce: 'slow', delayMs: 50 });
    const [r1, r2] = await Promise.all([pFast, pSlow]);
    expect(r1).toEqual({ ok: true });
    expect(r2).toEqual({ ok: true });
    const took = Date.now() - start;
    expect(took).toBeGreaterThanOrEqual(50);

    c.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});


