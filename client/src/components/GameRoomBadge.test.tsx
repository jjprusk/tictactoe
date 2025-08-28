// © 2025 Joe Pruskowski
import React from 'react';
import { act } from 'react';
import { describe, it, expect } from 'vitest';
import { Provider } from 'react-redux';
import { createRoot } from 'react-dom/client';
import { store } from '../store';
import GameRoomBadge from './GameRoomBadge';
import { setCurrentGame, resetGameState } from '../store/gameSlice';
import { flush } from '../test/flush';

async function render(): Promise<HTMLDivElement> {
  const container = document.createElement('div');
  const root = createRoot(container);
  await Promise.resolve();
  root.render(React.createElement(Provider as any, { store }, React.createElement(GameRoomBadge)));
  await Promise.resolve();
  return container;
}

describe('GameRoomBadge', () => {
  it('hidden when no game', async () => {
    store.dispatch(resetGameState());
    const c = await render();
    expect(c.textContent || '').not.toMatch(/Room:/i);
  });

  it('shows local game label', async () => {
    await act(async () => {
      store.dispatch(resetGameState());
      store.dispatch(setCurrentGame({ gameId: 'local_123' as any }));
    });
    const c = await render();
    await flush();
    const badge = c.querySelector('[data-testid="game-room-badge"]');
    expect(badge).toBeTruthy();
    expect((badge?.textContent || '')).toMatch(/Local Game/i);
  });

  it('shows room id for online games', async () => {
    store.dispatch(setCurrentGame({ gameId: 'everest' as any }));
    const c = await render();
    await flush();
    expect(c.textContent || '').toMatch(/everest/i);
  });
});


