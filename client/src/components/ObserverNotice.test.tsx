// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../store';

describe('ObserverNotice', () => {
  it('shows notice when role is observer', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const { default: ObserverNotice } = await import('./ObserverNotice');
    const { setCurrentGame, setRole } = await import('../store/gameSlice');

    await act(async () => {
      store.dispatch(setCurrentGame({ gameId: 'g1' }));
      store.dispatch(setRole('observer'));
      root.render(React.createElement(Provider as any, { store }, React.createElement(ObserverNotice)));
    });

    expect(container.querySelector('[data-testid="observer-notice"]')).toBeTruthy();
  });
});


