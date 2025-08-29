// © 2025 Joe Pruskowski
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MongoClient } from 'mongodb';
import { __setClientForTest, getMongoClient, closeMongoClient, connectWithRetry, ensureIndexes } from './mongo';

function buildFakeClient(): any {
  const collections = new Map<string, { createIndexes: ReturnType<typeof vi.fn> }>();
  const db = vi.fn((dbName?: string) => ({
    __dbName: dbName,
    collection: vi.fn((name: string) => {
      if (!collections.has(name)) {
        collections.set(name, { createIndexes: vi.fn(async (_specs: unknown[]) => {}) });
      }
      return collections.get(name)!;
    }),
  }));
  const fake: any = {
    connect: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    db,
    __collections: collections,
  };
  return fake;
}

describe('db/mongo.ts extra coverage', () => {
  beforeEach(() => {
    __setClientForTest(null);
  });

  it('getMongoClient is null by default and follows __setClientForTest', () => {
    expect(getMongoClient()).toBeNull();
    const c = buildFakeClient() as unknown as MongoClient;
    __setClientForTest(c);
    expect(getMongoClient()).toBe(c);
  });

  it('closeMongoClient calls close() and clears cache', async () => {
    const c = buildFakeClient();
    __setClientForTest(c as unknown as MongoClient);
    await closeMongoClient();
    expect(c.close).toHaveBeenCalledTimes(1);
    expect(getMongoClient()).toBeNull();
  });

  it('connectWithRetry sets cached client on first success', async () => {
    const c: any = { connect: vi.fn(async () => {}), close: vi.fn(async () => {}) };
    await connectWithRetry(c as MongoClient, { maxRetries: 0, initialDelayMs: 10, maxDelayMs: 10 });
    expect(getMongoClient()).toBe(c);
  });

  it('connectWithRetry retries on failure then succeeds', async () => {
    const c: any = { connect: vi.fn(), close: vi.fn(async () => {}) };
    c.connect
      .mockRejectedValueOnce(new Error('first'))
      .mockResolvedValueOnce(undefined);
    const started = Date.now();
    await connectWithRetry(c as MongoClient, { maxRetries: 2, initialDelayMs: 10, maxDelayMs: 20 });
    const elapsed = Date.now() - started;
    expect(elapsed).toBeGreaterThanOrEqual(10);
    expect(c.connect).toHaveBeenCalledTimes(2);
    expect(getMongoClient()).toBe(c);
  });

  it('ensureIndexes returns immediately if no client set', async () => {
    __setClientForTest(null);
    await expect(ensureIndexes('some_db')).resolves.toBeUndefined();
  });

  it('ensureIndexes creates expected index specs per collection', async () => {
    const c = buildFakeClient();
    __setClientForTest(c as unknown as MongoClient);
    await ensureIndexes('ensure_test');

    const names = ['games', 'moves', 'sessions', 'models', 'logs'] as const;
    const expectedCounts: Record<(typeof names)[number], number> = {
      games: 3,
      moves: 2,
      sessions: 2,
      models: 2,
      logs: 3,
    };

    for (const n of names) {
      const col = c.__collections.get(n)!;
      expect(col.createIndexes).toHaveBeenCalledTimes(1);
      const arg = col.createIndexes.mock.calls[0][0];
      expect(Array.isArray(arg)).toBe(true);
      expect(arg.length).toBe(expectedCounts[n]);
    }

    const moveSpecs = c.__collections.get('moves')!.createIndexes.mock.calls[0][0];
    const moveUnique = moveSpecs.find((s: any) => s.name === 'game_idx');
    expect(moveUnique.unique).toBe(true);

    const sessionSpecs = c.__collections.get('sessions')!.createIndexes.mock.calls[0][0];
    const ttl = sessionSpecs.find((s: any) => s.name === 'expiresAt_ttl');
    expect(ttl.expireAfterSeconds).toBe(0);
  });
});
