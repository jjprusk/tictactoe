// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../store';

vi.mock('../socket/clientEmitters', async (orig) => {
  const actual = await (orig as any)();
  return {
    ...actual,
    listGames: vi.fn(),
    joinGame: vi.fn(),
  };
});

describe('Lobby', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const flush = async () => {
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
  };

  it('shows empty state when no games are returned', async () => {
    const { default: Lobby } = await import('./Lobby');
    const emitters = await import('../socket/clientEmitters');
    (emitters.listGames as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, games: [] });

    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(Provider as any, { store }, React.createElement(Lobby)));
    });
    await flush();
    expect(container.textContent || '').toMatch(/No active games/i);
  });

  it('renders list of active games', async () => {
    const { default: Lobby } = await import('./Lobby');
    const emitters = await import('../socket/clientEmitters');
    (emitters.listGames as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, games: ['everest', 'k2'] });

    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(Provider as any, { store }, React.createElement(Lobby)));
    });
    await flush();
    const text = container.textContent || '';
    expect(text).toContain('everest');
    expect(text).toContain('k2');
  });

  it('handles error from listGames and shows empty state', async () => {
    const { default: Lobby } = await import('./Lobby');
    const emitters = await import('../socket/clientEmitters');
    (emitters.listGames as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));

    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(Provider as any, { store }, React.createElement(Lobby)));
    });
    await flush();
    expect(container.textContent || '').toMatch(/No active games/i);
  });

  it('clicking Join emits join_game and updates state', async () => {
    const { default: Lobby } = await import('./Lobby');
    const emitters = await import('../socket/clientEmitters');
    (emitters.listGames as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, games: ['everest'] });
    (emitters.joinGame as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, role: 'observer' });

    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(Provider as any, { store }, React.createElement(Lobby)));
    });
    await flush();
    const joinBtn = container.querySelector('[data-testid="join-everest"]') as HTMLButtonElement;
    await act(async () => { joinBtn.click(); });
    await flush();
    expect((emitters.joinGame as any)).toHaveBeenCalledWith({ gameId: 'everest' });
  });
});


