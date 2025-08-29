// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import { loadConfig } from './env';

describe('env schema', () => {
  it('provides sensible defaults for required vars', () => {
    const cfg = loadConfig();
    expect(cfg.SERVER_PORT).toBeGreaterThan(0);
    expect(cfg.MONGO_URI).toMatch(/^mongodb/);
    expect(cfg.REDIS_URL).toMatch(/^redis/);
    expect(cfg.LOG_RETENTION_DAYS).toBeGreaterThan(0);
    expect(typeof cfg.LOG_TO_MONGO).toBe('boolean');
    expect(cfg.LOG_SAMPLE_RATE).toBeGreaterThanOrEqual(0);
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

  it('accepts override for LOG_RETENTION_DAYS', () => {
    const orig = { ...process.env };
    try {
      process.env.LOG_RETENTION_DAYS = '30';
      const cfg = loadConfig();
      expect(cfg.LOG_RETENTION_DAYS).toBe(30);
    } finally {
      process.env = orig;
    }
  });

  it('accepts logger sink and sampling overrides', () => {
    const orig = { ...process.env };
    try {
      process.env.LOG_TO_MONGO = '1';
      process.env.LOG_SAMPLE_RATE = '0.5';
      const cfg = loadConfig();
      expect(cfg.LOG_TO_MONGO).toBe(true);
      expect(cfg.LOG_SAMPLE_RATE).toBeCloseTo(0.5);
    } finally {
      process.env = orig;
    }
  });
});


