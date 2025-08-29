// © 2025 Joe Pruskowski
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RedisClientType } from 'redis';
import { cacheSetString, cacheGetString, cacheSetJSON, cacheGetJSON } from './cache';

function buildFakeRedis() {
  const store = new Map<string, { value: string; expiresAt?: number }>();
  const now = () => Date.now();
  const client: Partial<RedisClientType> = {
    set: vi.fn(async (key: string, value: string, opts?: any) => {
      const entry: { value: string; expiresAt?: number } = { value };
      if (opts && typeof opts.EX === 'number' && opts.EX > 0) {
        entry.expiresAt = now() + opts.EX * 1000;
      }
      store.set(key, entry);
    }) as any,
    get: vi.fn(async (key: string) => {
      const e = store.get(key);
      if (!e) return null;
      if (typeof e.expiresAt === 'number' && e.expiresAt <= now()) {
        store.delete(key);
        return null;
      }
      return e.value;
    }) as any,
  };
  return { client: client as RedisClientType, store };
}

describe('db/cache helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  it('sets and gets string values without TTL', async () => {
    const { client } = buildFakeRedis();
    await cacheSetString(client, 'k', 'v');
    await expect(cacheGetString(client, 'k')).resolves.toBe('v');
  });

  it('sets string with TTL and expires after time passes', async () => {
    const { client } = buildFakeRedis();
    await cacheSetString(client, 'k', 'v', { ttlSeconds: 10 });
    await expect(cacheGetString(client, 'k')).resolves.toBe('v');
    vi.advanceTimersByTime(9000);
    await expect(cacheGetString(client, 'k')).resolves.toBe('v');
    vi.advanceTimersByTime(2000);
    await expect(cacheGetString(client, 'k')).resolves.toBeNull();
  });

  it('sets and gets JSON values', async () => {
    const { client } = buildFakeRedis();
    await cacheSetJSON(client, 'obj', { a: 1, b: 'x' });
    await expect(cacheGetJSON<{ a: number; b: string }>(client, 'obj')).resolves.toEqual({ a: 1, b: 'x' });
  });

  it('validates key non-empty and string type for setString', async () => {
    const { client } = buildFakeRedis();
    await expect(cacheSetString(client, '', 'v')).rejects.toThrow(/key/);
    await expect(cacheSetString(client, 'k', 123 as any)).rejects.toThrow(/string/);
    await expect(cacheGetString(client, '')).rejects.toThrow(/key/);
  });
});
