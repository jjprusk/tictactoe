// © 2025 Joe Pruskowski
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { io as Client } from 'socket.io-client';
import { buildHttpServer, buildIoServer } from './bootstrap';
import { attachSocketHandlers } from './socket_handlers';

async function emitWithAck<TReq, TAck>(socket: any, event: string, payload: TReq, timeoutMs = 500): Promise<TAck> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('ack-timeout')), timeoutMs);
    socket.emit(event, payload, (ack: TAck) => {
      clearTimeout(timer);
      resolve(ack);
    });
  });
}

describe('contracts: create_game / join_game', () => {
  let server: http.Server;
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

  it('creates a new game with host assigned to X by default (FIRST_PLAYER=X)', async () => {
    const c1 = Client(baseUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => c1.on('connect', () => resolve()));
    const createAck: any = await emitWithAck(c1, 'create_game', { strategy: 'random' });
    expect(createAck).toMatchObject({ ok: true, player: 'X' });
    expect(typeof createAck.gameId).toBe('string');

    // Second client joins as player O
    const c2 = Client(baseUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => c2.on('connect', () => resolve()));
    const joinAck: any = await emitWithAck(c2, 'join_game', { gameId: createAck.gameId });
    expect(joinAck.ok).toBe(true);
    // role is player and player is O (since X is taken)
    expect(joinAck.role).toBe('player');
    expect(joinAck.player).toBe('O');

    // Third client joins as observer
    const c3 = Client(baseUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => c3.on('connect', () => resolve()));
    const joinAck3: any = await emitWithAck(c3, 'join_game', { gameId: createAck.gameId });
    expect(joinAck3.ok).toBe(true);
    expect(joinAck3.role).toBe('observer');

    c1.disconnect();
    c2.disconnect();
    c3.disconnect();
  });

  it('FIRST_PLAYER=alternate alternates X -> O -> X across games', async () => {
    // Start a dedicated server instance with env set before attaching handlers
    const OLD = process.env.FIRST_PLAYER;
    process.env.FIRST_PLAYER = 'alternate';
    const localServer = buildHttpServer();
    const localIo = buildIoServer(localServer);
    attachSocketHandlers(localIo);
    await new Promise<void>((r) => localServer.listen(0, () => r()));
    const addr = localServer.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const url = `http://localhost:${port}`;
    try {
      const c1 = Client(url, { transports: ['websocket'] });
      await new Promise<void>((r) => c1.on('connect', () => r()));
      const g1: any = await emitWithAck(c1, 'create_game', {});
      expect(g1.ok).toBe(true);
      const p1 = g1.player as string;
      expect(['X','O']).toContain(p1);
      c1.disconnect();

      const c2 = Client(url, { transports: ['websocket'] });
      await new Promise<void>((r) => c2.on('connect', () => r()));
      const g2: any = await emitWithAck(c2, 'create_game', {});
      expect(g2.ok).toBe(true);
      const p2 = g2.player as string;
      expect(['X','O']).toContain(p2);
      expect(p2).not.toBe(p1);
      c2.disconnect();

      const c3 = Client(url, { transports: ['websocket'] });
      await new Promise<void>((r) => c3.on('connect', () => r()));
      const g3: any = await emitWithAck(c3, 'create_game', {});
      expect(g3.ok).toBe(true);
      const p3 = g3.player as string;
      expect(['X','O']).toContain(p3);
      // p3 should equal p1 due to alternation
      expect(p3).toBe(p1);
      c3.disconnect();

      // Per-game strategy override should not affect starting player logic
      const c4 = Client(url, { transports: ['websocket'] });
      await new Promise<void>((r) => c4.on('connect', () => r()));
      const g4: any = await emitWithAck(c4, 'create_game', { strategy: 'random' } as any);
      expect(g4.ok).toBe(true);
      const p4 = g4.player as string;
      expect(['X','O']).toContain(p4);
      c4.disconnect();
    } finally {
      if (OLD) process.env.FIRST_PLAYER = OLD; else delete process.env.FIRST_PLAYER;
      await new Promise<void>((r) => localIo.close(() => localServer.close(() => r())));
    }
  });

  it('rejects invalid create_game payload', async () => {
    const c = Client(baseUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => c.on('connect', () => resolve()));
    const bad: any = await emitWithAck(c, 'create_game', { strategy: 'nope' }, 500).catch((e) => e);
    // if ack-timeout thrown, treat as failure; otherwise expect invalid-payload response
    if (bad instanceof Error) {
      expect(bad.message).not.toBe('ack-timeout');
    } else {
      expect(bad).toEqual({ ok: false, error: 'invalid-payload' });
    }
    c.disconnect();
  });
});


