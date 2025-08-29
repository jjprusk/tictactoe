// © 2025 Joe Pruskowski
import type { RedisClientType } from 'redis';

export type CacheSetOptions = {
  ttlSeconds?: number; // time-to-live in seconds
};

export async function cacheSetString(client: RedisClientType, key: string, value: string, opts?: CacheSetOptions): Promise<void> {
  if (!key) throw new Error('key must be non-empty');
  if (typeof value !== 'string') throw new Error('value must be string');
  if (opts?.ttlSeconds && opts.ttlSeconds > 0) {
    await client.set(key, value, { EX: opts.ttlSeconds });
  } else {
    await client.set(key, value);
  }
}

export async function cacheGetString(client: RedisClientType, key: string): Promise<string | null> {
  if (!key) throw new Error('key must be non-empty');
  return client.get(key);
}

export async function cacheSetJSON<T>(client: RedisClientType, key: string, value: T, opts?: CacheSetOptions): Promise<void> {
  const serialized = JSON.stringify(value);
  await cacheSetString(client, key, serialized, opts);
}

export async function cacheGetJSON<T>(client: RedisClientType, key: string): Promise<T | null> {
  const raw = await cacheGetString(client, key);
  if (raw === null) return null;
  return JSON.parse(raw) as T;
}
