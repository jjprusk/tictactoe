// © 2025 Joe Pruskowski
/// <reference types="@types/supertest" />
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app } from './app';

describe('health/readiness endpoints', () => {
  it('GET /healthz returns ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /readyz returns ready true', async () => {
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ready: true });
  });
});


