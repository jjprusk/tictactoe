// © 2025 Joe Pruskowski
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./socketService', () => {
  const emitHandlers: Record<string, Function> = {};
  const emitDelays: Record<string, number> = {};
  const socket = {
    emit: vi.fn((event: string, payload: unknown, cb: Function) => {
      const handler = emitHandlers[event];
      const delay = emitDelays[event] ?? 0;
      const invoke = () => {
        if (handler) {
          cb(handler(payload));
        } else {
          cb({ ok: true, gameId: 'g1', player: 'X' });
        }
      };
      if (delay > 0) setTimeout(invoke, delay);
      else invoke();
    }),
  } as any;
  return {
    socketService: {
      connect: vi.fn(() => socket),
      __setEmitter: (event: string, fn: Function) => {
        emitHandlers[event] = fn;
      },
      __setEmitDelay: (event: string, ms: number) => {
        emitDelays[event] = ms;
      },
    },
  };
});

describe('client emitters', () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it('createGame validates request and parses ack', async () => {
    const { socketService } = await import('./socketService');
    (socketService as any).__setEmitter('create_game', () => ({ ok: true, gameId: 'g1', player: 'X' }));
    const { createGame } = await import('./clientEmitters');
    const ack = await createGame({ strategy: 'random' });
    expect(ack.ok).toBe(true);
  });

  it('joinGame and leaveGame validate I/O', async () => {
    const { socketService } = await import('./socketService');
    (socketService as any).__setEmitter('join_game', () => ({ ok: true, role: 'player', player: 'O' }));
    (socketService as any).__setEmitter('leave_game', () => ({ ok: true }));
    const { joinGame, leaveGame } = await import('./clientEmitters');
    const j = await joinGame({ gameId: 'g' });
    expect('role' in j && j.role === 'player').toBe(true);
    const l = await leaveGame({ gameId: 'g' });
    expect(l.ok).toBe(true);
  });

  it('makeMove validates request and parses ack (auto nonce if missing)', async () => {
    const { socketService } = await import('./socketService');
    (socketService as any).__setEmitter('make_move', () => ({ ok: true }));
    const { makeMove } = await import('./clientEmitters');
    const ack = await makeMove({ gameId: 'g', position: 4, player: 'X' } as any);
    expect(ack.ok).toBe(true);
  });

  it('emitters reject on ack-timeout', async () => {
    const { socketService } = await import('./socketService');
    // Delay the ack beyond the provided timeout
    (socketService as any).__setEmitDelay('create_game', 50);
    const { createGame } = await import('./clientEmitters');
    await expect(createGame({}, 10 as any)).rejects.toBeTruthy();
  });

  it('rejects invalid input via zod', async () => {
    const { createGame } = await import('./clientEmitters');
    await expect(createGame({ strategy: 'nope' } as any)).rejects.toBeTruthy();
  });
});


