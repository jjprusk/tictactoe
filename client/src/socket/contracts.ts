// © 2025 Joe Pruskowski
import { z } from 'zod';

export const PlayerSchema = z.enum(['X', 'O']);
export type Player = z.infer<typeof PlayerSchema>;

export const BoardCellSchema = z.union([z.literal('X'), z.literal('O'), z.null()]);
export const BoardSchema = z.array(BoardCellSchema).length(9);
export type Board = z.infer<typeof BoardSchema>;

export const StrategySchema = z.enum(['random', 'ai']);
export const CreateGameRequestSchema = z.object({ strategy: StrategySchema.optional() });
export type CreateGameRequest = z.infer<typeof CreateGameRequestSchema>;
export const CreateGameAckSchema = z.union([
  z.object({ ok: z.literal(true), gameId: z.string().min(1), player: PlayerSchema }),
  z.object({ ok: z.literal(false), error: z.string().min(1) }),
]);
export type CreateGameAck = z.infer<typeof CreateGameAckSchema>;

export const JoinGameRequestSchema = z.object({ gameId: z.string().min(1) });
export type JoinGameRequest = z.infer<typeof JoinGameRequestSchema>;
export const JoinGameAckSchema = z.union([
  z.object({ ok: z.literal(true), role: z.enum(['player', 'observer']), player: PlayerSchema.optional() }),
  z.object({ ok: z.literal(false), error: z.string().min(1) }),
]);
export type JoinGameAck = z.infer<typeof JoinGameAckSchema>;

export const LeaveGameRequestSchema = z.object({ gameId: z.string().min(1) });
export type LeaveGameRequest = z.infer<typeof LeaveGameRequestSchema>;
export const LeaveGameAckSchema = z.union([
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: z.string().min(1) }),
]);
export type LeaveGameAck = z.infer<typeof LeaveGameAckSchema>;

export const MakeMoveRequestSchema = z.object({
  gameId: z.string().min(1),
  position: z.number().int().min(0).max(8),
  player: PlayerSchema,
  nonce: z.string().min(1),
});
export type MakeMoveRequest = z.infer<typeof MakeMoveRequestSchema>;
export const MakeMoveAckSchema = z.union([
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: z.string().min(1) }),
]);
export type MakeMoveAck = z.infer<typeof MakeMoveAckSchema>;

// Server -> Client events
export const GameStatePayloadSchema = z.object({
  gameId: z.string().min(1),
  board: BoardSchema,
  currentPlayer: PlayerSchema,
  lastMove: z.number().int().min(0).max(8).optional(),
  winner: PlayerSchema.optional(),
  draw: z.boolean().optional(),
});
export type GameStatePayload = z.infer<typeof GameStatePayloadSchema>;

export const ErrorPayloadSchema = z.object({ code: z.string().min(1), message: z.string().min(1) });
export type ErrorPayload = z.infer<typeof ErrorPayloadSchema>;

// Public list_games
export const ListGamesRequestSchema = z.object({});
export type ListGamesRequest = z.infer<typeof ListGamesRequestSchema>;
export const ListGamesAckSchema = z.union([
  z.object({ ok: z.literal(true), games: z.array(z.string()) }),
  z.object({ ok: z.literal(false), error: z.string().min(1) }),
]);
export type ListGamesAck = z.infer<typeof ListGamesAckSchema>;


