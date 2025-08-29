// © 2025 Joe Pruskowski
import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from './app';
import { __setClientForTest } from './db/mongo';
import { __setRedisClientForTest } from './db/redis';

describe('app.ts additional coverage', () => {
  it('POST /logs rejects invalid payload', async () => {
    const res = await request(app).post('/logs').send({}).set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
  });

  it('POST /logs/batch rejects invalid payload', async () => {
    const res = await request(app).post('/logs/batch').send({}).set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
  });

  it('POST /logs/batch accepts valid array payload', async () => {
    const payload = [
      { level: 'info', message: 'one', context: { a: 1 } },
      { level: 'warn', message: 'two' },
    ];
    const res = await request(app).post('/logs/batch').send(payload).set('Content-Type', 'application/json');
    expect(res.status).toBe(204);
  });

  it('POST /admin/log-level 400 on invalid body with admin key', async () => {
    const res = await request(app)
      .post('/admin/log-level')
      .set('x-admin-key', process.env.ADMIN_KEY || 'dev-admin-key')
      .send({ level: 'nope' });
    expect(res.status).toBe(400);
  });

  describe('/admin/logs/export error paths', () => {
    afterAll(() => {
      __setClientForTest(null as any);
    });

    it('503 when Mongo not connected', async () => {
      __setClientForTest(null as any);
      const res = await request(app)
        .get('/admin/logs/export?format=json')
        .set('x-admin-key', process.env.ADMIN_KEY || 'dev-admin-key');
      expect(res.status).toBe(503);
    });

    it('400 on invalid format query', async () => {
      // Provide a fake client to bypass 503 and trigger validation
      __setClientForTest({ db: () => ({ collection: () => ({ find: () => ({ sort: () => ({ batchSize: () => ({ async *[Symbol.asyncIterator]() {} }) }) }) }) }) } as any);
      const res = await request(app)
        .get('/admin/logs/export?format=bogus')
        .set('x-admin-key', process.env.ADMIN_KEY || 'dev-admin-key');
      expect(res.status).toBe(400);
    });
  });

  it('GET /readyz false when clients absent', async () => {
    __setClientForTest(null as any);
    __setRedisClientForTest(null as any);
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ready: false, mongo: false, redis: false });
  });
});
