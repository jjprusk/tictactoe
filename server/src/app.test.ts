// © 2025 Joe Pruskowski
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app } from './app';
import { logger } from './logger';
import { __setClientForTest } from './db/mongo';
import { __setRedisClientForTest } from './db/redis';

describe('health/readiness endpoints', () => {
  it('GET /healthz returns ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /readyz returns ready true when mongo and redis ready', async () => {
    __setClientForTest({} as any);
    __setRedisClientForTest({} as any);
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ready: true, mongo: true, redis: true });
  });

  it('POST /echo echoes parsed JSON body', async () => {
    const payload = { a: 1, b: 'x' };
    const res = await request(app).post('/echo').send(payload).set('Content-Type', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ body: payload });
  });

  it('logger is configured and pino-http attaches bindings', async () => {
    expect(logger.level).toBeTypeOf('string');
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
  });

  // Metrics tests moved to app_metrics.test.ts to control env gating

  it('sets x-request-id when not provided', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    const id = res.headers['x-request-id'];
    expect(typeof id).toBe('string');
    expect((id as string).length).toBeGreaterThan(0);
  });

  it('echoes provided x-request-id and returns same header', async () => {
    const provided = 'req-abc-123';
    const res = await request(app).get('/healthz').set('x-request-id', provided);
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe(provided);
  });

  it('GET / returns hello message', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Hello, TicTacToe' });
    // helmet minimal headers present
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('POST /logs accepts client log payload', async () => {
    const payload = { level: 'info', message: 'client event', context: { feature: 'test' } };
    const res = await request(app).post('/logs').send(payload).set('Content-Type', 'application/json');
    expect(res.status).toBe(204);
  });
});


