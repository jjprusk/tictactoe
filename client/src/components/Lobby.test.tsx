// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../store';
import { setOffline } from '../store/gameSlice';

vi.mock('../socket/clientEmitters', async (orig) => {
  const actual = await (orig as any)();
  return {
    ...actual,
    listGames: vi.fn(),
    joinGame: vi.fn(),
  };
});

describe('Lobby', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const flush = async () => {
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
  };

  it('shows empty state when no games are returned', async () => {
    const { default: Lobby } = await import('./Lobby');
    const emitters = await import('../socket/clientEmitters');
    (emitters.listGames as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, games: [] });

    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(Provider as any, { store }, React.createElement(Lobby)));
    });
    await flush();
    expect(container.textContent || '').toMatch(/No active games/i);
  });

  it('renders list of active games', async () => {
    const { default: Lobby } = await import('./Lobby');
    const emitters = await import('../socket/clientEmitters');
    (emitters.listGames as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, games: [
      { gameId: 'everest', hasX: true, hasO: false, observerCount: 0, status: 'waiting', lastActiveAt: Date.now() },
      { gameId: 'k2', hasX: true, hasO: true, observerCount: 1, status: 'in_progress', lastActiveAt: Date.now() },
    ] });

    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(Provider as any, { store }, React.createElement(Lobby)));
    });
    await flush();
    const text = container.textContent || '';
    expect(text).toContain('everest');
    expect(text).toContain('k2');
  });

  it('hide completed toggle filters out completed rows and Load more reveals more', async () => {
    const { default: Lobby } = await import('./Lobby');
    const emitters = await import('../socket/clientEmitters');
    const now = Date.now();
    (emitters.listGames as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, games: [
      { gameId: 'g1', hasX: true, hasO: true, observerCount: 0, status: 'complete', lastActiveAt: now - 1000 },
      { gameId: 'g2', hasX: true, hasO: false, observerCount: 1, status: 'waiting', lastActiveAt: now - 900 },
      { gameId: 'g3', hasX: true, hasO: true, observerCount: 2, status: 'in_progress', lastActiveAt: now - 800 },
      { gameId: 'g4', hasX: true, hasO: true, observerCount: 0, status: 'in_progress', lastActiveAt: now - 700 },
      { gameId: 'g5', hasX: true, hasO: true, observerCount: 0, status: 'in_progress', lastActiveAt: now - 600 },
      { gameId: 'g6', hasX: true, hasO: true, observerCount: 0, status: 'in_progress', lastActiveAt: now - 500 },
      { gameId: 'g7', hasX: true, hasO: true, observerCount: 0, status: 'in_progress', lastActiveAt: now - 400 },
      { gameId: 'g8', hasX: true, hasO: true, observerCount: 0, status: 'in_progress', lastActiveAt: now - 300 },
      { gameId: 'g9', hasX: true, hasO: true, observerCount: 0, status: 'in_progress', lastActiveAt: now - 200 },
      { gameId: 'g10', hasX: true, hasO: true, observerCount: 0, status: 'in_progress', lastActiveAt: now - 100 },
      { gameId: 'g11', hasX: true, hasO: true, observerCount: 0, status: 'in_progress', lastActiveAt: now - 50 },
      { gameId: 'g12', hasX: true, hasO: true, observerCount: 0, status: 'in_progress', lastActiveAt: now - 25 },
    ] });

    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(Provider as any, { store }, React.createElement(Lobby)));
    });
    await flush();
    // hideCompleted default is true; completed row g1 should be filtered out
    expect(container.querySelector('[data-testid="watch-g1"]')).toBeNull();
    expect(container.querySelector('[data-testid="join-g1"]')).toBeNull();
    // Only first 10 visible by default (g2..g11 -> 10 visible; g11 hidden)
    expect((container.querySelectorAll('tbody tr').length)).toBe(10);
    const loadMore = container.querySelector('[data-testid="lobby-load-more"]') as HTMLButtonElement;
    expect(loadMore).toBeTruthy();
    await act(async () => { loadMore.click(); });
    await flush();
    // After load more, an additional row (e.g., g12) should appear
    expect((container.querySelectorAll('tbody tr').length)).toBeGreaterThan(10);
    expect(container.textContent || '').toContain('g12');
    // Toggle to show completed
    const toggle = container.querySelector('[data-testid="hide-completed-toggle"]') as HTMLInputElement;
    await act(async () => { toggle.click(); });
    await flush();
    expect(container.textContent || '').toContain('g1');
  });

  it('handles error from listGames and shows error state', async () => {
    const { default: Lobby } = await import('./Lobby');
    const emitters = await import('../socket/clientEmitters');
    store.dispatch(setOffline(false));
    (emitters.listGames as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));

    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(Provider as any, { store }, React.createElement(Lobby)));
    });
    await flush();
    expect(container.textContent || '').toMatch(/Unable to load lobby/i);
  });

  it('clicking Join emits join_game and updates state', async () => {
    const { default: Lobby } = await import('./Lobby');
    const emitters = await import('../socket/clientEmitters');
    (emitters.listGames as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, games: [
      { gameId: 'everest', hasX: true, hasO: false, observerCount: 0, status: 'waiting', lastActiveAt: Date.now() },
    ] });
    (emitters.joinGame as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, role: 'observer' });

    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(Provider as any, { store }, React.createElement(Lobby)));
    });
    await flush();
    const joinBtn = container.querySelector('[data-testid="join-everest"]') as HTMLButtonElement;
    await act(async () => { joinBtn.click(); });
    await flush();
    expect((emitters.joinGame as any)).toHaveBeenCalledWith({ gameId: 'everest' });
  });

  it('clicking Watch emits join_game with asObserver and updates state', async () => {
    const { default: Lobby } = await import('./Lobby');
    const emitters = await import('../socket/clientEmitters');
    (emitters.listGames as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, games: [
      { gameId: 'k2', hasX: true, hasO: true, observerCount: 0, status: 'in_progress', lastActiveAt: Date.now() },
    ] });
    (emitters.joinGame as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, role: 'observer' });

    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(Provider as any, { store }, React.createElement(Lobby)));
    });
    await flush();
    const watchBtn = container.querySelector('[data-testid="watch-k2"]') as HTMLButtonElement;
    await act(async () => { watchBtn.click(); });
    await flush();
    expect((emitters.joinGame as any)).toHaveBeenCalledWith({ gameId: 'k2', asObserver: true });
  });

  it('shows offline banner and does not fetch when offline', async () => {
    const { default: Lobby } = await import('./Lobby');
    const emitters = await import('../socket/clientEmitters');
    store.dispatch(setOffline(true));
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(Provider as any, { store }, React.createElement(Lobby)));
    });
    await flush();
    expect(container.textContent || '').toMatch(/Lobby is unavailable while offline/i);
    expect((emitters.listGames as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('shows error state when listGames rejects', async () => {
    const { default: Lobby } = await import('./Lobby');
    const emitters = await import('../socket/clientEmitters');
    (emitters.listGames as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    store.dispatch(setOffline(false));
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(Provider as any, { store }, React.createElement(Lobby)));
    });
    await flush();
    expect(container.textContent || '').toMatch(/Unable to load lobby/i);
  });
});


