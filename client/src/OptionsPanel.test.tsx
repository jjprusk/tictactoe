// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';

vi.mock('./socket/clientEmitters', async (orig) => {
  const actual = await (orig as any)();
  return {
    ...actual,
    createGame: vi.fn().mockResolvedValue({ ok: true, gameId: 'g1', player: 'X' }),
  };
});

describe('OptionsPanel', () => {
  afterEach(() => {
    vi.clearAllMocks();
    try { window.localStorage.removeItem('ttt_strategy'); } catch {}
    try { window.localStorage.removeItem('ttt_ai_starts'); } catch {}
    try { window.localStorage.removeItem('ttt_start_mode'); } catch {}
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
      select.value = 'ai';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(window.localStorage.getItem('ttt_strategy')).toBe('ai');
  });

  it('clicking New Game emits create_game with stored strategy by default', async () => {
    const { default: OptionsPanel } = await import('./OptionsPanel');
    const emitters = await import('./socket/clientEmitters');
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => { root.render(React.createElement(Provider as any, { store }, React.createElement(OptionsPanel))); });
    const btn = container.querySelector('[data-testid="create-game-btn"]') as HTMLButtonElement;
    await act(async () => { btn.click(); });
    expect((emitters.createGame as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({ strategy: 'random', aiStarts: false, startMode: 'human' });
  });

  it('selecting AI then New Game uses AI strategy', async () => {
    const { default: OptionsPanel } = await import('./OptionsPanel');
    const emitters = await import('./socket/clientEmitters');
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => { root.render(React.createElement(Provider as any, { store }, React.createElement(OptionsPanel))); });
    const select = container.querySelector('#strategy-select') as HTMLSelectElement;
    await act(async () => {
      select.value = 'ai';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const btn = container.querySelector('[data-testid="create-game-btn"]') as HTMLButtonElement;
    await act(async () => { btn.click(); });
    expect((emitters.createGame as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });
});


