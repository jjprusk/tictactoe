// © 2025 Joe Pruskowski
import { getLegalMoves } from '../game/rules';
import type { Board, Player } from '../game/types';

export type RandomFn = () => number; // [0, 1)

/**
 * Pick a random legal move using the provided RNG (Math.random by default).
 * Returns -1 when there are no legal moves.
 */
export function pickRandomMove(board: Board, _player: Player, rng?: RandomFn): number {
  const legal = getLegalMoves(board);
  if (legal.length === 0) return -1;
  const r = (rng ?? Math.random)();
  const idx = Math.floor(r * legal.length);
  return legal[Math.max(0, Math.min(idx, legal.length - 1))];
}


