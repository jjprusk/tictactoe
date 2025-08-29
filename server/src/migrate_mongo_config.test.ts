// © 2025 Joe Pruskowski
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

function loadConfig() {
  // Ensure fresh read of process.env each time
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path').resolve(__dirname, '..', 'migrate-mongo-config.js');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const modPath = require.resolve(path);
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete require.cache[modPath];
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(path) as any;
}

const ORIGINAL_ENV = { ...process.env };

describe('migrate-mongo-config.js', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.MONGO_URI;
    delete process.env.MONGO_DB;
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('uses defaults when no env vars set', () => {
    const cfg = loadConfig();
    expect(cfg.mongodb.url).toMatch(/^mongodb:\/\//);
    expect(cfg.mongodb.databaseName).toBe('tictactoe');
    expect(cfg.migrationsDir).toBe('migrations');
    expect(cfg.changelogCollectionName).toBe('changelog');
    expect(cfg.migrationFileExtension).toBe('.js');
    expect(cfg.useFileHash).toBe(false);
    expect(cfg.mongodb.options.useNewUrlParser).toBe(true);
    expect(cfg.mongodb.options.useUnifiedTopology).toBe(true);
  });

  it('derives databaseName from MONGO_URI path segment', () => {
    process.env.MONGO_URI = 'mongodb://localhost:27017/customdb';
    const cfg = loadConfig();
    expect(cfg.mongodb.url).toBe('mongodb://localhost:27017/customdb');
    expect(cfg.mongodb.databaseName).toBe('customdb');
  });

  it('prefers MONGO_DB over URL-derived databaseName', () => {
    process.env.MONGO_URI = 'mongodb://localhost:27017/ignored';
    process.env.MONGO_DB = 'override_db';
    const cfg = loadConfig();
    expect(cfg.mongodb.databaseName).toBe('override_db');
  });

  it('falls back to default databaseName on invalid MONGO_URI', () => {
    process.env.MONGO_URI = 'not-a-valid-url';
    const cfg = loadConfig();
    expect(cfg.mongodb.url).toBe('not-a-valid-url');
    expect(cfg.mongodb.databaseName).toBe('tictactoe');
  });
});
