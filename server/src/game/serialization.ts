// © 2025 Joe Pruskowski
import { z } from 'zod';
import { BOARD_CELLS, Board, Cell, GameState, Player } from './types';

export type SerializedCell = Cell;
export type SerializedBoard = SerializedCell[];
export interface SerializedGameState {
  board: SerializedBoard;
  currentPlayer: Player;
  moves: number[];
}

const cellSchema = z.union([z.literal('X'), z.literal('O'), z.null()]);
const boardSchema = z.array(cellSchema).length(BOARD_CELLS);
const gameStateSchema = z.object({
  board: boardSchema,
  currentPlayer: z.union([z.literal('X'), z.literal('O')]),
  moves: z.array(z.number().int().min(0).max(BOARD_CELLS - 1)),
});

export function serializeGameState(state: GameState): SerializedGameState {
  // Ensure a plain mutable array for JSON without Readonly markers
  const board: SerializedBoard = Array.from(state.board);
  return {
    board,
    currentPlayer: state.currentPlayer,
    moves: [...state.moves],
  };
}

export function deserializeGameState(input: unknown): GameState {
  const parsed = gameStateSchema.parse(input);
  // Convert to types used internally
  const board = parsed.board.slice() as ReadonlyArray<Cell> as Board;
  return {
    board,
    currentPlayer: parsed.currentPlayer,
    moves: parsed.moves.slice(),
  };
}


