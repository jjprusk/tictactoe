// © 2025 Joe Pruskowski
import type { Db } from 'mongodb';
import { getMongoClient } from './mongo';
import { COLLECTION_LOGS } from './schemas';

/**
 * Deletes log documents older than the provided cutoff date.
 * Returns the number of deleted documents.
 */
export async function deleteOldLogs(cutoff: Date, dbName = 'tictactoe'): Promise<number> {
  if (!(cutoff instanceof Date) || Number.isNaN(cutoff.getTime())) {
    throw new Error('cutoff must be a valid Date');
  }
  const client = getMongoClient();
  if (!client) throw new Error('MongoDB client not connected');
  const db: Db = client.db(dbName);
  const res = await db.collection(COLLECTION_LOGS).deleteMany({ createdAt: { $lt: cutoff } });
  return res.deletedCount ?? 0;
}
