// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../store';
import { setCurrentGame, resetGameState, setOffline } from '../store/gameSlice';
import { flush } from '../test/flush';
import { vi } from 'vitest';

vi.mock('../socket/clientEmitters', async (orig) => {
  const actual = await (orig as any)();
  return {
    ...actual,
    createGame: vi.fn().mockResolvedValue({ ok: true, gameId: 'g-mock', player: 'X', currentPlayer: 'X' }),
  };
});

vi.mock('../socket/socketService', () => ({
  socketService: {
    getForcedOffline: vi.fn(() => false),
  },
}));

describe('NoGameNotice', () => {
  it('shows when no gameId and hides when a game is active', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const { default: NoGameNotice } = await import('./NoGameNotice');

    await act(async () => {
      store.dispatch(resetGameState());
      root.render(React.createElement(Provider as any, { store }, React.createElement(NoGameNotice)));
    });

    expect(container.textContent || '').toMatch(/No active game/i);

    await act(async () => {
      store.dispatch(setCurrentGame({ gameId: 'g1' }));
    });

    expect(container.textContent || '').not.toMatch(/No active game/i);
  });

  it('online: clicking New Game emits create_game and sets store from ack', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const { default: NoGameNotice } = await import('./NoGameNotice');
    const emitters = await import('../socket/clientEmitters');
    (emitters.createGame as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, gameId: 'room-z', player: 'X', currentPlayer: 'O' } as any);
    await act(async () => {
      store.dispatch(resetGameState());
      root.render(React.createElement(Provider as any, { store }, React.createElement(NoGameNotice)));
    });
    const btn = container.querySelector('button');
    await act(async () => { (btn as HTMLButtonElement)?.click(); await flush(); });
    const s: any = store.getState();
    expect(s.game.gameId).toBe('room-z');
    expect(s.game.myPlayer).toBe('X');
  });

  it('offline: clicking New Game starts local and AI moves first when configured', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const { default: NoGameNotice } = await import('./NoGameNotice');
    // Force offline flag in store and AI First in storage
    store.dispatch(setOffline(true));
    try { window.localStorage.setItem('ttt_start_mode', 'ai'); } catch {}
    await act(async () => {
      store.dispatch(resetGameState());
      root.render(React.createElement(Provider as any, { store }, React.createElement(NoGameNotice)));
    });
    const btn = container.querySelector('button');
    await act(async () => { (btn as HTMLButtonElement)?.click(); await flush(); });
    const s: any = store.getState();
    expect(s.game.gameId?.startsWith('local_')).toBe(true);
    expect(typeof s.game.lastMove).toBe('number');
    expect(s.game.board[s.game.lastMove]).toBe('X');
    expect(s.game.currentPlayer).toBe('O');
  });

  it('has role note and aria-live polite', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const { default: NoGameNotice } = await import('./NoGameNotice');
    await act(async () => {
      store.dispatch(resetGameState());
      root.render(React.createElement(Provider as any, { store }, React.createElement(NoGameNotice)));
    });
    const note = container.querySelector('[role="note"]');
    expect(note).toBeTruthy();
    expect((note as HTMLElement).getAttribute('aria-live')).toBe('polite');
  });

  it('renders nothing when a game is already active at first render', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const { default: NoGameNotice } = await import('./NoGameNotice');
    await act(async () => {
      store.dispatch(setCurrentGame({ gameId: 'g2' }));
      root.render(React.createElement(Provider as any, { store }, React.createElement(NoGameNotice)));
    });
    expect(container.textContent || '').not.toMatch(/No active game/i);
  });

  it('shows again after resetGameState', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const { default: NoGameNotice } = await import('./NoGameNotice');
    await act(async () => {
      store.dispatch(setCurrentGame({ gameId: 'g3' }));
      root.render(React.createElement(Provider as any, { store }, React.createElement(NoGameNotice)));
    });
    await act(async () => { store.dispatch(resetGameState()); root.render(React.createElement(Provider as any, { store }, React.createElement(NoGameNotice))); await flush(); });
    expect(container.textContent || '').toMatch(/No active game/i);
  });

  it('has accessible region with call to action', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const { default: NoGameNotice } = await import('./NoGameNotice');
    await act(async () => {
      store.dispatch(resetGameState());
      root.render(React.createElement(Provider as any, { store }, React.createElement(NoGameNotice)));
    });
    const text = container.textContent || '';
    expect(text).toMatch(/No active game/i);
    // lenient structure checks
    const link = container.querySelector('a, button');
    expect(link).toBeTruthy();
  });
});
