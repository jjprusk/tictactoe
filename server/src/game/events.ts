// © 2025 Joe Pruskowski
import { z } from 'zod';
import { BOARD_CELLS, Board, Player } from './types';

export interface MoveMadeEvent {
  type: 'MoveMade';
  move: number; // 0..8
  player: Player;
  board: Board;
}

export interface GameOverEvent {
  type: 'GameOver';
  winner: Player | 'draw';
  finalBoard: Board;
}

export type GameEvent = MoveMadeEvent | GameOverEvent;

// Runtime schemas (to be used when wiring sockets in later steps)
const cellSchema = z.union([z.literal('X'), z.literal('O'), z.null()]);
const boardSchema = z.array(cellSchema).length(BOARD_CELLS);

export const moveMadeEventSchema = z.object({
  type: z.literal('MoveMade'),
  move: z.number().int().min(0).max(BOARD_CELLS - 1),
  player: z.union([z.literal('X'), z.literal('O')]),
  board: boardSchema,
});

export const gameOverEventSchema = z.object({
  type: z.literal('GameOver'),
  winner: z.union([z.literal('X'), z.literal('O'), z.literal('draw')]),
  finalBoard: boardSchema,
});

export const gameEventSchema = z.union([moveMadeEventSchema, gameOverEventSchema]);

export function parseGameEvent(input: unknown): GameEvent {
  const parsed = gameEventSchema.parse(input);
  // Cast to our TS types (shapes are validated already)
  return parsed as unknown as GameEvent;
}


