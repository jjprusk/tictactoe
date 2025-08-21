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

  it('creates a new game with host assigned to X', async () => {
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


