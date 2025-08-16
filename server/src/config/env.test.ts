// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import { loadConfig } from './env';

describe('env schema', () => {
  it('provides sensible defaults for required vars', () => {
    const cfg = loadConfig();
    expect(cfg.SERVER_PORT).toBeGreaterThan(0);
    expect(cfg.MONGO_URI).toMatch(/^mongodb/);
    expect(cfg.REDIS_URL).toMatch(/^redis/);
  });

  it('rejects invalid SERVER_PORT and URIs', () => {
    const orig = { ...process.env };
    try {
      process.env.SERVER_PORT = '70000';
      process.env.MONGO_URI = 'http://not-mongo';
      process.env.REDIS_URL = 'http://not-redis';
      expect(() => loadConfig()).toThrow(/Invalid environment configuration/);
    } finally {
      process.env = orig;
    }
  });
});


