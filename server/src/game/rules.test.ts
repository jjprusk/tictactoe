// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import { createEmptyBoard } from './state';
import { getLegalMoves, applyMove } from './rules';

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

describe('game/rules#applyMove', () => {
  it('applies move immutably', () => {
    const b = createEmptyBoard();
    const next = applyMove(b, 4, 'X');
    expect(next).not.toBe(b);
    expect(next[4]).toBe('X');
    expect(b[4]).toBe(null);
  });

  it('throws on occupied cell', () => {
    const b = createEmptyBoard().slice();
    (b as any)[0] = 'O';
    expect(() => applyMove(b as any, 0, 'X')).toThrowError(/occupied/);
  });

  it('throws on out-of-bounds', () => {
    const b = createEmptyBoard();
    expect(() => applyMove(b, -1, 'X')).toThrowError(/out-of-bounds/);
    expect(() => applyMove(b, 9, 'X')).toThrowError(/out-of-bounds/);
  });
});


