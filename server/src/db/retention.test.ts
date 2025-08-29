// © 2025 Joe Pruskowski
import { describe, it, expect, beforeEach } from 'vitest';
import type { MongoClient } from 'mongodb';
import { __setClientForTest } from './mongo';
import { deleteOldLogs } from './retention';

function buildFakeMongo(deletedCount = 0) {
  const calls: Record<string, unknown> = {};
  const db = (dbName?: string) => ({
    __dbName: dbName,
    collection: (_name: string) => ({
      deleteMany: async (filter: Record<string, unknown>) => {
        calls.filter = filter;
        return { acknowledged: true, deletedCount };
      },
    }),
  });
  const client: Partial<MongoClient> = { db: db as any };
  return { client: client as MongoClient, calls };
}

describe('db/retention deleteOldLogs', () => {
  beforeEach(() => {
    __setClientForTest(null);
  });

  it('throws for invalid cutoff', async () => {
    await expect(deleteOldLogs(new Date('invalid'))).rejects.toThrow(/valid Date/);
  });

  it('throws when no mongo client connected', async () => {
    await expect(deleteOldLogs(new Date('2025-01-01T00:00:00Z'))).rejects.toThrow(/not connected/);
  });

  it('deletes logs older than cutoff and returns deletedCount', async () => {
    const { client, calls } = buildFakeMongo(42);
    __setClientForTest(client);
    const cutoff = new Date('2025-01-01T00:00:00Z');
    const count = await deleteOldLogs(cutoff, 'unit_db');
    expect(count).toBe(42);
    expect(calls.filter).toEqual({ createdAt: { $lt: cutoff } });
  });
});
