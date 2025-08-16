// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import type { MongoClient } from 'mongodb';
import { connectWithRetry, getMongoClient, closeMongoClient, __setClientForTest } from './mongo';

describe('mongo connectWithRetry', () => {
  it('sets cached client on success after transient failures', async () => {
    let calls = 0;
    const fake: Partial<MongoClient> = {
      connect: async () => {
        calls += 1;
        if (calls < 3) throw new Error('transient');
        return undefined as unknown as MongoClient;
      },
      close: async () => undefined as unknown as any,
    };

    __setClientForTest(null);
    await expect(
      connectWithRetry(fake as MongoClient, { maxRetries: 5, initialDelayMs: 10, maxDelayMs: 20 })
    ).resolves.toBeDefined();
    expect(calls).toBe(3);
    expect(getMongoClient()).not.toBeNull();
    await closeMongoClient();
    expect(getMongoClient()).toBeNull();
  });

  it('rejects after exceeding max retries', async () => {
    let calls = 0;
    const fake: Partial<MongoClient> = {
      connect: async () => {
        calls += 1;
        throw new Error('always');
      },
      close: async () => undefined as unknown as any,
    };
    __setClientForTest(null);
    const maxRetries = 2;
    await expect(
      connectWithRetry(fake as MongoClient, { maxRetries, initialDelayMs: 5, maxDelayMs: 10 })
    ).rejects.toBeTruthy();
    // Attempts should be maxRetries + 1 (initial try + retries)
    expect(calls).toBeGreaterThanOrEqual(maxRetries + 1);
    expect(getMongoClient()).toBeNull();
  });
});


