// © 2025 Joe Pruskowski

/**
 * TicTacToe board cell content.
 * For S059, keep this independent of the Player type (to be introduced in S060).
 */
export type Cell = 'X' | 'O' | null;

/**
 * A 3x3 TicTacToe board represented as a flat array in row-major order.
 * Expected length is 9 (3 x 3). Future steps will add construction and validation utilities.
 */
export type Board = ReadonlyArray<Cell>;

/** Board dimension (3x3). */
export const BOARD_DIMENSION = 3 as const;

/** Total number of cells on the board. */
export const BOARD_CELLS = BOARD_DIMENSION * BOARD_DIMENSION;
 
/** Players who can make moves. */
export type Player = 'X' | 'O';

/** Constant list of valid players. */
export const PLAYERS = ['X', 'O'] as const;

/** Runtime type guard for Player. */
export function isPlayer(value: unknown): value is Player {
  return value === 'X' || value === 'O';
}


