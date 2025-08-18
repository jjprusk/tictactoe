// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import { createEmptyBoard } from './state';
import { getLegalMoves } from './rules';

describe('game/rules#getLegalMoves', () => {
  it('returns all positions for an empty board', () => {
    const b = createEmptyBoard();
    const moves = getLegalMoves(b);
    expect(moves).toEqual([0,1,2,3,4,5,6,7,8]);
  });

  it('excludes occupied cells', () => {
    const b = createEmptyBoard().slice();
    (b as any)[0] = 'X';
    (b as any)[4] = 'O';
    const moves = getLegalMoves(b as any);
    expect(moves).toEqual([1,2,3,5,6,7,8]);
  });

  it('handles unexpected board length defensively', () => {
    const weird = [null, 'X', null];
    const moves = getLegalMoves(weird as any);
    expect(moves).toEqual([0,2]);
  });
});


