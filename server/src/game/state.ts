// © 2025 Joe Pruskowski
import { Board, BOARD_CELLS, Cell, GameState, Player } from './types';

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_CELLS }, () => null) as ReadonlyArray<Cell>;
}

export function createInitialState(firstPlayer: Player = 'X'): GameState {
  return {
    board: createEmptyBoard(),
    currentPlayer: firstPlayer,
    moves: [],
  };
}


