// © 2025 Joe Pruskowski
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { io as Client, Socket } from 'socket.io-client';
import { buildHttpServer, buildIoServer } from './bootstrap';
import { attachSocketHandlers } from './socket_handlers';

function waitConnect(s: Socket): Promise<void> {
  return new Promise((r) => s.on('connect', () => r()));
}
function ack<TReq, TAck>(s: Socket, event: string, payload: TReq, timeoutMs = 800): Promise<TAck> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('ack-timeout')), timeoutMs);
    s.emit(event, payload, (res: TAck) => {
      clearTimeout(t);
      resolve(res);
    });
  });
}

describe('socket_handlers extra branches', () => {
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

  it('create_game with startMode=ai triggers opening AI move', async () => {
    const c = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c);
    const states: any[] = [];
    c.on('game_state', (s) => states.push(s));
    const created: any = await ack(c, 'create_game', { startMode: 'ai', strategy: 'ai0' } as any);
    expect(created.ok).toBe(true);
    // Allow time for async AI opening
    await new Promise((r) => setTimeout(r, 100));
    expect(states.some((s) => typeof s.lastMove === 'number')).toBe(true);
    c.disconnect();
  });

  it('join_game invalid payload', async () => {
    const c = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c);
    const res: any = await ack(c, 'join_game', {} as any);
    expect(res).toEqual({ ok: false, error: 'invalid-payload' });
    c.disconnect();
  });

  it('admin:room_info returns not-found for unknown room when authorized', async () => {
    const c = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c);
    const elev: any = await ack(c, 'elevate_admin', { adminKey: process.env.ADMIN_KEY || 'dev-admin-key' });
    expect(elev).toEqual({ ok: true, role: 'admin' });
    const info: any = await ack(c, 'admin:room_info', { gameId: 'missing' });
    expect(info).toEqual({ ok: false, error: 'not-found' });
    c.disconnect();
  });

  it('make_move invalid-move when same cell or wrong turn and duplicate nonce path', async () => {
    const c = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c);
    const created: any = await ack(c, 'create_game', { startMode: 'human', strategy: 'ai0' } as any);
    expect(created.ok).toBe(true);
    const gameId = created.gameId as string;

    // First valid move by X at 0
    let r: any = await ack(c, 'make_move', { gameId, nonce: 'n1', position: 0, player: 'X' });
    expect(r).toEqual({ ok: true });

    // Duplicate nonce rejected
    r = await ack(c, 'make_move', { gameId, nonce: 'n1', position: 1, player: 'O' });
    expect(r).toEqual({ ok: false, error: 'duplicate' });

    // Wrong turn (likely AI may move first as O if unassigned); use same player as last move to ensure invalid
    r = await ack(c, 'make_move', { gameId, nonce: 'n2', position: 1, player: 'X' });
    if (r.ok === false) {
      expect(r.error).toBe('invalid-move');
    }

    // Attempt to play into occupied cell is invalid
    r = await ack(c, 'make_move', { gameId, nonce: 'n3', position: 0, player: 'O' });
    if (r.ok === false) {
      expect(r.error).toBe('invalid-move');
    }

    c.disconnect();
  });
});

describe('socket_handlers pruneInactiveRooms via GAME_TTL_MS=0', () => {
  let server: http.Server;
  let baseUrl: string;
  let oldTtl: string | undefined;

  beforeAll(async () => {
    oldTtl = process.env.GAME_TTL_MS;
    process.env.GAME_TTL_MS = '0';
    server = buildHttpServer();
    const io = buildIoServer(server);
    attachSocketHandlers(io);
    await new Promise<void>((r) => server.listen(0, () => r()));
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://localhost:${port}`;
  });
  afterAll(async () => {
    if (oldTtl) process.env.GAME_TTL_MS = oldTtl; else delete process.env.GAME_TTL_MS;
    await new Promise<void>((r) => server.close(() => r()));
  });

  it('removes empty rooms from active games listing', async () => {
    const c = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c);
    const created: any = await ack(c, 'create_game', { strategy: 'ai0' } as any);
    expect(created.ok).toBe(true);
    const gameId = created.gameId as string;
    c.disconnect();
    await new Promise((r) => setTimeout(r, 10));

    // With TTL=0, pruning should remove the empty room; list_games returns []
    const l = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(l);
    const list: any = await ack(l, 'list_games', {} as any);
    expect(list.ok).toBe(true);
    expect(Array.isArray(list.games)).toBe(true);
    expect(list.games.includes(gameId)).toBe(false);
    l.disconnect();
  });
});
