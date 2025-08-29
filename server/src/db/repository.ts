// © 2025 Joe Pruskowski
import type { Db } from 'mongodb';
import { getMongoClient } from './mongo';
import { COLLECTION_GAMES, GameDoc, GameDocSchema, Player, StartMode, Strategy, COLLECTION_MOVES, MoveDoc, MoveDocSchema } from './schemas';

export type SaveGameStartInput = {
  gameId: string;
  startingPlayer: Player;
  strategy: Strategy;
  startMode?: StartMode;
  metadata?: Record<string, unknown>;
};

/**
 * Persists the initial game document into MongoDB.
 * Throws if Mongo is not connected or insertion fails.
 */
export async function saveGameStart(input: SaveGameStartInput, dbName = 'tictactoe'): Promise<GameDoc> {
  const client = getMongoClient();
  if (!client) {
    throw new Error('MongoDB client not connected');
  }
  const db: Db = client.db(dbName);

  const now = new Date();
  const docCandidate: GameDoc = {
    _id: input.gameId,
    createdAt: now,
    updatedAt: now,
    startingPlayer: input.startingPlayer,
    strategy: input.strategy,
    startMode: input.startMode ?? 'human',
    status: 'active',
    metadata: input.metadata,
  } as GameDoc;

  const doc = GameDocSchema.parse(docCandidate);
  await db.collection<GameDoc>(COLLECTION_GAMES).insertOne(doc);
  return doc;
}

export type SaveMoveInput = {
  gameId: string;
  idx: number;
  position: number;
  player: Player;
  createdAt?: Date;
};

/**
 * Persists a move document. The unique index (gameId, idx) enforces ordering.
 */
export async function saveMove(input: SaveMoveInput, dbName = 'tictactoe'): Promise<MoveDoc> {
  const client = getMongoClient();
  if (!client) {
    throw new Error('MongoDB client not connected');
  }
  const db: Db = client.db(dbName);
  const candidate: MoveDoc = {
    gameId: input.gameId,
    idx: input.idx,
    position: input.position,
    player: input.player,
    createdAt: input.createdAt ?? new Date(),
  } as MoveDoc;
  const doc = MoveDocSchema.parse(candidate);
  await db.collection<MoveDoc>(COLLECTION_MOVES).insertOne(doc);
  return doc;
}

export type SaveGameOutcomeInput = {
  gameId: string;
  winner?: Player; // when absent and draw=true, it's a draw
  draw?: boolean;
};

/**
 * Marks a game as completed with winner or draw and updates updatedAt.
 */
export async function saveGameOutcome(input: SaveGameOutcomeInput, dbName = 'tictactoe'): Promise<void> {
  const client = getMongoClient();
  if (!client) throw new Error('MongoDB client not connected');
  const db: Db = client.db(dbName);
  const update: Partial<GameDoc> = {
    status: 'completed',
    updatedAt: new Date(),
  } as Partial<GameDoc>;
  if (typeof input.winner === 'string') (update as Partial<GameDoc>).winner = input.winner;
  if (typeof input.draw === 'boolean') (update as Partial<GameDoc>).draw = input.draw;
  await db.collection<GameDoc>(COLLECTION_GAMES).updateOne({ _id: input.gameId }, { $set: update });
}
