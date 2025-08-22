// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import { pickRandomMove } from './random';

describe('pickRandomMove', () => {
  it('returns -1 when no legal moves', () => {
    const board = ['X','O','X','O','X','O','X','O','X'] as any;
    expect(pickRandomMove(board, 'X')).toBe(-1);
  });

  it('returns a legal move index using provided rng', () => {
    const board = [null, 'O', null, 'O', 'X', null, null, null, 'X'] as any;
    const moves = [0,2,5,6,7];
    const rng = () => 0.6; // 0..1 -> index 3 after floor(0.6 * 5) = 3 -> moves[3]=6
    const picked = pickRandomMove(board, 'O', rng);
    expect(moves).toContain(picked);
    expect(picked).toBe(6);
  });
});


