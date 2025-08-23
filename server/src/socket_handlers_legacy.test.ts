// © 2025 Joe Pruskowski
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import { io as Client } from 'socket.io-client';
import { buildHttpServer, buildIoServer } from './bootstrap';
import { attachSocketHandlers } from './socket_handlers';

async function waitConnect(socket: any): Promise<void> {
  await new Promise<void>((r) => socket.on('connect', () => r()));
}

async function emitAck<TReq, TAck>(socket: any, event: string, payload: TReq, timeoutMs = 500): Promise<TAck> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('ack-timeout')), timeoutMs);
    socket.emit(event, payload, (ack: TAck) => {
      clearTimeout(t);
      resolve(ack);
    });
  });
}

describe('legacy socket handlers (room:* and move:make)', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = buildHttpServer();
    const io = buildIoServer(server);
    attachSocketHandlers(io);
    await new Promise<void>((r) => server.listen(0, () => r()));
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((r) => server.close(() => r()));
  });

  beforeEach(() => {
    // Clear any rate limit env between tests
    delete (process as any).env.TEST_RATE_LIMIT;
    delete (process as any).env.TEST_RATE_WINDOW_MS;
  });

  it('room join/leave/upgrade assigns roles correctly and validates payloads', async () => {
    const c1 = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c1);
    // invalid payload path
    const badJoin: any = await emitAck(c1, 'room:join', {} as any);
    expect(badJoin).toEqual({ ok: false, error: 'invalid-payload' });
    // first two become players
    const j1: any = await emitAck(c1, 'room:join', { roomId: 'r1' });
    expect(j1).toMatchObject({ ok: true, role: 'player' });
    const c2 = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c2);
    const j2: any = await emitAck(c2, 'room:join', { roomId: 'r1' });
    expect(j2).toMatchObject({ ok: true, role: 'player' });
    // third is observer
    const c3 = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c3);
    const j3: any = await emitAck(c3, 'room:join', { roomId: 'r1' });
    expect(j3).toMatchObject({ ok: true, role: 'observer' });
    // upgrade path validates
    const badUp: any = await emitAck(c3, 'room:upgrade', {} as any);
    expect(badUp).toEqual({ ok: false, error: 'invalid-payload' });
    // leave c2 to free a player slot, then upgrade observer to player
    const l2: any = await emitAck(c2, 'room:leave', { roomId: 'r1' });
    expect(l2).toEqual({ ok: true });
    const up3: any = await emitAck(c3, 'room:upgrade', { roomId: 'r1' });
    expect(up3).toMatchObject({ ok: true, role: 'player' });
    c1.disconnect();
    c2.disconnect();
    c3.disconnect();
  });

  it('move:make returns duplicate error on repeated nonce and ok on first', async () => {
    const c = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c);
    const j: any = await emitAck(c, 'room:join', { roomId: 'r2' });
    expect(j.ok).toBe(true);
    const ok: any = await emitAck(c, 'move:make', { roomId: 'r2', nonce: 'n1' });
    expect(ok).toEqual({ ok: true });
    const dup: any = await emitAck(c, 'move:make', { roomId: 'r2', nonce: 'n1' });
    expect(dup).toEqual({ ok: false, error: 'duplicate' });
    c.disconnect();
  });

  it('rate limits legacy move:make when TEST_RATE_LIMIT is set', async () => {
    const OLD_LIMIT = process.env.TEST_RATE_LIMIT;
    const OLD_WIN = process.env.TEST_RATE_WINDOW_MS;
    process.env.TEST_RATE_LIMIT = '1';
    process.env.TEST_RATE_WINDOW_MS = '1000';
    const localServer = buildHttpServer();
    const localIo = buildIoServer(localServer);
    attachSocketHandlers(localIo);
    await new Promise<void>((r) => localServer.listen(0, () => r()));
    const addr = localServer.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const url = `http://localhost:${port}`;
    try {
      const c = Client(url, { transports: ['websocket'] });
      await waitConnect(c);
      const j: any = await emitAck(c, 'room:join', { roomId: 'r3' });
      expect(j.ok).toBe(true);
      const ok: any = await emitAck(c, 'move:make', { roomId: 'r3', nonce: 'a' });
      expect(ok).toEqual({ ok: true });
      const rate: any = await emitAck(c, 'move:make', { roomId: 'r3', nonce: 'b' });
      expect(rate).toEqual({ ok: false, error: 'rate-limit' });
      c.disconnect();
    } finally {
      if (OLD_LIMIT !== undefined) process.env.TEST_RATE_LIMIT = OLD_LIMIT; else delete process.env.TEST_RATE_LIMIT;
      if (OLD_WIN !== undefined) process.env.TEST_RATE_WINDOW_MS = OLD_WIN; else delete process.env.TEST_RATE_WINDOW_MS;
      await new Promise<void>((r) => localIo.close(() => localServer.close(() => r())));
    }
  });
});


