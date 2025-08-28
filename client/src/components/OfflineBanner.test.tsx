// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../store';
import { setOffline } from '../store/gameSlice';

describe('OfflineBanner', () => {
  it('renders only when offline is true and hides when back online', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const { default: OfflineBanner } = await import('./OfflineBanner');

    await act(async () => {
      store.dispatch(setOffline(false));
      root.render(React.createElement(Provider as any, { store }, React.createElement(OfflineBanner)));
    });

    expect(container.textContent || '').not.toMatch(/You are offline/i);

    await act(async () => {
      store.dispatch(setOffline(true));
    });

    expect(container.textContent || '').toMatch(/You are offline/i);

    await act(async () => {
      store.dispatch(setOffline(false));
    });

    expect(container.textContent || '').not.toMatch(/You are offline/i);
  });
});


