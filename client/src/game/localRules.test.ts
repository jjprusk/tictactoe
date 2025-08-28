// © 2025 Joe Pruskowski
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  type LocalBoard,
  getLegalMoves,
  applyMove,
  nextPlayer,
  checkWin,
  checkDraw,
  pickRandomMove,
} from './localRules';

const empty = (): LocalBoard => Array.from({ length: 9 }, () => null);

describe('localRules', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getLegalMoves returns all indices for empty board', () => {
    const m = getLegalMoves(empty());
    expect(m).toEqual([0,1,2,3,4,5,6,7,8]);
  });

  it('getLegalMoves excludes occupied cells', () => {
    const b = empty();
    b[0] = 'X';
    b[4] = 'O';
    const m = getLegalMoves(b);
    expect(m).toEqual([1,2,3,5,6,7,8]);
  });

  it('applyMove is immutable and sets position', () => {
    const b = empty();
    const next = applyMove(b, 3, 'X');
    expect(next).not.toBe(b);
    expect(next[3]).toBe('X');
    // original board unchanged
    expect(b[3]).toBeNull();
  });

  it('applyMove no-ops when position already occupied', () => {
    const b = empty();
    b[2] = 'O';
    const next = applyMove(b, 2, 'X');
    expect(next).toEqual(b);
  });

  it('nextPlayer toggles between X and O', () => {
    expect(nextPlayer('X')).toBe('O');
    expect(nextPlayer('O')).toBe('X');
  });

  it('checkWin detects all row wins', () => {
    for (const row of [0, 3, 6] as const) {
      const b = empty();
      b[row] = 'X';
      b[row + 1] = 'X';
      b[row + 2] = 'X';
      expect(checkWin(b)).toBe('X');
    }
  });

  it('checkWin detects all column wins', () => {
    for (const col of [0, 1, 2] as const) {
      const b = empty();
      b[col] = 'O';
      b[col + 3] = 'O';
      b[col + 6] = 'O';
      expect(checkWin(b)).toBe('O');
    }
  });

  it('checkWin detects diagonal wins', () => {
    const b1 = empty();
    b1[0] = b1[4] = b1[8] = 'X';
    expect(checkWin(b1)).toBe('X');

    const b2 = empty();
    b2[2] = b2[4] = b2[6] = 'O';
    expect(checkWin(b2)).toBe('O');
  });

  it('checkDraw true when board full and no winner', () => {
    const b: LocalBoard = [
      'X','O','X',
      'X','O','O',
      'O','X','X',
    ];
    expect(checkWin(b)).toBeNull();
    expect(checkDraw(b)).toBe(true);
  });

  it('checkDraw false when spaces remain or winner exists', () => {
    const b = empty();
    expect(checkDraw(b)).toBe(false);
    const w: LocalBoard = [
      'X','X','X',
      null,null,null,
      null,null,null,
    ];
    expect(checkDraw(w)).toBe(false);
  });

  it('pickRandomMove returns -1 when no moves available', () => {
    const full: LocalBoard = [
      'X','O','X',
      'X','O','O',
      'O','X','X',
    ];
    expect(pickRandomMove(full)).toBe(-1);
  });

  it('pickRandomMove picks a legal move (controlled random)', () => {
    const b = empty();
    b[0] = 'X'; b[8] = 'O'; // legal moves: 1..7
    // Force Math.random to 0.5 -> index middle of list
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const pos = pickRandomMove(b);
    expect(getLegalMoves(b)).toContain(pos);
    expect(typeof pos).toBe('number');
    spy.mockRestore();
  });
});


