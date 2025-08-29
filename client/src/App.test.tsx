// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

vi.mock('./utils/clientLogger', () => ({
  sendLog: vi.fn(async () => undefined),
  getStoredStrategy: vi.fn(() => 'ai0'),
  setStoredStrategy: vi.fn((s: string) => {
    window.localStorage.setItem('ttt_strategy', s as any);
  }),
  createClientLogger: () => ({ info: vi.fn(async () => undefined) }),
}));

describe('App', () => {
  it('renders title and calls sendLog on mount', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const { default: App } = await import('./App');
    const { Provider } = await import('react-redux');
    const { store } = await import('./store');

    await act(async () => {
      root.render(React.createElement(Provider as any, { store }, React.createElement(App)));
    });

    expect(document.body.textContent || '').toContain('TicTacToe');

    const mod = await import('./utils/clientLogger');
    expect((mod as any).sendLog).toHaveBeenCalled();
  });
});


