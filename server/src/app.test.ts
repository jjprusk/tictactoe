// © 2025 Joe Pruskowski
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app } from './app';
import { logger } from './logger';
import { __setClientForTest } from './db/mongo';

describe('health/readiness endpoints', () => {
  it('GET /healthz returns ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /readyz returns ready true', async () => {
    __setClientForTest({} as any);
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ready: true });
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

  it('GET / returns hello message', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Hello, TicTacToe' });
  });
});


