// © 2025 Joe Pruskowski
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as Client, Socket } from 'socket.io-client';
import { buildHttpServer, buildIoServer } from './bootstrap';
import { attachSocketHandlers } from './socket_handlers';

function emitWithAckTimeout<T = any>(
  socket: Socket,
  event: string,
  payload: any,
  timeoutMs: number
): Promise<{ ok: false; timedOut: true } | T> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ ok: false, timedOut: true } as any);
      }
    }, timeoutMs);
    socket.emit(event, payload, (res: T) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(res);
      }
    });
  });
}

describe('socket flows', () => {
  let server: ReturnType<typeof buildHttpServer>;
  let baseUrl: string;

  beforeAll(async () => {
    server = buildHttpServer();
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

  it('ack timeout: client wrapper times out when server does not ack', async () => {
    const c = Client(baseUrl, { transports: ['websocket'], timeout: 3000 });
    await new Promise<void>((resolve) => c.on('connect', () => resolve()));
    const res = await emitWithAckTimeout(c, 'no:such:event', { x: 1 }, 100);
    expect((res as any).timedOut).toBe(true);
    c.disconnect();
  });

  it('invalid event names time out consistently (multiple tries)', async () => {
    const attempts = 3;
    const c = Client(baseUrl, { transports: ['websocket'], timeout: 3000 });
    await new Promise<void>((resolve) => c.on('connect', () => resolve()));
    const results = await Promise.all(
      Array.from({ length: attempts }, (_, i) =>
        emitWithAckTimeout(c, `unknown:${i}`, { foo: i }, 100)
      )
    );
    results.forEach((r) => expect((r as any).timedOut).toBe(true));
    c.disconnect();
  });

  it('room capacity: first two players, third observer', async () => {
    const c1 = Client(baseUrl, { transports: ['websocket'] });
    const c2 = Client(baseUrl, { transports: ['websocket'] });
    const c3 = Client(baseUrl, { transports: ['websocket'] });
    await Promise.all([
      new Promise<void>((resolve) => c1.on('connect', () => resolve())),
      new Promise<void>((resolve) => c2.on('connect', () => resolve())),
      new Promise<void>((resolve) => c3.on('connect', () => resolve())),
    ]);

    const r1: any = await emitWithAckTimeout(c1, 'room:join', { roomId: 'cap' }, 500);
    const r2: any = await emitWithAckTimeout(c2, 'room:join', { roomId: 'cap' }, 500);
    const r3: any = await emitWithAckTimeout(c3, 'room:join', { roomId: 'cap' }, 500);
    expect(r1.ok && r2.ok && r3.ok).toBe(true);
    expect(r1.role).toBe('player');
    expect(r2.role).toBe('player');
    expect(r3.role).toBe('observer');

    c1.disconnect();
    c2.disconnect();
    c3.disconnect();
  });

  it('reconnect/resume: player can rejoin as player after disconnect', async () => {
    const roomId = 'rejoin';
    const c1 = Client(baseUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => c1.on('connect', () => resolve()));
    const r1: any = await emitWithAckTimeout(c1, 'room:join', { roomId }, 500);
    expect(r1.ok && r1.role === 'player').toBe(true);
    c1.disconnect();

    // reconnect as new socket
    const c1b = Client(baseUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => c1b.on('connect', () => resolve()));
    const r1b: any = await emitWithAckTimeout(c1b, 'room:join', { roomId }, 500);
    expect(r1b.ok && r1b.role === 'player').toBe(true);
    c1b.disconnect();
  });

  it('bad payloads for move:make are rejected', async () => {
    const c = Client(baseUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => c.on('connect', () => resolve()));
    await emitWithAckTimeout(c, 'room:join', { roomId: 'bad' }, 500);
    const r1: any = await emitWithAckTimeout(c, 'move:make', {}, 500);
    expect(r1).toEqual({ ok: false, error: 'invalid-payload' });
    const r2: any = await emitWithAckTimeout(c, 'move:make', { roomId: 'bad' }, 500);
    expect(r2).toEqual({ ok: false, error: 'invalid-payload' });
    c.disconnect();
  });

  // Restart scenario converted to integration test (see src/integration/socket_restart.itest.ts)

  it('simulated latency/dup: concurrent duplicate nonces yield one ok and one duplicate', async () => {
    const c = Client(baseUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => c.on('connect', () => resolve()));
    await emitWithAckTimeout(c, 'room:join', { roomId: 'dup' }, 500);
    const p1 = emitWithAckTimeout(c, 'move:make', { roomId: 'dup', nonce: 'x1' }, 500);
    const p2 = emitWithAckTimeout(c, 'move:make', { roomId: 'dup', nonce: 'x1' }, 500);
    const [r1, r2]: any[] = await Promise.all([p1, p2]);
    const oks = [r1, r2].filter((r) => r.ok === true).length;
    const dups = [r1, r2].filter((r) => r.error === 'duplicate').length;
    expect(oks).toBe(1);
    expect(dups).toBe(1);
    c.disconnect();
  });
});


