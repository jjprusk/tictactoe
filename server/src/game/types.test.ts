// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import { BOARD_CELLS, BOARD_DIMENSION, PLAYERS, isPlayer } from './types';

describe('game/types', () => {
  it('exposes correct board constants', () => {
    expect(BOARD_DIMENSION).toBe(3);
    expect(BOARD_CELLS).toBe(9);
  });

  it('PLAYERS contains X and O in order', () => {
    expect(Array.isArray(PLAYERS)).toBe(true);
    expect(PLAYERS.length).toBe(2);
    expect(PLAYERS[0]).toBe('X');
    expect(PLAYERS[1]).toBe('O');
  });

  it('isPlayer validates only X or O', () => {
    expect(isPlayer('X')).toBe(true);
    expect(isPlayer('O')).toBe(true);
    expect(isPlayer('x')).toBe(false);
    expect(isPlayer('o')).toBe(false);
    expect(isPlayer('')).toBe(false);
    expect(isPlayer(null)).toBe(false);
    expect(isPlayer(undefined)).toBe(false);
    expect(isPlayer(0 as unknown)).toBe(false);
  });
});


