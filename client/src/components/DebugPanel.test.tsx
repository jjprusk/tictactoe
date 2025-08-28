// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../store';
import { setCurrentGame, setRole } from '../store/gameSlice';

describe('DebugPanel', () => {
  it('renders only when ttt_debug=1 and shows selected game fields', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const { default: DebugPanel } = await import('./DebugPanel');

    // ensure off by default
    await act(async () => {
      try { localStorage.removeItem('ttt_debug'); } catch {}
      root.render(React.createElement(Provider as any, { store }, React.createElement(DebugPanel)));
    });
    expect(container.textContent || '').toBe('');

    // turn on and re-render (component doesn't subscribe when off)
    await act(async () => {
      try { localStorage.setItem('ttt_debug', '1'); } catch {}
      store.dispatch(setCurrentGame({ gameId: 'g-xyz', startingPlayer: 'X' as any }));
      store.dispatch(setRole('player'));
      root.render(React.createElement(Provider as any, { store }, React.createElement(DebugPanel)));
    });

    expect(container.textContent || '').toMatch(/g-xyz/);
    expect(container.textContent || '').toMatch(/"role":\s*"player"/);

    // turn off
    await act(async () => {
      try { localStorage.setItem('ttt_debug', '0'); } catch {}
    });
    // Re-render to reflect change
    await act(async () => {
      root.render(React.createElement(Provider as any, { store }, React.createElement(DebugPanel)));
    });
    expect(container.textContent || '').toBe('');
  });
});


