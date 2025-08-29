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

describe('socket_handlers: resume and reset AI opening', () => {
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

  it('join_game with sessionToken resumes prior player role', async () => {
    const c1 = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c1);
    const createAck: any = await ack(c1, 'create_game', { strategy: 'ai0', startMode: 'human' } as any);
    expect(createAck.ok).toBe(true);
    const { gameId, player, sessionToken } = createAck as { gameId: string; player: 'X' | 'O'; sessionToken: string };
    expect(player).toBeDefined();
    c1.disconnect();

    const c2 = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c2);
    const joinAck: any = await ack(c2, 'join_game', { gameId, sessionToken });
    expect(joinAck.ok).toBe(true);
    expect(joinAck.role).toBe('player');
    expect(joinAck.player).toBe(player);
    c2.disconnect();
  });

  it('reset_game emits cleared state and AI opening move when host is O (AI is X)', async () => {
    const c = Client(baseUrl, { transports: ['websocket'] });
    await waitConnect(c);
    // Create a game where AI starts so host is O and X is AI-controlled
    const created: any = await ack(c, 'create_game', { startMode: 'ai', strategy: 'ai0' } as any);
    expect(created.ok).toBe(true);
    const gameId = created.gameId as string;

    // Collect game_state events to verify reset flow
    const states: any[] = [];
    c.on('game_state', (s: any) => states.push(s));

    // Reset the game
    const resetAck: any = await ack(c, 'reset_game', { gameId });
    expect(resetAck).toEqual({ ok: true });

    // Wait a short time for potential AI move
    await new Promise((r) => setTimeout(r, 100));

    // We expect at least one cleared state and then an AI move with lastMove
    const hasCleared = states.some((s) => Array.isArray(s.board) && s.board.every((c: any) => c === null));
    const hasAiMove = states.some((s) => typeof s.lastMove === 'number');
    expect(hasCleared).toBe(true);
    expect(hasAiMove).toBe(true);

    c.disconnect();
  });
});
