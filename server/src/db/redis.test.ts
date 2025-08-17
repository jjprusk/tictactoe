// © 2025 Joe Pruskowski
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('redis', () => {
  const client = {
    connect: vi.fn(async () => undefined),
    ping: vi.fn(async () => 'PONG'),
    quit: vi.fn(async () => undefined),
  };
  return {
    createClient: vi.fn(() => client),
  };
});

import { buildRedisClient, connectRedis, pingRedis, closeRedisClient } from './redis';

describe('redis client helpers', () => {
  afterEach(async () => {
    await closeRedisClient();
  });

  it('connects and responds to ping', async () => {
    const client = buildRedisClient('redis://localhost:6379');
    await connectRedis(client);
    const res = await pingRedis(client);
    expect(res).toBe('PONG');
  });
});


