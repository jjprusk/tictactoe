// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../store';

describe('ResetButton', () => {
  it('clears current game when clicked', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const { default: ResetButton } = await import('./ResetButton');
    const { setCurrentGame } = await import('../store/gameSlice');

    await act(async () => {
      store.dispatch(setCurrentGame({ gameId: 'g1' }));
      root.render(React.createElement(Provider as any, { store }, React.createElement(ResetButton)));
    });
    const btn = container.querySelector('[data-testid="reset-button"]') as HTMLButtonElement;
    expect(btn).toBeTruthy();

    await act(async () => { btn.click(); });
    // After reset, button should disappear because gameId is null
    expect(container.querySelector('[data-testid="reset-button"]')).toBeNull();
  });
});


