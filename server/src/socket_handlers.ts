// © 2025 Joe Pruskowski
import type { Server as IOServer, Socket } from 'socket.io';
import { z } from 'zod';

type Role = 'player' | 'observer';

type RoomState = {
  nonces: Set<string>;
  playerIds: Set<string>;
};

const joinSchema = z.object({ roomId: z.string().min(1) });
const moveSchema = z.object({ roomId: z.string().min(1), nonce: z.string().min(1) });

export function attachSocketHandlers(io: IOServer) {
  const roomIdToState = new Map<string, RoomState>();
  // Simple per-socket fixed-window rate limiter for tests/integration
  const rateLimit = Number(process.env.TEST_RATE_LIMIT || '0');
  const rateWindowMs = Number(process.env.TEST_RATE_WINDOW_MS || '1000');
  const socketIdToHits = new Map<string, number[]>();
  const isTest = process.env.NODE_ENV === 'test';
  const log = (...args: unknown[]) => {
    if (!isTest) {
      // eslint-disable-next-line no-console
      console.log('[socket]', ...args);
    }
  };

  function getRoomState(roomId: string): RoomState {
    let state = roomIdToState.get(roomId);
    if (!state) {
      state = { nonces: new Set<string>(), playerIds: new Set<string>() };
      roomIdToState.set(roomId, state);
    }
    return state;
  }

  io.on('connection', (socket: Socket) => {
    log('connected', socket.id);
    socket.emit('server:health', { ok: true });

    socket.on('room:join', (rawPayload, ack?: (res: any) => void) => {
      const parsed = joinSchema.safeParse(rawPayload);
      if (!parsed.success) {
        ack?.({ ok: false, error: 'invalid-payload' });
        return;
      }
      const { roomId } = parsed.data;
      const state = getRoomState(roomId);
      socket.join(roomId);
      let role: Role = 'observer';
      if (state.playerIds.size < 2) {
        state.playerIds.add(socket.id);
        role = 'player';
      }
      (socket.data as any).role = role;
      ack?.({ ok: true, role, players: state.playerIds.size });
    });

    socket.on('room:leave', (rawPayload, ack?: (res: any) => void) => {
      const parsed = joinSchema.safeParse(rawPayload);
      if (!parsed.success) {
        ack?.({ ok: false, error: 'invalid-payload' });
        return;
      }
      const { roomId } = parsed.data;
      const state = getRoomState(roomId);
      socket.leave(roomId);
      state.playerIds.delete(socket.id);
      ack?.({ ok: true });
    });

    socket.on('room:upgrade', (rawPayload, ack?: (res: any) => void) => {
      const parsed = joinSchema.safeParse(rawPayload);
      if (!parsed.success) {
        ack?.({ ok: false, error: 'invalid-payload' });
        return;
      }
      const { roomId } = parsed.data;
      const state = getRoomState(roomId);
      let role: Role = 'observer';
      if (state.playerIds.size < 2) {
        state.playerIds.add(socket.id);
        role = 'player';
      }
      (socket.data as any).role = role;
      ack?.({ ok: true, role, players: state.playerIds.size });
    });

    socket.on('move:make', (rawPayload, ack?: (res: any) => void) => {
      // Backpressure: optional test-mode rate limit per socket
      if (rateLimit > 0) {
        const now = Date.now();
        const hits = socketIdToHits.get(socket.id) ?? [];
        const pruned = hits.filter((t) => now - t < rateWindowMs);
        if (pruned.length >= rateLimit) {
          ack?.({ ok: false, error: 'rate-limit' });
          return;
        }
        pruned.push(now);
        socketIdToHits.set(socket.id, pruned);
      }
      const parsed = moveSchema.extend({ delayMs: z.number().int().nonnegative().optional() }).safeParse(rawPayload);
      if (!parsed.success) {
        ack?.({ ok: false, error: 'invalid-payload' });
        return;
      }
      const { roomId, nonce, delayMs } = parsed.data as { roomId: string; nonce: string; delayMs?: number };
      const state = getRoomState(roomId);
      if (state.nonces.has(nonce)) {
        ack?.({ ok: false, error: 'duplicate' });
        return;
      }
      state.nonces.add(nonce);
      const doAck = () => ack?.({ ok: true });
      if (isTest && typeof delayMs === 'number' && delayMs > 0) {
        setTimeout(doAck, delayMs);
      } else {
        doAck();
      }
    });

    socket.on('disconnect', () => {
      // Cleanup from all room states
      for (const [, state] of roomIdToState) {
        state.playerIds.delete(socket.id);
      }
      log('disconnected', socket.id);
    });
  });
}


