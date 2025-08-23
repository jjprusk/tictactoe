// © 2025 Joe Pruskowski
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

describe('metrics enabled', () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    process.env = { ...originalEnv, PROMETHEUS_ENABLE: 'true' } as NodeJS.ProcessEnv;
    vi.resetModules();
  });
  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it('GET /metrics returns exposition text and histogram records', async () => {
    const { app } = await import('./app');
    const res1 = await request(app).get('/healthz');
    expect(res1.status).toBe(200);
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('# HELP');
    expect(res.text).toContain('http_request_duration_seconds_bucket');
    expect(res.text).toContain('method="GET"');
    expect(res.text).toContain('route="/healthz"');
    expect(res.text).toContain('status_code="200"');
    // ai_decision_latency_seconds may appear when orchestrator runs
  });
});


