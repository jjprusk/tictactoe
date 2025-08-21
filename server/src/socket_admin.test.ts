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

describe('admin role flows', () => {
  let server: http.Server;
  let baseUrl: string;
  const OLD_KEY = process.env.ADMIN_KEY;

  beforeAll(async () => {
    process.env.ADMIN_KEY = 'test-admin-key';
    server = buildHttpServer();
    const io = buildIoServer(server);
    attachSocketHandlers(io);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    if (OLD_KEY !== undefined) process.env.ADMIN_KEY = OLD_KEY;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('requires correct admin key to elevate; forbids admin actions without admin role', async () => {
    const c = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c);
    const badElev: any = await emitAck(c, 'elevate_admin', { adminKey: 'nope' });
    expect(badElev).toEqual({ ok: false, error: 'unauthorized' });
    const listForbidden: any = await emitAck(c, 'admin:list_games', {});
    expect(listForbidden).toEqual({ ok: false, error: 'forbidden' });
    c.disconnect();
  });

  it('admin can list and close games', async () => {
    const admin = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(admin);
    const elevOk: any = await emitAck(admin, 'elevate_admin', { adminKey: 'test-admin-key' });
    expect(elevOk).toEqual({ ok: true, role: 'admin' });

    // Create a game using a separate client
    const p1 = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(p1);
    const created: any = await emitAck(p1, 'create_game', {});
    expect(created.ok).toBe(true);
    const gameId = created.gameId as string;

    const list: any = await emitAck(admin, 'admin:list_games', {});
    expect(list.ok).toBe(true);
    expect(list.games).toContain(gameId);

    const closed: any = await emitAck(admin, 'admin:close_game', { gameId });
    expect(closed).toEqual({ ok: true });

    // After close, room should be gone from list
    const list2: any = await emitAck(admin, 'admin:list_games', {});
    expect(list2.games).not.toContain(gameId);

    admin.disconnect();
    p1.disconnect();
  });

  it('forbids close_game for non-admin and rejects invalid payloads', async () => {
    const c = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c);
    // Create a game to have an id
    const created: any = await emitAck(c, 'create_game', {});
    const gameId = created.gameId as string;
    // Non-admin forbidden
    const forbidden: any = await emitAck(c, 'admin:close_game', { gameId });
    expect(forbidden).toEqual({ ok: false, error: 'forbidden' });
    // Invalid payload
    const invalid: any = await emitAck(c, 'admin:close_game', {} as any);
    expect(invalid).toEqual({ ok: false, error: 'invalid-payload' });
    c.disconnect();
  });

  it('room_info requires admin and returns not-found for unknown game', async () => {
    const c = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c);
    // Forbidden when not admin
    const forb: any = await emitAck(c, 'admin:room_info', { gameId: 'missing' });
    expect(forb).toEqual({ ok: false, error: 'forbidden' });
    // Elevate then request invalid payload
    const elev: any = await emitAck(c, 'elevate_admin', { adminKey: 'test-admin-key' });
    expect(elev.ok).toBe(true);
    const invalid: any = await emitAck(c, 'admin:room_info', {} as any);
    expect(invalid).toEqual({ ok: false, error: 'invalid-payload' });
    // Not found
    const nf: any = await emitAck(c, 'admin:room_info', { gameId: 'missing' });
    expect(nf).toEqual({ ok: false, error: 'not-found' });
    c.disconnect();
  });

  it('admin room info reports membership and roles', async () => {
    const admin = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(admin);
    await emitAck(admin, 'elevate_admin', { adminKey: 'test-admin-key' });

    const p1 = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(p1);
    const created: any = await emitAck(p1, 'create_game', {});
    const gameId = created.gameId as string;
    const p2 = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(p2);
    await emitAck(p2, 'join_game', { gameId });
    const obs = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(obs);
    await emitAck(obs, 'join_game', { gameId });

    const info: any = await emitAck(admin, 'admin:room_info', { gameId });
    expect(info.ok).toBe(true);
    expect(info.gameId).toBe(gameId);
    expect(info.playerCount).toBeGreaterThanOrEqual(1);
    expect(info.observerCount).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(info.players)).toBe(true);

    admin.disconnect();
    p1.disconnect();
    p2.disconnect();
    obs.disconnect();
  });
});


