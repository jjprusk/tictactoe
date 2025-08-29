// © 2025 Joe Pruskowski
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import request from 'supertest';
import { app } from './app';
import { __setClientForTest } from './db/mongo';

const fakeDocs = [
  { createdAt: new Date('2025-01-01T00:00:00Z'), level: 'info', message: 'a', gameId: 'g1', sessionId: 's1', source: 'client' },
  { createdAt: new Date('2025-01-02T00:00:00Z'), level: 'error', message: 'b', gameId: 'g2', sessionId: 's2', source: 'server' },
];

function buildFakeMongo() {
  return {
    db: () => ({
      collection: () => ({
        find: (_q: any) => ({ sort: () => ({ batchSize: () => ({
          async *[Symbol.asyncIterator]() { for (const d of fakeDocs) yield d; }
        }) }) })
      })
    })
  } as any;
}

describe('/admin/logs/export', () => {
  let server: http.Server;

  beforeAll(async () => {
    __setClientForTest(buildFakeMongo());
    server = http.createServer(app);
    await new Promise<void>((r) => server.listen(0, r));
  });
  afterAll(async () => {
    await new Promise<void>((r) => server.close(() => r()));
    __setClientForTest(null as any);
  });

  it('requires admin key', async () => {
    const res = await request(server).get('/admin/logs/export');
    expect(res.status).toBe(403);
  });

  it('streams JSON', async () => {
    const res = await request(server)
      .get('/admin/logs/export?format=json')
      .set('x-admin-key', process.env.ADMIN_KEY || 'dev-admin-key');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    const arr = JSON.parse(res.text);
    expect(Array.isArray(arr)).toBe(true);
    expect(arr.length).toBe(2);
    expect(arr[0].message).toBe('a');
  });

  it('streams CSV', async () => {
    const res = await request(server)
      .get('/admin/logs/export?format=csv')
      .set('x-admin-key', process.env.ADMIN_KEY || 'dev-admin-key');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    const lines = res.text.trim().split('\n');
    expect(lines[0]).toBe('createdAt,level,message,gameId,sessionId,source');
    expect(lines.length).toBe(3);
  });
});


