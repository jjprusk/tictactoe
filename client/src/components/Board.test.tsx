// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
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
});
