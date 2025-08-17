// © 2025 Joe Pruskowski
import { createClient, type RedisClientType } from 'redis';

let cachedClient: RedisClientType | null = null;

export function buildRedisClient(url: string): RedisClientType {
  return createClient({ url });
}

export async function connectRedis(client: RedisClientType): Promise<RedisClientType> {
  await client.connect();
  cachedClient = client;
  return client;
}

export async function pingRedis(client: RedisClientType): Promise<string> {
  return client.ping();
}

export function getRedisClient(): RedisClientType | null {
  return cachedClient;
}

export async function closeRedisClient(): Promise<void> {
  if (cachedClient) {
    await cachedClient.quit();
    cachedClient = null;
  }
}

// Test helper
export function __setRedisClientForTest(client: RedisClientType | null): void {
  cachedClient = client;
}


