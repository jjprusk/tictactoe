// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import { flush } from './test/flush';
import { resetGameState } from './store/gameSlice';

vi.mock('./socket/clientEmitters', async (orig) => {
  const actual = await (orig as any)();
  return {
    ...actual,
    createGame: vi.fn().mockResolvedValue({ ok: true, gameId: 'g1', player: 'X' }),
  };
});

vi.mock('./socket/socketService', () => ({
  socketService: {
    getForcedOffline: vi.fn(() => false),
    setForcedOffline: vi.fn(),
    connect: vi.fn(),
  },
}));

vi.mock('./utils/sessionStore', () => ({
  sessionStore: {
    get: vi.fn(() => null),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('OptionsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    try { store.dispatch(resetGameState()); } catch {}
    // Ensure we start tests online unless explicitly overridden
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const svc = require('./socket/socketService');
      if (svc?.socketService?.getForcedOffline?.mockReturnValue) {
        svc.socketService.getForcedOffline.mockReturnValue(false);
      }
    } catch {}
  });
  afterEach(() => {
    vi.clearAllMocks();
    try { window.localStorage.removeItem('ttt_strategy'); } catch {}
    try { window.localStorage.removeItem('ttt_ai_starts'); } catch {}
    try { window.localStorage.removeItem('ttt_start_mode'); } catch {}
    try { window.localStorage.clear(); } catch {}
  });

  it('renders strategy select and updates localStorage on change', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const { default: OptionsPanel } = await import('./OptionsPanel');

    await act(async () => {
      root.render(React.createElement(Provider as any, { store }, React.createElement(OptionsPanel)));
    });

    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select).toBeTruthy();

    await act(async () => {
      select.value = 'ai1';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(window.localStorage.getItem('ttt_strategy')).toBe('ai1');
  });

  // New Game button moved out of OptionsPanel; creation/reset flows are covered in NewGameButton tests.

  it('changing Start mode persists to localStorage', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const { default: OptionsPanel } = await import('./OptionsPanel');
    await act(async () => { root.render(React.createElement(Provider as any, { store }, React.createElement(OptionsPanel))); });
    const select = container.querySelector('#start-mode-select') as HTMLSelectElement;
    await act(async () => {
      select.value = 'alternate';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(window.localStorage.getItem('ttt_start_mode')).toBe('alternate');
  });

});


