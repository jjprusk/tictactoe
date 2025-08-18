// © 2025 Joe Pruskowski
import { Board, BOARD_CELLS, Player, Cell } from './types';

/**
 * Returns the zero-based indices of empty cells on the board (legal moves).
 */
export function getLegalMoves(board: Board): number[] {
  const moves: number[] = [];
  // Guard against unexpected board sizes to keep downstream predictable
  const length = board.length;
  const max = length === BOARD_CELLS ? BOARD_CELLS : length;
  for (let position = 0; position < max; position += 1) {
    if (board[position] === null) {
      moves.push(position);
    }
  }
  return moves;
}

/**
 * Returns a new board with the given move applied for the player.
 * Throws on out-of-bounds or when the target cell is occupied.
 */
export function applyMove(board: Board, move: number, player: Player): Board {
  if (!Number.isInteger(move) || move < 0 || move >= board.length) {
    throw new Error('invalid-move: out-of-bounds');
  }
  if (board[move] !== null) {
    throw new Error('invalid-move: occupied');
  }
  const next = board.slice() as Cell[];
  next[move] = player;
  return next as ReadonlyArray<Cell>;
}

/**
 * Alternates turns between 'X' and 'O'.
 */
export function nextPlayer(current: Player): Player {
  return current === 'X' ? 'O' : 'X';
}

/**
 * Checks for a winner on the board across rows, columns, and diagonals.
 * Returns the winning Player or null if no winner.
 */
export function checkWin(board: Board): Player | null {
  const lines: [number, number, number][] = [
    // rows
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    // cols
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    // diags
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    const v = board[a];
    if (v !== null && v === board[b] && v === board[c]) {
      return v;
    }
  }
  return null;
}


