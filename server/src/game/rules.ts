// © 2025 Joe Pruskowski
import { Board, BOARD_CELLS } from './types';

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


