// © 2025 Joe Pruskowski
import { z } from 'zod';

// Reuse board and player representations compatible with game/socket contracts
export const AIPlayerSchema = z.enum(['X', 'O']);
export type AIPlayer = z.infer<typeof AIPlayerSchema>;

export const AIBoardCellSchema = z.union([z.literal('X'), z.literal('O'), z.null()]);
export const AIBoardSchema = z.array(AIBoardCellSchema).length(9);
export type AIBoard = z.infer<typeof AIBoardSchema>;

// Request sent to an AI strategy implementation
export const AIRequestSchema = z.object({
  gameId: z.string().min(1).optional(),
  board: AIBoardSchema,
  currentPlayer: AIPlayerSchema,
});
export type AIRequest = z.infer<typeof AIRequestSchema>;

// Response from AI containing chosen move index [0..8]
export const AIResponseSchema = z.object({ position: z.number().int().min(0).max(8) });
export type AIResponse = z.infer<typeof AIResponseSchema>;


