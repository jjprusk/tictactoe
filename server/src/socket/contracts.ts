// © 2025 Joe Pruskowski
import { z } from 'zod';

// Common types
export const PlayerSchema = z.enum(['X', 'O']);
export type Player = z.infer<typeof PlayerSchema>;

export const BoardCellSchema = z.union([z.literal('X'), z.literal('O'), z.null()]);
export const BoardSchema = z.array(BoardCellSchema).length(9);
export type Board = z.infer<typeof BoardSchema>;

// Event: create_game (client -> server)
// request: { strategy?: 'ai0' | 'ai1' | 'ai2' | 'ai3' | 'random' | 'ai' }
// ack: { ok: true, gameId: string, player: Player } | { ok: false, error: string }
// Accept legacy aliases 'random' and 'ai' for V1 clients; these normalize to ai0/ai1 in orchestrator
export const StrategySchema = z.enum(['ai0', 'ai1', 'ai2', 'ai3', 'random', 'ai']);
export const StartModeSchema = z.enum(['ai', 'human', 'alternate']);
export const CreateGameRequestSchema = z.object({ strategy: StrategySchema.optional(), aiStarts: z.boolean().optional(), startMode: StartModeSchema.optional() });
export type CreateGameRequest = z.infer<typeof CreateGameRequestSchema>;

export const OkCreateGameAckSchema = z.object({ ok: z.literal(true), gameId: z.string().min(1), player: PlayerSchema, currentPlayer: PlayerSchema, sessionToken: z.string().min(1).optional() });
export const ErrAckSchema = z.object({ ok: z.literal(false), error: z.string().min(1) });
export const CreateGameAckSchema = z.union([OkCreateGameAckSchema, ErrAckSchema]);
export type CreateGameAck = z.infer<typeof CreateGameAckSchema>;

// Event: join_game (client -> server)
// request: { gameId: string }
// ack: { ok: true, role: 'player' | 'observer', player?: Player } | { ok: false, error: string }
export const JoinGameRequestSchema = z.object({ gameId: z.string().min(1), sessionToken: z.string().min(1).optional(), asObserver: z.coerce.boolean().optional() });
export type JoinGameRequest = z.infer<typeof JoinGameRequestSchema>;
export const RoleSchema = z.enum(['player', 'observer', 'admin']);
export const OkJoinGameAckSchema = z.object({ ok: z.literal(true), role: RoleSchema, player: PlayerSchema.optional(), sessionToken: z.string().min(1).optional() });
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

// Event: reset_game (client -> server)
// request: { gameId: string }
// ack: { ok: true } | { ok: false, error: string }
export const ResetGameRequestSchema = z.object({ gameId: z.string().min(1) });
export type ResetGameRequest = z.infer<typeof ResetGameRequestSchema>;
export const ResetGameAckSchema = z.union([OkLeaveGameAckSchema, ErrAckSchema]);
export type ResetGameAck = z.infer<typeof ResetGameAckSchema>;

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
  elevate_admin: 'elevate_admin',
  admin_list_games: 'admin:list_games',
  admin_close_game: 'admin:close_game',
  admin_room_info: 'admin:room_info',
  list_games: 'list_games',
  reset_game: 'reset_game',
} as const;
export type ClientToServerEvent = keyof Pick<typeof EventNames, 'create_game' | 'join_game' | 'leave_game' | 'make_move' | 'elevate_admin' | 'admin_list_games' | 'admin_close_game' | 'admin_room_info' | 'list_games' | 'reset_game'>;
export type ServerToClientEvent = keyof Pick<typeof EventNames, 'game_state' | 'error'>;

// Admin events and schemas
export const ElevateAdminRequestSchema = z.object({ adminKey: z.string().min(1) });
export type ElevateAdminRequest = z.infer<typeof ElevateAdminRequestSchema>;
export const OkElevateAdminAckSchema = z.object({ ok: z.literal(true), role: z.literal('admin') });
export const ElevateAdminAckSchema = z.union([OkElevateAdminAckSchema, ErrAckSchema]);
export type ElevateAdminAck = z.infer<typeof ElevateAdminAckSchema>;

export const AdminListGamesRequestSchema = z.object({});
export type AdminListGamesRequest = z.infer<typeof AdminListGamesRequestSchema>;
export const OkAdminListGamesAckSchema = z.object({ ok: z.literal(true), games: z.array(z.string()) });
export const AdminListGamesAckSchema = z.union([OkAdminListGamesAckSchema, ErrAckSchema]);
export type AdminListGamesAck = z.infer<typeof AdminListGamesAckSchema>;

export const AdminCloseGameRequestSchema = z.object({ gameId: z.string().min(1) });
export type AdminCloseGameRequest = z.infer<typeof AdminCloseGameRequestSchema>;
export const AdminCloseGameAckSchema = z.union([OkLeaveGameAckSchema, ErrAckSchema]);
export type AdminCloseGameAck = z.infer<typeof AdminCloseGameAckSchema>;

// Admin: room info
export const AdminRoomInfoRequestSchema = z.object({ gameId: z.string().min(1) });
export type AdminRoomInfoRequest = z.infer<typeof AdminRoomInfoRequestSchema>;
export const AdminRoomPlayerSchema = z.object({ socketId: z.string().min(1), player: PlayerSchema });
export const OkAdminRoomInfoAckSchema = z.object({
  ok: z.literal(true),
  gameId: z.string().min(1),
  playerCount: z.number().int().nonnegative(),
  observerCount: z.number().int().nonnegative(),
  players: z.array(AdminRoomPlayerSchema),
});
export const AdminRoomInfoAckSchema = z.union([OkAdminRoomInfoAckSchema, ErrAckSchema]);
export type AdminRoomInfoAck = z.infer<typeof AdminRoomInfoAckSchema>;

// Public: list games (no auth)
export const ListGamesRequestSchema = z.object({});
export type ListGamesRequest = z.infer<typeof ListGamesRequestSchema>;
export const LobbyGameItemSchema = z.object({
  gameId: z.string().min(1),
  hasX: z.boolean(),
  hasO: z.boolean(),
  observerCount: z.number().int().nonnegative(),
  status: z.enum(['waiting','in_progress','complete']),
  lastActiveAt: z.number().int().nonnegative(),
});
export type LobbyGameItem = z.infer<typeof LobbyGameItemSchema>;
export const OkListGamesAckSchema = z.object({ ok: z.literal(true), games: z.array(LobbyGameItemSchema) });
export const ListGamesAckSchema = z.union([OkListGamesAckSchema, ErrAckSchema]);
export type ListGamesAck = z.infer<typeof ListGamesAckSchema>;

