import React from 'react';
import { describe, it, expect } from 'vitest';
import { Provider } from 'react-redux';
import { createRoot } from 'react-dom/client';
import AIFirstBadge from './AIFirstBadge';
import { store } from '../store';
import { setCurrentGame, setMyPlayer, gameStateReceived, resetGameState } from '../store/gameSlice';
import { act } from 'react';
import { flush } from '../test/flush';
import { flush } from '../test/flush';

const render = async (): Promise<HTMLDivElement> => {
  const container = document.createElement('div');
  const root = createRoot(container);
  root.render(
    React.createElement(Provider as any, { store }, React.createElement(AIFirstBadge))
  );
  await flush();
  return container;
};

describe('AIFirstBadge', () => {
  it('is hidden when there is no game', async () => {
    const container = await render();
    expect(container.textContent || '').not.toMatch(/AI First/i);
  });

  it('shows when myPlayer is O and current player is X', async () => {
    const container = await render();
    await act(async () => {
      store.dispatch(resetGameState());
      store.dispatch(setCurrentGame({ gameId: 'g1', startingPlayer: 'X' as any }));
      store.dispatch(setMyPlayer('O' as any));
      await flush();
    });
    expect(container.textContent || '').toMatch(/AI First/i);
  });

  it('hides once game has a winner or draw', async () => {
    store.dispatch(setCurrentGame({ gameId: 'g2', startingPlayer: 'X' as any }));
    store.dispatch(setMyPlayer('O' as any));
    // simulate AI moved: winner O or draw true should hide
    store.dispatch(gameStateReceived({ gameId: 'g2', board: Array(9).fill(null), currentPlayer: 'O' as any, winner: 'X' as any } as any));
    const container = await render();
    expect(container.textContent || '').not.toMatch(/AI First/i);
  });
});
