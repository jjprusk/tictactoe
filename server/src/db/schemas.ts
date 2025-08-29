// © 2025 Joe Pruskowski
import { z } from 'zod';

// Shared primitives
export const PlayerSchema = z.enum(['X', 'O']);
export type Player = z.infer<typeof PlayerSchema>;

export const StrategySchema = z.enum(['ai0', 'ai1', 'ai2', 'ai3']);
export type Strategy = z.infer<typeof StrategySchema>;

export const StartModeSchema = z.enum(['ai', 'human', 'alternate']);
export type StartMode = z.infer<typeof StartModeSchema>;

// Games collection
// Document keyed by gameId (string), stores immutable start data and completion outcome
export const GameDocSchema = z.object({
  _id: z.string().min(1), // gameId
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  startingPlayer: PlayerSchema,
  strategy: StrategySchema,
  startMode: StartModeSchema.optional().default('human'),
  status: z.enum(['active', 'completed']).default('active'),
  winner: PlayerSchema.optional(),
  draw: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type GameDoc = z.infer<typeof GameDocSchema>;

// Moves collection
export const MoveDocSchema = z.object({
  _id: z.any().optional(),
  gameId: z.string().min(1),
  idx: z.number().int().nonnegative(),
  position: z.number().int().min(0).max(8),
  player: PlayerSchema,
  createdAt: z.coerce.date(),
});
export type MoveDoc = z.infer<typeof MoveDocSchema>;

// Sessions collection
export const SessionDocSchema = z.object({
  _id: z.string().min(1), // session token
  gameId: z.string().min(1),
  player: PlayerSchema.optional(),
  socketId: z.string().min(1).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  expiresAt: z.coerce.date().optional(),
});
export type SessionDoc = z.infer<typeof SessionDocSchema>;

// Model registry collection (AI models)
export const ModelDocSchema = z.object({
  _id: z.string().min(1), // model id
  version: z.string().min(1),
  createdAt: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type ModelDoc = z.infer<typeof ModelDocSchema>;

// Logs collection (client/server)
export const LogLevelSchema = z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']);
export type LogLevel = z.infer<typeof LogLevelSchema>;

export const LogDocSchema = z.object({
  _id: z.any().optional(),
  level: LogLevelSchema,
  message: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional(),
  origin: z.enum(['server', 'client']).default('server'),
  gameId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  createdAt: z.coerce.date(),
});
export type LogDoc = z.infer<typeof LogDocSchema>;

// Collection name constants
export const COLLECTION_GAMES = 'games' as const;
export const COLLECTION_MOVES = 'moves' as const;
export const COLLECTION_SESSIONS = 'sessions' as const;
export const COLLECTION_MODELS = 'models' as const;
export const COLLECTION_LOGS = 'logs' as const;


