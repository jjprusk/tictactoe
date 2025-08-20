// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

vi.mock('./utils/clientLogger', () => ({
  sendLog: vi.fn(async () => undefined),
  getStoredStrategy: vi.fn(() => 'random'),
  setStoredStrategy: vi.fn((s: string) => {
    window.localStorage.setItem('ttt_strategy', s as any);
  }),
}));

describe('App', () => {
  it('renders title and calls sendLog on mount', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const { default: App } = await import('./App');

    await act(async () => {
      root.render(React.createElement(App));
    });

    expect(document.body.textContent || '').toContain('TicTacToe');

    const mod = await import('./utils/clientLogger');
    expect((mod as any).sendLog).toHaveBeenCalled();
  });
});


