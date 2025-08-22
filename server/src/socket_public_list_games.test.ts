// © 2025 Joe Pruskowski
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { io as Client, Socket } from 'socket.io-client';
import { buildHttpServer, buildIoServer } from './bootstrap';
import { attachSocketHandlers } from './socket_handlers';

async function waitConnect(s: Socket): Promise<void> {
  await new Promise<void>((r) => s.on('connect', () => r()));
}

async function emitAck<TReq, TAck>(s: Socket, event: string, payload: TReq, timeoutMs = 600): Promise<TAck> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('ack-timeout')), timeoutMs);
    s.emit(event, payload, (ack: TAck) => {
      clearTimeout(t);
      resolve(ack);
    });
  });
}

describe('public list_games', () => {
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

  it('returns empty list initially and updates after create_game', async () => {
    const c1 = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c1);
    const empty: any = await emitAck(c1, 'list_games', {});
    expect(empty.ok).toBe(true);
    expect(Array.isArray(empty.games)).toBe(true);

    const c2 = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c2);
    const created: any = await emitAck(c2, 'create_game', {});
    expect(created.ok).toBe(true);
    const gameId = created.gameId as string;

    const nowList: any = await emitAck(c1, 'list_games', {});
    expect(nowList.ok).toBe(true);
    expect(nowList.games).toContain(gameId);

    c1.disconnect();
    c2.disconnect();
  });
});


