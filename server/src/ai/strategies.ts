// © 2025 Joe Pruskowski
import type { Board, Player } from '../game/types';
import { pickRandomMove } from './random';

export function ai0Random(board: Board, player: Player): number {
  return pickRandomMove(board, player);
}

export function ai1Average(board: Board, player: Player): number {
  // For now, use ai0 behavior. Future: implement average-level heuristic.
  return ai0Random(board, player);
}

export function ai2Smart(board: Board, player: Player): number {
  // For now, use ai0 behavior. Future: implement smarter heuristic.
  return ai0Random(board, player);
}

export function ai3Genius(board: Board, player: Player): number {
  // For now, use ai0 behavior. Future: implement strongest search.
  return ai0Random(board, player);
}


