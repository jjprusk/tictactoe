// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../store';

describe('ResultBanner', () => {
  it('shows winner and draw states', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const { default: ResultBanner } = await import('./ResultBanner');
    const { setCurrentGame, gameStateReceived } = await import('../store/gameSlice');

    await act(async () => {
      store.dispatch(setCurrentGame({ gameId: 'g1' }));
      root.render(React.createElement(Provider as any, { store }, React.createElement(ResultBanner)));
    });

    // No banner initially
    expect(container.querySelector('[data-testid="result-banner"]')).toBeNull();

    // Winner
    await act(async () => {
      store.dispatch(gameStateReceived({ gameId: 'g1', board: ['X','X','X',null,null,null,null,null,null], currentPlayer: 'O', winner: 'X' } as any));
    });
    expect(container.textContent || '').toMatch(/X wins!/);

    // Draw
    await act(async () => {
      store.dispatch(gameStateReceived({ gameId: 'g1', board: Array(9).fill(null), currentPlayer: 'X', draw: true } as any));
    });
    expect(container.textContent || '').toMatch(/draw/i);
  });
});


