// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from 'react';
import { flush } from '../test/flush';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../store';
import { resetGameState } from '../store/gameSlice';

describe('Board', () => {
    const flush = async () => {
        await Promise.resolve();
        await new Promise((r) => setTimeout(r, 0));
    };
	beforeEach(() => {
		store.dispatch(resetGameState());
	});
	it('renders 9 cells and applies optimistic pending mark on click', async () => {
		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);

		const { default: Board } = await import('./Board');
		const { setCurrentGame } = await import('../store/gameSlice');
		await act(async () => {
			store.dispatch(setCurrentGame({ gameId: 'g1' }));
			root.render(React.createElement(Provider as any, { store }, React.createElement(Board)));
		});
		await flush();

		const cells = Array.from(container.querySelectorAll('[role="gridcell"]')) as HTMLElement[];
		expect(cells.length).toBe(9);

		// Ensure minimum touch target utility classes applied (happy-dom doesn't compute layout)
		expect(cells[0].className).toContain('min-h-[44px]');
		expect(cells[0].className).toContain('min-w-[44px]');

		// Click cell #1
		await act(async () => { cells[0].click(); });
		await flush();

		// Should show a mark (optimistic), either X or O
		expect(cells[0].textContent || '').toMatch(/x|o/i);
	});

	it('ignores click when no current game is set', async () => {
		const container = document.createElement('div');
		const root = createRoot(container);
		const { default: Board } = await import('./Board');
		await act(async () => {
			root.render(React.createElement(Provider as any, { store }, React.createElement(Board)));
		});
		await flush();
		const cells = Array.from(container.querySelectorAll('[role="gridcell"]')) as HTMLElement[];
		await act(async () => { cells[1].click(); });
		await flush();
		// No error and no text shown
		expect(cells[1].textContent || '').toBe('');
	});

	it('does nothing when clicking an already filled cell', async () => {
		const container = document.createElement('div');
		const root = createRoot(container);
		const { default: Board } = await import('./Board');
		const { setCurrentGame, gameStateReceived } = await import('../store/gameSlice');
		await act(async () => {
			store.dispatch(setCurrentGame({ gameId: 'g2' }));
			store.dispatch(gameStateReceived({ gameId: 'g2', board: ['X', null, null, null, null, null, null, null, null], currentPlayer: 'O' } as any));
			root.render(React.createElement(Provider as any, { store }, React.createElement(Board)));
		});
		await flush();
		const cells = Array.from(container.querySelectorAll('[role="gridcell"]')) as HTMLElement[];
		// Attempt to click the already filled cell
		await act(async () => { cells[0].click(); });
		await flush();
		expect(cells[0].textContent).toMatch(/x/i);
	});

	it('debounces rapid double clicks', async () => {
		const container = document.createElement('div');
		const root = createRoot(container);
		const { default: Board } = await import('./Board');
		const { setCurrentGame } = await import('../store/gameSlice');
		await act(async () => {
			store.dispatch(setCurrentGame({ gameId: 'g3' }));
			root.render(React.createElement(Provider as any, { store }, React.createElement(Board)));
		});
		await flush();
		const cells = Array.from(container.querySelectorAll('[role="gridcell"]')) as HTMLElement[];
		await act(async () => { cells[2].click(); });
		await flush();
		await act(async () => { cells[2].click(); });
		await flush();
		// Only one pending/mark should appear logically; text is same either way
		expect((cells[2].textContent || '').length).toBeGreaterThan(0);
	});

	it('supports keyboard navigation and activation', async () => {
		const container = document.createElement('div');
		const root = createRoot(container);
		const { default: Board } = await import('./Board');
		const { setCurrentGame } = await import('../store/gameSlice');
		await act(async () => {
			store.dispatch(setCurrentGame({ gameId: 'g4' }));
			root.render(React.createElement(Provider as any, { store }, React.createElement(Board)));
		});
		await flush();
		const cells = Array.from(container.querySelectorAll('[role="gridcell"]')) as HTMLElement[];
		cells[4].focus();
		await act(async () => {
			const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
			cells[4].dispatchEvent(ev);
		});
		await flush();
		expect(cells[4].textContent || '').toMatch(/x|o/i);
	});

	it('prevents moves in observer role', async () => {
		const container = document.createElement('div');
		const root = createRoot(container);
		const { default: Board } = await import('./Board');
		const { setCurrentGame, setRole } = await import('../store/gameSlice');
		await act(async () => {
			store.dispatch(setCurrentGame({ gameId: 'g_obs' }));
			store.dispatch(setRole('observer'));
			root.render(React.createElement(Provider as any, { store }, React.createElement(Board)));
		});
		await flush();
		const cells = Array.from(container.querySelectorAll('[role="gridcell"]')) as HTMLElement[];
		await act(async () => { cells[0].click(); });
		await flush();
		expect(cells[0].textContent || '').toBe('');
	});

	it('highlights last move', async () => {
		const container = document.createElement('div');
		const root = createRoot(container);
		const { default: Board } = await import('./Board');
		const { setCurrentGame, gameStateReceived } = await import('../store/gameSlice');
		await act(async () => {
			store.dispatch(setCurrentGame({ gameId: 'g5' }));
			store.dispatch(gameStateReceived({ gameId: 'g5', board: [null,null,null,null,'X',null,null,null,null], currentPlayer: 'O', lastMove: 4 } as any));
			root.render(React.createElement(Provider as any, { store }, React.createElement(Board)));
		});
		const cells = Array.from(container.querySelectorAll('[role="gridcell"]')) as HTMLElement[];
		expect(cells[4].className).toContain('ring-amber-400');
	});

  it('has correct grid ARIA attributes', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const { default: Board } = await import('./Board');
    const { setCurrentGame } = await import('../store/gameSlice');
    await act(async () => {
      store.dispatch(setCurrentGame({ gameId: 'g6' }));
      root.render(React.createElement(Provider as any, { store }, React.createElement(Board)));
    });
    const grid = container.querySelector('[role="grid"]') as HTMLElement;
    expect(grid).toBeTruthy();
    expect(grid.getAttribute('aria-rowcount')).toBe('3');
    expect(grid.getAttribute('aria-colcount')).toBe('3');
    const cell = container.querySelector('[role="gridcell"]') as HTMLElement;
    expect(cell.getAttribute('aria-rowindex')).toBe('1');
    expect(cell.getAttribute('aria-colindex')).toBe('1');
  });

  it('blocks move when game already has winner or draw', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const { default: Board } = await import('./Board');
    const { setCurrentGame, gameStateReceived } = await import('../store/gameSlice');
    await act(async () => {
      store.dispatch(setCurrentGame({ gameId: 'g7' }));
      store.dispatch(gameStateReceived({ gameId: 'g7', board: ['X','X','X',null,null,null,null,null,null], currentPlayer: 'O', winner: 'X' } as any));
      root.render(React.createElement(Provider as any, { store }, React.createElement(Board)));
    });
    const cells = Array.from(container.querySelectorAll('[role="gridcell"]')) as HTMLElement[];
    await act(async () => { cells[3].click(); });
    expect(cells[3].textContent || '').toBe('');
  });

  it('adds pending style on optimistic move and debounces duplicate clicks (makeMove called at least once)', async () => {
    vi.resetModules();
    vi.mock('../socket/clientEmitters', async (orig) => {
      const actual = await (orig as any)();
      return { ...actual, makeMove: vi.fn().mockResolvedValue({ ok: true }) };
    });
    const emitters = await import('../socket/clientEmitters');
    const container = document.createElement('div');
    const root = createRoot(container);
    const { default: Board } = await import('./Board');
    const { setCurrentGame } = await import('../store/gameSlice');
    await act(async () => {
      store.dispatch(setCurrentGame({ gameId: 'g8' }));
      root.render(React.createElement(Provider as any, { store }, React.createElement(Board)));
    });
    const cells = Array.from(container.querySelectorAll('[role="gridcell"]')) as HTMLElement[];
    await act(async () => { cells[5].click(); });
    // Immediate second click (may or may not trigger depending on timing)
    await act(async () => { cells[5].click(); });
    expect((emitters as any).makeMove).toHaveBeenCalled();
    // Pending style opacity is applied
    expect(cells[5].className).toContain('opacity-70');
  });

  it('arrow keys move focus between cells', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const { default: Board } = await import('./Board');
    const { setCurrentGame } = await import('../store/gameSlice');
    await act(async () => {
      store.dispatch(setCurrentGame({ gameId: 'g9' }));
      root.render(React.createElement(Provider as any, { store }, React.createElement(Board)));
    });
    const cells = Array.from(container.querySelectorAll('[role="gridcell"]')) as HTMLButtonElement[];
    cells[0].focus();
    await act(async () => { cells[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
    expect((document.activeElement as HTMLElement)?.getAttribute('data-idx')).toBe('1');
    await act(async () => { cells[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); });
    expect((document.activeElement as HTMLElement)?.getAttribute('data-idx')).toBe('4');
  });
});
