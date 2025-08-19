// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getLegalMoves, applyMove, checkWin, checkDraw, isTerminal, nextPlayer } from './rules';

const cellArb = fc.constantFrom<'X' | 'O' | null>('X', 'O', null);
const boardArb = fc.array(cellArb, { minLength: 9, maxLength: 9 });
const playerArb = fc.constantFrom<'X' | 'O'>('X', 'O');

describe('property-based: engine invariants', () => {
  it('getLegalMoves matches indices of null cells', () => {
    fc.assert(
      fc.property(boardArb, (board) => {
        const expected = board.map((v, i) => (v === null ? i : -1)).filter((i) => i !== -1);
        const actual = getLegalMoves(board as any);
        expect(actual).toEqual(expected);
      })
    );
  });

  it('applyMove sets only the chosen cell and updates legal moves accordingly', () => {
    fc.assert(
      fc.property(
        boardArb.filter((b) => b.some((c) => c === null)),
        playerArb,
        (board, player) => {
          const legal = getLegalMoves(board as any);
          // pick one legal move uniformly
          return fc.sample(fc.constantFrom(...legal), 1).every((move) => {
            const next = applyMove(board as any, move, player);
            // immutability: original unchanged
            expect(board[move]).toBe(null);
            // only the targeted cell changes
            for (let i = 0; i < 9; i += 1) {
              if (i === move) expect(next[i]).toBe(player);
              else expect(next[i]).toBe(board[i]);
            }
            // legal moves drop exactly the played move
            const nextLegal = getLegalMoves(next as any);
            const expected = legal.filter((m) => m !== move);
            expect(nextLegal).toEqual(expected);
            return true;
          });
        }
      )
    );
  });

  it('winning boards are terminal and not draws', () => {
    fc.assert(
      fc.property(boardArb, (board) => {
        const winner = checkWin(board as any);
        if (winner !== null) {
          expect(isTerminal(board as any)).toBe(true);
          expect(checkDraw(board as any)).toBe(false);
        }
      })
    );
  });

  it('full boards without winner are draws and terminal', () => {
    fc.assert(
      fc.property(
        boardArb.filter((b) => b.every((c) => c !== null)),
        (board) => {
          const winner = checkWin(board as any);
          if (winner === null) {
            expect(checkDraw(board as any)).toBe(true);
            expect(isTerminal(board as any)).toBe(true);
          }
        }
      )
    );
  });

  it('nextPlayer is an involution: next(next(p)) = p and toggles', () => {
    fc.assert(
      fc.property(playerArb, (p) => {
        const n = nextPlayer(p);
        expect(n).not.toBe(p);
        expect(nextPlayer(n)).toBe(p);
      })
    );
  });
});


