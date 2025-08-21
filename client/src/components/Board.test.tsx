// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '../store';
import { resetGameState } from '../store/gameSlice';

describe('Board', () => {
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

		const cells = Array.from(container.querySelectorAll('[role="gridcell"]')) as HTMLElement[];
		expect(cells.length).toBe(9);

		// Click cell #1
		await act(async () => {
			cells[0].click();
		});

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
		const cells = Array.from(container.querySelectorAll('[role="gridcell"]')) as HTMLElement[];
		await act(async () => {
			cells[1].click();
		});
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
		const cells = Array.from(container.querySelectorAll('[role="gridcell"]')) as HTMLElement[];
		// Attempt to click the already filled cell
		await act(async () => {
			cells[0].click();
		});
		expect(cells[0].textContent).toMatch(/x/i);
	});
});
