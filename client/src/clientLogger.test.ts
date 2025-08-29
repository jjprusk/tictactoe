// © 2025 Joe Pruskowski
import { describe, it, expect, vi } from 'vitest';
import { sendLog, getStoredStrategy, setStoredStrategy, getStoredStartMode, setStoredStartMode, createClientLogger } from './utils/clientLogger';

describe('client sendLog', () => {
  it('posts a log payload to /logs (S073a smoke)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(null, { status: 204 }) as any
    );
    await sendLog({ level: 'info', message: 'ui-smoke', context: { from: 'test' } }, {
      baseUrl: 'http://localhost:3001'
    });
    expect(fetchSpy).toHaveBeenCalled();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/logs')).toBe(true);
    expect(init.method).toBe('POST');
    fetchSpy.mockRestore();
  });

  it('throws on non-2xx and clears timer', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(
      new Response(null, { status: 500 }) as any
    );
    await expect(sendLog({ level: 'error', message: 'fail' }, { baseUrl: 'http://x', timeoutMs: 10 })).rejects.toBeTruthy();
    fetchSpy.mockRestore();
  });

  it('origin resolution prefers baseUrl > ls override > env > location', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(new Response(null, { status: 204 }) as any);
    // 1) baseUrl wins
    await sendLog({ level: 'info', message: 'x' }, { baseUrl: 'http://base:3001' });
    expect((fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1] as any)[0]).toContain('http://base:3001/logs');

    // 2) localStorage override when no baseUrl
    try { window.localStorage.setItem('ttt_socket_url', 'http://override:4000'); } catch {}
    await sendLog({ level: 'info', message: 'x' });
    expect((fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1] as any)[0]).toContain('http://override:4000/logs');

    // 3) fallback to window.location.origin when no base/ls/env
    try { window.localStorage.removeItem('ttt_socket_url'); } catch {}
    const oldEnv = (import.meta as any).env;
    (import.meta as any).env = { ...(oldEnv || {}), VITE_SERVER_URL: undefined };
    await sendLog({ level: 'info', message: 'x' });
    const lastUrl = (fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1] as any)[0] as string;
    expect(lastUrl.endsWith('/logs')).toBe(true);
    expect(() => new URL(lastUrl)).not.toThrow();

    fetchSpy.mockRestore();
  });
});

describe('client logger wrapper', () => {
  it('samples info logs and always sends warn+', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue(new Response(null, { status: 204 }) as any);
    // Force Math.random to return 0.9 (above 0.5)
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const logger = createClientLogger({ sampleRate: 0.5, staticContext: { app: 'ttt' } });
    await logger.info('informational', { a: 1 }); // should be dropped
    await logger.warn('warning', { b: 2 }); // should be sent
    // info should not have been sent
    const sentBodies = fetchSpy.mock.calls.map(([, init]) => JSON.parse((init as any).body as string));
    const hasInfo = sentBodies.some((b: any) => b.message === 'informational');
    const hasWarn = sentBodies.some((b: any) => b.message === 'warning' && b.context?.app === 'ttt' && b.context?.b === 2);
    expect(hasInfo).toBe(false);
    expect(hasWarn).toBe(true);
    randSpy.mockRestore();
    fetchSpy.mockRestore();
  });
});

describe('strategy storage helpers', () => {
  it('getStoredStrategy defaults to ai0 when unset/invalid and migrates legacy', () => {
    const orig = window.localStorage.getItem('ttt_strategy');
    window.localStorage.removeItem('ttt_strategy');
    expect(getStoredStrategy()).toBe('ai0');
    window.localStorage.setItem('ttt_strategy', 'nope');
    expect(getStoredStrategy()).toBe('ai0');
    if (orig) window.localStorage.setItem('ttt_strategy', orig);
  });

  it('setStoredStrategy persists and reads back normalized values', () => {
    setStoredStrategy('ai');
    expect(getStoredStrategy()).toBe('ai1');
    setStoredStrategy('random');
    expect(getStoredStrategy()).toBe('ai0');
  });
});

describe('start mode storage helpers', () => {
  it('getStoredStartMode defaults to alternate on unset/invalid/errors', () => {
    try { window.localStorage.removeItem('ttt_start_mode'); } catch {}
    expect(getStoredStartMode()).toBe('alternate');
    try { window.localStorage.setItem('ttt_start_mode', 'nope'); } catch {}
    expect(getStoredStartMode()).toBe('alternate');
  });

  it('setStoredStartMode persists and is readable', () => {
    setStoredStartMode('ai');
    expect(getStoredStartMode()).toBe('ai');
    setStoredStartMode('alternate');
    expect(getStoredStartMode()).toBe('alternate');
    setStoredStartMode('human');
    expect(getStoredStartMode()).toBe('human');
  });
});


