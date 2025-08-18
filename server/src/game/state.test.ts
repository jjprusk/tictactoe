// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import { BOARD_CELLS } from './types';
import { createEmptyBoard, createInitialState } from './state';

describe('game/state', () => {
  it('createEmptyBoard returns a 9-cell null array', () => {
    const b = createEmptyBoard();
    expect(Array.isArray(b)).toBe(true);
    expect(b.length).toBe(BOARD_CELLS);
    expect(b.every((c) => c === null)).toBe(true);
  });

  it('createInitialState sets first player and empty history', () => {
    const s = createInitialState('O');
    expect(s.currentPlayer).toBe('O');
    expect(s.moves).toEqual([]);
    expect(s.board.length).toBe(BOARD_CELLS);
  });
});


