// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../store';
import { setCurrentGame, resetGameState } from '../store/gameSlice';

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
});
