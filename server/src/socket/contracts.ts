// © 2025 Joe Pruskowski
import { z } from 'zod';

// Common types
export const PlayerSchema = z.enum(['X', 'O']);
export type Player = z.infer<typeof PlayerSchema>;

export const BoardCellSchema = z.union([z.literal('X'), z.literal('O'), z.null()]);
export const BoardSchema = z.array(BoardCellSchema).length(9);
export type Board = z.infer<typeof BoardSchema>;

// Event: create_game (client -> server)
// request: { strategy?: 'random' | 'ai' }
// ack: { ok: true, gameId: string, player: Player } | { ok: false, error: string }
export const StrategySchema = z.enum(['random', 'ai']);
export const CreateGameRequestSchema = z.object({ strategy: StrategySchema.optional() });
export type CreateGameRequest = z.infer<typeof CreateGameRequestSchema>;

export const OkCreateGameAckSchema = z.object({ ok: z.literal(true), gameId: z.string().min(1), player: PlayerSchema });
export const ErrAckSchema = z.object({ ok: z.literal(false), error: z.string().min(1) });
export const CreateGameAckSchema = z.union([OkCreateGameAckSchema, ErrAckSchema]);
export type CreateGameAck = z.infer<typeof CreateGameAckSchema>;

// Event: join_game (client -> server)
// request: { gameId: string }
// ack: { ok: true, role: 'player' | 'observer', player?: Player } | { ok: false, error: string }
export const JoinGameRequestSchema = z.object({ gameId: z.string().min(1) });
export type JoinGameRequest = z.infer<typeof JoinGameRequestSchema>;
export const RoleSchema = z.enum(['player', 'observer']);
export const OkJoinGameAckSchema = z.object({ ok: z.literal(true), role: RoleSchema, player: PlayerSchema.optional() });
export const JoinGameAckSchema = z.union([OkJoinGameAckSchema, ErrAckSchema]);
export type JoinGameAck = z.infer<typeof JoinGameAckSchema>;

// Event: leave_game (client -> server)
// request: { gameId: string }
// ack: { ok: true } | { ok: false, error: string }
export const LeaveGameRequestSchema = z.object({ gameId: z.string().min(1) });
export type LeaveGameRequest = z.infer<typeof LeaveGameRequestSchema>;
export const OkLeaveGameAckSchema = z.object({ ok: z.literal(true) });
export const LeaveGameAckSchema = z.union([OkLeaveGameAckSchema, ErrAckSchema]);
export type LeaveGameAck = z.infer<typeof LeaveGameAckSchema>;

// Event: make_move (client -> server)
// request: { gameId: string, position: number, player: Player, nonce: string }
// ack: { ok: true } | { ok: false, error: string }
export const MakeMoveRequestSchema = z.object({
  gameId: z.string().min(1),
  position: z.number().int().min(0).max(8),
  player: PlayerSchema,
  nonce: z.string().min(1),
});
export type MakeMoveRequest = z.infer<typeof MakeMoveRequestSchema>;
export const OkMakeMoveAckSchema = z.object({ ok: z.literal(true) });
export const MakeMoveAckSchema = z.union([OkMakeMoveAckSchema, ErrAckSchema]);
export type MakeMoveAck = z.infer<typeof MakeMoveAckSchema>;

// Event: game_state (server -> client)
// payload: { gameId: string, board: Board, currentPlayer: Player, lastMove?: number, winner?: Player, draw?: boolean }
export const GameStatePayloadSchema = z.object({
  gameId: z.string().min(1),
  board: BoardSchema,
  currentPlayer: PlayerSchema,
  lastMove: z.number().int().min(0).max(8).optional(),
  winner: PlayerSchema.optional(),
  draw: z.boolean().optional(),
});
export type GameStatePayload = z.infer<typeof GameStatePayloadSchema>;

// Event: error (server -> client)
// payload: { code: string, message: string }
export const ErrorPayloadSchema = z.object({ code: z.string().min(1), message: z.string().min(1) });
export type ErrorPayload = z.infer<typeof ErrorPayloadSchema>;

// Unified map of event names for type-safety
export const EventNames = {
  create_game: 'create_game',
  join_game: 'join_game',
  leave_game: 'leave_game',
  make_move: 'make_move',
  game_state: 'game_state',
  error: 'error',
} as const;
export type ClientToServerEvent = keyof Pick<typeof EventNames, 'create_game' | 'join_game' | 'leave_game' | 'make_move'>;
export type ServerToClientEvent = keyof Pick<typeof EventNames, 'game_state' | 'error'>;


