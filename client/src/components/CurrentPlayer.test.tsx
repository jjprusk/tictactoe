// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../store';

describe('CurrentPlayer', () => {
  it('renders current player and updates via store', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const { default: CurrentPlayer } = await import('./CurrentPlayer');
    const { setCurrentGame, gameStateReceived } = await import('../store/gameSlice');

    await act(async () => {
      store.dispatch(setCurrentGame({ gameId: 'g1' }));
      root.render(React.createElement(Provider as any, { store }, React.createElement(CurrentPlayer)));
    });

    const label = () => container.querySelector('[data-testid="current-player-label"]')?.textContent || '';
    expect(label()).toMatch(/Current: X|O/);

    await act(async () => {
      store.dispatch(gameStateReceived({ gameId: 'g1', board: [null,null,null,null,null,null,null,null,null], currentPlayer: 'O' } as any));
    });
    expect(label()).toMatch(/Current: O/);
  });
});


