// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../store';
import { setCurrentGame, resetGameState } from '../store/gameSlice';
import { flush } from '../test/flush';

vi.mock('../socket/clientEmitters', async (orig) => {
  const actual = await (orig as any)();
  return {
    ...actual,
    createGame: vi.fn().mockResolvedValue({ ok: true, gameId: 'g-new', player: 'X', currentPlayer: 'X' }),
    resetGame: vi.fn().mockResolvedValue({ ok: true }),
  };
});

// By default not forced offline; tests can override via spy after import
vi.mock('../socket/socketService', () => ({
  socketService: {
    getForcedOffline: vi.fn(() => false),
    setForcedOffline: vi.fn(),
    connect: vi.fn(),
  },
}));

async function render(): Promise<HTMLDivElement> {
  const container = document.createElement('div');
  const root = createRoot(container);
  const { default: NewGameButton } = await import('./NewGameButton');
  root.render(React.createElement(Provider as any, { store }, React.createElement(NewGameButton)));
  await flush();
  return container;
}

describe('NewGameButton', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // reset store state
    try { store.dispatch(resetGameState()); } catch {}
    try { window.localStorage.removeItem('ttt_start_mode'); } catch {}
    try { window.localStorage.removeItem('ttt_strategy'); } catch {}
  });

  it('online: createGame is called with startMode/strategy from storage', async () => {
    vi.doMock('../utils/clientLogger', () => ({
      getStoredStrategy: () => 'ai1',
    } as any));
    try { window.localStorage.setItem('ttt_start_mode', 'ai'); } catch {}
    try { window.localStorage.setItem('ttt_strategy', 'ai1'); } catch {}
    const container = await render();
    const btn = container.querySelector('[data-testid="create-game-btn-secondary"]') as HTMLButtonElement;
    const emitters = await import('../socket/clientEmitters');
    btn?.click();
    await flush();
    const call = (emitters.createGame as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as any;
    expect(call).toMatchObject({ strategy: 'ai1', startMode: 'ai', aiStarts: true });
  });

  it('offline: AI First makes opening move as X and hands turn to O', async () => {
    const mod = await import('../socket/socketService');
    (mod.socketService.getForcedOffline as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    try { window.localStorage.setItem('ttt_start_mode', 'ai'); } catch {}
    try { window.localStorage.setItem('ttt_strategy', 'random'); } catch {}
    const container = await render();
    const btn = container.querySelector('[data-testid="create-game-btn-secondary"]') as HTMLButtonElement;
    btn?.click();
    // Wait until store reflects new online game id
    let attempts = 0;
    while (attempts < 10) {
      await flush();
      const cur = (store.getState() as any).game;
      if (cur.gameId && cur.gameId !== 'local_old') break;
      attempts++;
    }
    const s = (store.getState() as any).game;
    expect(typeof s.lastMove).toBe('number');
    expect(s.board[s.lastMove]).toBe('X');
    expect(s.currentPlayer).toBe('O');
  });

  it('online: creates a new game when not in a room', async () => {
    const svc = await import('../socket/socketService');
    (svc.socketService.getForcedOffline as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    try { window.localStorage.setItem('ttt_start_mode', 'human'); } catch {}
    try { window.localStorage.setItem('ttt_strategy', 'random'); } catch {}
    const container = await render();
    const btn = container.querySelector('[data-testid="create-game-btn-secondary"]') as HTMLButtonElement;
    const emitters = await import('../socket/clientEmitters');
    // Simulate click and flush
    btn?.click();
    await flush();
    expect((emitters.createGame as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    expect((emitters.resetGame as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('online: resets current room when already in a room', async () => {
    store.dispatch(setCurrentGame({ gameId: 'g1', startingPlayer: 'X' as any }));
    const svc = await import('../socket/socketService');
    (svc.socketService.getForcedOffline as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    try { window.localStorage.setItem('ttt_start_mode', 'human'); } catch {}
    try { window.localStorage.setItem('ttt_strategy', 'random'); } catch {}
    const container = await render();
    const btn = container.querySelector('[data-testid="create-game-btn-secondary"]') as HTMLButtonElement;
    const emitters = await import('../socket/clientEmitters');
    btn?.click();
    await flush();
    expect((emitters.resetGame as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({ gameId: 'g1' });
    // Should not create a new room in this branch
    expect((emitters.createGame as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('offline: creates/uses local room and does not call server', async () => {
    const mod = await import('../socket/socketService');
    (mod.socketService.getForcedOffline as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    try { window.localStorage.setItem('ttt_start_mode', 'human'); } catch {}
    try { window.localStorage.setItem('ttt_strategy', 'random'); } catch {}
    const container = await render();
    const btn = container.querySelector('[data-testid="create-game-btn-secondary"]') as HTMLButtonElement;
    const emitters = await import('../socket/clientEmitters');
    btn?.click();
    await flush();
    expect((emitters.createGame as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    expect((emitters.resetGame as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    // Verify local gameId was set
    const gid = (store.getState() as any).game.gameId as string | null;
    expect(gid && gid.startsWith('local_')).toBe(true);
  });

  it('offline alternates: toggles AI-first across clicks', async () => {
    const mod = await import('../socket/socketService');
    (mod.socketService.getForcedOffline as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    try { window.localStorage.setItem('ttt_start_mode', 'alternate'); } catch {}
    try { window.localStorage.setItem('ttt_strategy', 'random'); } catch {}
    const container = await render();
    const btn = container.querySelector('[data-testid="create-game-btn-secondary"]') as HTMLButtonElement;
    // First click -> human starts (myPlayer X)
    btn?.click();
    await flush();
    const s1 = (store.getState() as any).game;
    expect(s1.myPlayer).toBe('X');
    // Second click -> AI starts (myPlayer O)
    btn?.click();
    await flush();
    const s2 = (store.getState() as any).game;
    expect(s2.myPlayer).toBe('O');
  });

  it('offline: reuses existing local game id instead of creating a new one', async () => {
    const mod = await import('../socket/socketService');
    (mod.socketService.getForcedOffline as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    // Seed an existing local game id
    store.dispatch(setCurrentGame({ gameId: 'local_seed', startingPlayer: 'X' as any }));
    const container = await render();
    const btn = container.querySelector('[data-testid="create-game-btn-secondary"]') as HTMLButtonElement;
    btn?.click();
    await flush();
    const s = (store.getState() as any).game;
    expect(s.gameId).toBe('local_seed');
  });

  it('online: createGame error does not update store', async () => {
    const svc = await import('../socket/socketService');
    (svc.socketService.getForcedOffline as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const emitters = await import('../socket/clientEmitters');
    (emitters.createGame as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, error: 'boom' } as any);
    // Ensure starting state
    store.dispatch(resetGameState());
    const container = await render();
    const btn = container.querySelector('[data-testid="create-game-btn-secondary"]') as HTMLButtonElement;
    btn?.click();
    await flush();
    const s = (store.getState() as any).game;
    expect(s.gameId).toBeNull();
    expect(s.myPlayer).toBeUndefined();
  });

  it('offline: human first does not make AI opening move', async () => {
    const mod = await import('../socket/socketService');
    (mod.socketService.getForcedOffline as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    try { window.localStorage.setItem('ttt_start_mode', 'human'); } catch {}
    try { window.localStorage.setItem('ttt_strategy', 'random'); } catch {}
    const container = await render();
    const btn = container.querySelector('[data-testid="create-game-btn-secondary"]') as HTMLButtonElement;
    btn?.click();
    await flush();
    const s = (store.getState() as any).game;
    expect(s.myPlayer).toBe('X');
    expect(s.lastMove).toBeUndefined();
    expect(s.currentPlayer).toBe('X');
  });

  it('online: creates new game even if previous was local', async () => {
    const svc = await import('../socket/socketService');
    (svc.socketService.getForcedOffline as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const emitters = await import('../socket/clientEmitters');
    (emitters.createGame as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, gameId: 'g-new-2', player: 'X', currentPlayer: 'X' } as any);
    // Seed local game id
    store.dispatch(setCurrentGame({ gameId: 'local_old', startingPlayer: 'X' as any }));
    try { window.localStorage.setItem('ttt_start_mode', 'human'); } catch {}
    try { window.localStorage.setItem('ttt_strategy', 'random'); } catch {}
    const originalDispatch = store.dispatch as unknown as (...args: any[]) => any;
    let lastPromise: Promise<any> | null = null;
    const dispatchSpy = vi.spyOn(store, 'dispatch').mockImplementation(((action: any) => {
      const result = (originalDispatch as any)(action);
      if (typeof action === 'function') lastPromise = result as Promise<any>;
      return result;
    }) as any);
    const container = await render();
    const btn = container.querySelector('[data-testid="create-game-btn-secondary"]') as HTMLButtonElement;
    // Click to exercise the component, then explicitly await the thunk to de-flake
    btn?.click();
    if (lastPromise) { await lastPromise; }
    const { createOrResetGame } = await import('../store/thunks');
    await (store.dispatch as unknown as any)(createOrResetGame());
    await flush();
    dispatchSpy.mockRestore();
    const s = (store.getState() as any).game;
    expect(s.gameId).toBe('g-new-2');
    expect(s.myPlayer).toBe('X');
  });

  it('renders disabled when start mode or strategy not set; click is no-op', async () => {
    // ensure storage is empty
    try { window.localStorage.removeItem('ttt_start_mode'); } catch {}
    try { window.localStorage.removeItem('ttt_strategy'); } catch {}
    const container = await render();
    const btn = container.querySelector('[data-testid="create-game-btn-secondary"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    btn.click();
    await flush();
    const emitters = await import('../socket/clientEmitters');
    expect((emitters.createGame as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('has expected title and classes', async () => {
    const container = await render();
    const btn = container.querySelector('[data-testid="create-game-btn-secondary"]') as HTMLButtonElement;
    expect(btn.title).toBe('Start a new game');
    expect(btn.className).toContain('bg-primary-600');
    expect(btn.className).toContain('rounded-md');
  });

  it('updates readiness on ttt:session-change event', async () => {
    // start with not ready
    try { window.localStorage.removeItem('ttt_start_mode'); } catch {}
    try { window.localStorage.removeItem('ttt_strategy'); } catch {}
    const container = await render();
    const btn = container.querySelector('[data-testid="create-game-btn-secondary"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    // set storage and dispatch event
    try { window.localStorage.setItem('ttt_start_mode', 'human'); } catch {}
    try { window.localStorage.setItem('ttt_strategy', 'ai0'); } catch {}
    window.dispatchEvent(new Event('ttt:session-change' as any));
    await flush();
    expect(btn.disabled).toBe(false);
  });

  it('updates readiness on storage event when values are added', async () => {
    // start with not ready
    try { window.localStorage.removeItem('ttt_start_mode'); } catch {}
    try { window.localStorage.removeItem('ttt_strategy'); } catch {}
    const container = await render();
    const btn = container.querySelector('[data-testid="create-game-btn-secondary"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    // fire storage events to simulate external change
    try { window.localStorage.setItem('ttt_start_mode', 'human'); } catch {}
    window.dispatchEvent(new StorageEvent('storage', { key: 'ttt_start_mode', newValue: 'human' }));
    await flush();
    // still disabled because strategy missing
    expect(btn.disabled).toBe(true);
    try { window.localStorage.setItem('ttt_strategy', 'ai0'); } catch {}
    window.dispatchEvent(new StorageEvent('storage', { key: 'ttt_strategy', newValue: 'ai0' }));
    await flush();
    expect(btn.disabled).toBe(false);
  });

  it('disables again when one of the required values is cleared (storage event)', async () => {
    try { window.localStorage.setItem('ttt_start_mode', 'ai'); } catch {}
    try { window.localStorage.setItem('ttt_strategy', 'ai0'); } catch {}
    const container = await render();
    const btn = container.querySelector('[data-testid="create-game-btn-secondary"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    // remove strategy and dispatch storage event
    try { window.localStorage.removeItem('ttt_strategy'); } catch {}
    window.dispatchEvent(new StorageEvent('storage', { key: 'ttt_strategy', newValue: null as any }));
    await flush();
    expect(btn.disabled).toBe(true);
  });

  it('dispatches the createOrResetGame thunk when ready and clicked', async () => {
    try { window.localStorage.setItem('ttt_start_mode', 'human'); } catch {}
    try { window.localStorage.setItem('ttt_strategy', 'ai0'); } catch {}
    const spy = vi.spyOn(store, 'dispatch');
    const container = await render();
    const btn = container.querySelector('[data-testid="create-game-btn-secondary"]') as HTMLButtonElement;
    btn?.click();
    await flush();
    expect(spy).toHaveBeenCalled();
    const firstArg = (spy.mock.calls[0] || [])[0];
    expect(typeof firstArg === 'function').toBe(true);
    spy.mockRestore();
  });

  it('adds and removes event listeners on mount/unmount', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    // Ensure ready so the button renders
    try { window.localStorage.setItem('ttt_start_mode', 'human'); } catch {}
    try { window.localStorage.setItem('ttt_strategy', 'ai0'); } catch {}
    // Inline render to capture root and unmount
    const container = document.createElement('div');
    const root = createRoot(container);
    const { default: NewGameButton } = await import('./NewGameButton');
    root.render(React.createElement(Provider as any, { store }, React.createElement(NewGameButton)));
    await flush();
    // Expect listeners added for custom and storage events
    const addedTypes = addSpy.mock.calls.map((c) => c[0]);
    expect(addedTypes).toContain('storage');
    expect(addedTypes).toContain('ttt:session-change');
    // Unmount triggers cleanup
    root.unmount();
    await flush();
    const removedTypes = removeSpy.mock.calls.map((c) => c[0]);
    expect(removedTypes).toContain('storage');
    expect(removedTypes).toContain('ttt:session-change');
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('has the expected aria-label when rendered', async () => {
    try { window.localStorage.setItem('ttt_start_mode', 'human'); } catch {}
    try { window.localStorage.setItem('ttt_strategy', 'ai0'); } catch {}
    const container = await render();
    const btn = container.querySelector('[data-testid="create-game-btn-secondary"]') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toBe('Create new game');
  });

  it('does not dispatch when not ready (no selections)', async () => {
    // ensure not ready
    try { window.localStorage.removeItem('ttt_start_mode'); } catch {}
    try { window.localStorage.removeItem('ttt_strategy'); } catch {}
    const spy = vi.spyOn(store, 'dispatch');
    const container = await render();
    const btn = container.querySelector('[data-testid="create-game-btn-secondary"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    btn?.click();
    await flush();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('NewGameButtonSecondary dispatches when ready and clicked', async () => {
    try { window.localStorage.setItem('ttt_start_mode', 'human'); } catch {}
    try { window.localStorage.setItem('ttt_strategy', 'ai0'); } catch {}
    const spy = vi.spyOn(store, 'dispatch');
    const container = document.createElement('div');
    const root = createRoot(container);
    const { NewGameButtonSecondary } = await import('./NewGameButton');
    root.render(React.createElement(Provider as any, { store }, React.createElement(NewGameButtonSecondary)));
    await flush();
    const btn = container.querySelector('[data-testid="create-game-btn-secondary"]') as HTMLButtonElement;
    btn?.click();
    await flush();
    expect(spy).toHaveBeenCalled();
    root.unmount();
    spy.mockRestore();
  });
});


