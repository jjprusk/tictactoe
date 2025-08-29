// © 2025 Joe Pruskowski
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { store } from '../store';
import { createOrResetGame } from './thunks';

vi.mock('../socket/clientEmitters', async (orig) => {
  const actual = await (orig as any)();
  return {
    ...actual,
    createGame: vi.fn().mockResolvedValue({ ok: true, gameId: 'g1', player: 'X', currentPlayer: 'X', sessionToken: 't1' }),
    resetGame: vi.fn().mockResolvedValue({ ok: true }),
  };
});

vi.mock('../socket/socketService', () => ({
  socketService: {
    getForcedOffline: vi.fn(() => false),
  },
}));

describe('createOrResetGame thunk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    try { window.localStorage.clear(); } catch {}
  });

  it('creates online and stores session token', async () => {
    await store.dispatch<any>(createOrResetGame());
    const s: any = store.getState();
    expect(s.game.gameId).toBe('g1');
    expect(s.game.myPlayer).toBe('X');
    expect(window.localStorage.getItem('ttt_session_g1')).toBe('t1');
  });

  it('resets online when already in room', async () => {
    const emitters = await import('../socket/clientEmitters');
    // First create
    await store.dispatch<any>(createOrResetGame());
    // Then reset path
    try { window.localStorage.setItem('ttt_start_mode', 'human'); } catch {}
    await store.dispatch<any>(createOrResetGame());
    expect((emitters.resetGame as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({ gameId: 'g1' });
  });

  it('offline creates local and alternates when configured', async () => {
    const svc = await import('../socket/socketService');
    (svc.socketService.getForcedOffline as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    try { window.localStorage.setItem('ttt_start_mode', 'alternate'); } catch {}
    await store.dispatch<any>(createOrResetGame());
    const s1: any = store.getState();
    const first = s1.game.myPlayer;
    await store.dispatch<any>(createOrResetGame());
    const s2: any = store.getState();
    expect(s1.game.gameId?.startsWith('local_')).toBe(true);
    expect(first && s2.game.myPlayer && first !== s2.game.myPlayer).toBe(true);
  });

  it('online create error keeps state unchanged', async () => {
    const { resetGameState } = await import('./gameSlice');
    // ensure clean state (no prior player)
    store.dispatch(resetGameState());
    const svc = await import('../socket/socketService');
    (svc.socketService.getForcedOffline as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const emitters = await import('../socket/clientEmitters');
    (emitters.createGame as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, error: 'boom' } as any);
    const before: any = store.getState();
    const beforeId = before.game.gameId;
    await store.dispatch<any>(createOrResetGame());
    const after: any = store.getState();
    expect(after.game.gameId).toBe(beforeId);
    expect(after.game.myPlayer).toBeUndefined();
  });
});


