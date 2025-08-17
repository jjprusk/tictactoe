// © 2025 Joe Pruskowski
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import request from 'supertest';

// Mock the logger before importing the app so pino-http uses our mock
vi.mock('./logger', () => {
  const base: any = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  };
  base.child = vi.fn(() => base);
  base.levels = { values: { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 } };
  return { logger: base };
});

// Now import the app (middleware will bind to our mock logger)
import { app } from './app';
import { logger as mockLogger } from './logger';

describe('logger integration', () => {
  let server: http.Server;

  beforeAll(async () => {
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('pino-http attaches and logs request completion', async () => {
    const initialInfoCalls = (mockLogger.info as any).mock.calls.length;
    const res = await request(server).get('/healthz');
    expect(res.status).toBe(200);
    // pino-http logs "request completed" at info level by default
    expect(mockLogger.child).toHaveBeenCalled();
    expect((mockLogger.info as any).mock.calls.length).toBeGreaterThan(initialInfoCalls);
  });

  it('POST /logs writes client log with context for each level', async () => {
    const levels: Array<'trace'|'debug'|'info'|'warn'|'error'|'fatal'> = ['trace','debug','info','warn','error','fatal'];
    for (const level of levels) {
      const payload = { level, message: `m-${level}`, context: { k: level } };
      const res = await request(server).post('/logs').send(payload).set('Content-Type', 'application/json');
      expect(res.status).toBe(204);
      const calls = (mockLogger as any)[level].mock.calls as any[];
      const found = calls.some((c: any[]) => {
        const argObj = c[0];
        const msg = c[1];
        return argObj && argObj.k === level && msg === `m-${level}`;
      });
      expect(found).toBe(true);
    }
  });

  it('POST /logs rejects invalid payloads', async () => {
    const bads = [
      {},
      { message: '' },
      { level: 'nope', message: 'x' },
    ];
    for (const bad of bads) {
      const res = await request(server).post('/logs').send(bad).set('Content-Type', 'application/json');
      expect(res.status).toBe(400);
    }
  });
});


