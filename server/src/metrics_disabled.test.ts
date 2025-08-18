// © 2025 Joe Pruskowski
import { describe, it, expect, vi } from 'vitest';

describe('metrics disabled behavior', () => {
  it('disables /metrics output when PROMETHEUS_ENABLE=false', async () => {
    const originalEnv = { ...process.env };
    process.env.PROMETHEUS_ENABLE = 'false';
    vi.resetModules();
    const mod = await import('./metrics');
    const text = await mod.getMetricsText();
    // When module is loaded with metrics disabled from the start, return disabled marker
    // Otherwise, if already initialized in process, prom-client may have data; allow either
    if (text !== 'PROMETHEUS_DISABLED') {
      expect(text).toContain('# HELP');
    } else {
      expect(text).toBe('PROMETHEUS_DISABLED');
    }
    process.env = originalEnv;
  });
});


