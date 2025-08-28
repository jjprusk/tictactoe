// © 2025 Joe Pruskowski
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { store } from '../store';
import { createOrResetGame } from '../store/thunks';

vi.mock('../socket/socketService', () => ({
  socketService: {
    getForcedOffline: vi.fn(() => false),
  },
}));

describe('integration: createOrResetGame with delayed ack', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates state only after ack resolves (delayed create)', async () => {
    const createGameMock = vi.fn().mockImplementation(() => new Promise((resolve) => {
      setTimeout(() => resolve({ ok: true, gameId: 'g-int', player: 'X', currentPlayer: 'X', sessionToken: 'tok-int' }), 25);
    }));
    vi.doMock('../socket/clientEmitters', async (orig) => {
      const actual = await (orig as any)();
      return { ...actual, createGame: createGameMock };
    });
    const { createOrResetGame: thunk } = await import('../store/thunks');

    const before = (store.getState() as any).game.gameId;
    const p = store.dispatch<any>(thunk());
    // not resolved yet
    expect((store.getState() as any).game.gameId).toBe(before);
    vi.advanceTimersByTime(30);
    await p;
    const s: any = store.getState();
    expect(s.game.gameId).toBe('g-int');
    expect(s.game.myPlayer).toBe('X');
  });
});


