// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../store';
import ConnectionStatus from './ConnectionStatus';
import NewGameButton from './NewGameButton';
import ResetButton from './ResetButton';
import GameRoomBadge from './GameRoomBadge';
import { setCurrentGame, resetGameState } from '../store/gameSlice';
import { act } from 'react';
import { flush } from '../test/flush';

vi.mock('../socket/socketService', () => ({
  socketService: {
    getForcedOffline: vi.fn(() => false),
    subscribeStatus: vi.fn(() => () => {}),
    getStatus: vi.fn(() => 'disconnected'),
  },
}));

function renderEl(el: React.ReactElement): HTMLDivElement {
  const container = document.createElement('div');
  const root = createRoot(container);
  root.render(el);
  return container;
}

describe('UI snapshots (lightweight)', () => {
  it('ConnectionStatus structure', async () => {
    const c = renderEl(React.createElement(Provider as any, { store }, React.createElement(ConnectionStatus)));
    await flush();
    const node = c.querySelector('[data-testid="status-text"]');
    expect(node).toBeTruthy();
  });

  it('NewGameButton structure', async () => {
    // Seed required selections so button renders enabled and present
    try { window.localStorage.setItem('ttt_start_mode', 'human'); } catch {}
    try { window.localStorage.setItem('ttt_strategy', 'ai0'); } catch {}
    const c = renderEl(React.createElement(Provider as any, { store }, React.createElement(NewGameButton)));
    await flush();
    const node = c.querySelector('[data-testid="create-game-btn-secondary"]');
    expect(node).toBeTruthy();
    expect((node as HTMLElement).textContent || '').toMatch(/New Game/i);
  });

  it('ResetButton structure', async () => {
    await act(async () => { store.dispatch(resetGameState()); store.dispatch(setCurrentGame({ gameId: 'g-any' } as any)); });
    const c = renderEl(React.createElement(Provider as any, { store }, React.createElement(ResetButton)));
    await flush();
    const node = c.querySelector('[data-testid="reset-button"]');
    expect(node).toBeTruthy();
  });

  it('GameRoomBadge structure', async () => {
    await act(async () => { store.dispatch(resetGameState()); store.dispatch(setCurrentGame({ gameId: 'g-badge' } as any)); });
    const c = renderEl(React.createElement(Provider as any, { store }, React.createElement(GameRoomBadge)));
    await flush();
    await flush();
    const node = c.querySelector('[data-testid="game-room-badge"]');
    expect(node).toBeTruthy();
  });
});


