// © 2025 Joe Pruskowski
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app } from './app';
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
});


