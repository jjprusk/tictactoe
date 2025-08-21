// © 2025 Joe Pruskowski
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./socketService', () => {
  const handlers: Record<string, Function[]> = {};
  return {
    socketService: {
      subscribeStatus: (fn: (s: any) => void) => {
        // emit current
        fn('disconnected');
        return () => {};
      },
      on: (event: string, fn: Function) => {
        (handlers[event] = handlers[event] || []).push(fn);
      },
      __emit: (event: string, payload?: any) => {
        (handlers[event] || []).forEach((fn) => fn(payload));
      },
    },
  };
});

vi.mock('../store', () => {
  return {
    store: {
      dispatch: vi.fn(),
    },
  };
});

describe('socketBindings', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('validates game_state and standardized error payloads', async () => {
    const { bindSocketToStore } = await import('./socketBindings');
    const { socketService } = await import('./socketService');
    const { store } = await import('../store');
    bindSocketToStore();

    // invalid game_state triggers error dispatch
    (socketService as any).__emit('game_state', { bad: true });
    expect((store.dispatch as any).mock.calls.length).toBeGreaterThan(0);
    const calls = (store.dispatch as any).mock.calls;
    expect(JSON.stringify(calls.at(-1)?.[0])).toContain('protocol: invalid game_state payload');

    // valid game_state does not dispatch error
    const valid = {
      gameId: 'g',
      board: [null, null, null, null, 'X', null, null, null, null],
      currentPlayer: 'O',
      lastMove: 4,
    };
    (store.dispatch as any).mockClear();
    (socketService as any).__emit('game_state', valid);
    // Should dispatch gameStateReceived but not error
    expect((store.dispatch as any).mock.calls.length).toBe(1);

    // standardized error payload parsed
    (socketService as any).__emit('error', { code: 'oops', message: 'bad' });
    const errCall = (store.dispatch as any).mock.calls.at(-1)?.[0];
    expect(JSON.stringify(errCall)).toContain('oops: bad');
  });
});


