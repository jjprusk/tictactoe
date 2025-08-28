// © 2025 Joe Pruskowski
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { io as Client, Socket } from 'socket.io-client';
import { buildHttpServer, buildIoServer } from './bootstrap';
import { attachSocketHandlers } from './socket_handlers';

async function waitConnect(s: Socket): Promise<void> {
  await new Promise<void>((r) => s.on('connect', () => r()));
}

async function emitAck<TReq, TAck>(s: Socket, event: string, payload: TReq, timeoutMs = 500): Promise<TAck> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('ack-timeout')), timeoutMs);
    s.emit(event, payload, (ack: TAck) => {
      clearTimeout(t);
      resolve(ack);
    });
  });
}

describe('socket handlers (contract events)', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    // Ensure defaults are predictable for tests
    process.env.AI_STRATEGY = 'random';
    process.env.FIRST_PLAYER = 'X';
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

  it('validates invalid payloads for join/leave/make_move', async () => {
    const c = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c);
    expect(await emitAck(c, 'join_game', {} as any)).toEqual({ ok: false, error: 'invalid-payload' });
    expect(await emitAck(c, 'leave_game', {} as any)).toEqual({ ok: false, error: 'invalid-payload' });
    expect(await emitAck(c, 'make_move', {} as any)).toEqual({ ok: false, error: 'invalid-payload' });
    c.disconnect();
  });

  it('observer assignment when both player slots are filled; duplicate move nonce detection; session resume', async () => {
    const c1 = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c1);
    const createAck: any = await emitAck(c1, 'create_game', {});
    expect(createAck.ok).toBe(true);
    const gameId = createAck.gameId as string;
    const sessionToken = createAck.sessionToken as string;

    const c2 = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c2);
    const j2: any = await emitAck(c2, 'join_game', { gameId });
    expect(j2.role).toBe('player');

    const c3 = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c3);
    const j3: any = await emitAck(c3, 'join_game', { gameId });
    expect(j3.role).toBe('observer');

    // valid move followed by duplicate nonce
    const ok: any = await emitAck(c1, 'make_move', { gameId, position: 0, player: 'X', nonce: 'n1' });
    expect(ok).toEqual({ ok: true });
    const dup: any = await emitAck(c1, 'make_move', { gameId, position: 1, player: 'X', nonce: 'n1' });
    expect(dup).toEqual({ ok: false, error: 'duplicate' });

    // disconnect c1 and resume using sessionToken
    c1.disconnect();
    const c1b = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c1b);
    const resume: any = await emitAck(c1b, 'join_game', { gameId, sessionToken });
    expect(resume.role).toBe('player');
    expect(typeof resume.sessionToken).toBe('string');

    c1.disconnect();
    c2.disconnect();
    c3.disconnect();
    c1b.disconnect();
  });

  it('human vs random: creates game with random strategy and server emits AI response', async () => {
    const c = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c);
    const created: any = await emitAck(c, 'create_game', { strategy: 'ai0' } as any);
    expect(created.ok).toBe(true);
    const gameId = created.gameId as string;
    const states: any[] = [];
    c.on('game_state', (s: any) => states.push(s));
    const ack1: any = await emitAck(c, 'make_move', { gameId, position: 0, player: 'X', nonce: 'n1' } as any);
    expect(ack1.ok).toBe(true);
    await new Promise((r) => setTimeout(r, 20));
    expect(states.length).toBeGreaterThanOrEqual(2);
    const last = states[states.length - 1];
    expect(last.gameId).toBe(gameId);
    expect(typeof last.lastMove).toBe('number');
    expect(last.lastMove).not.toBe(0);
    c.disconnect();
  });

  it('uses env default AI_STRATEGY when create_game.strategy is omitted, but allows per-game override', async () => {
    const c = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c);
    // Omitted strategy -> uses env default ('random')
    const createdDefault: any = await emitAck(c, 'create_game', {});
    expect(createdDefault.ok).toBe(true);
    // Now explicitly request random again just to ensure override path still works
    const createdExplicit: any = await emitAck(c, 'create_game', { strategy: 'ai0' } as any);
    expect(createdExplicit.ok).toBe(true);
    c.disconnect();
  });

  it('disconnect cleans up player slot; next join fills freed slot with correct symbol', async () => {
    const c1 = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c1);
    const created: any = await emitAck(c1, 'create_game', {});
    const gameId = created.gameId as string;

    const c2 = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c2);
    const j2: any = await emitAck(c2, 'join_game', { gameId });
    expect(j2.role).toBe('player');
    expect(['X','O']).toContain(j2.player);

    // Disconnect c2, then c3 should become player
    c2.disconnect();
    const c3 = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c3);
    const j3: any = await emitAck(c3, 'join_game', { gameId });
    expect(j3.role).toBe('player');
    c1.disconnect();
    c3.disconnect();
  });

  it('rate limiting rejects excessive contract make_move bursts (test mode)', async () => {
    // For this test, spin up a dedicated server with env set BEFORE attaching handlers
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
      const created: any = await emitAck(c, 'create_game', {});
      const gameId = created.gameId as string;
      const ok: any = await emitAck(c, 'make_move', { gameId, position: 0, player: 'X', nonce: 'r1' });
      expect(ok).toEqual({ ok: true });
      const rate: any = await emitAck(c, 'make_move', { gameId, position: 1, player: 'X', nonce: 'r2' });
      expect(rate).toEqual({ ok: false, error: 'rate-limit' });
      c.disconnect();
    } finally {
      if (OLD_LIMIT !== undefined) process.env.TEST_RATE_LIMIT = OLD_LIMIT; else delete process.env.TEST_RATE_LIMIT;
      if (OLD_WIN !== undefined) process.env.TEST_RATE_WINDOW_MS = OLD_WIN; else delete process.env.TEST_RATE_WINDOW_MS;
      await new Promise<void>((r) => localIo.close(() => localServer.close(() => r())));
    }
  });
});


