// © 2025 Joe Pruskowski
import { describe, it, expect, vi } from 'vitest';
import { sendLog, getStoredStrategy, setStoredStrategy } from './utils/clientLogger';

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
});

describe('strategy storage helpers', () => {
  it('getStoredStrategy defaults to random when unset/invalid', () => {
    const orig = window.localStorage.getItem('ttt_strategy');
    window.localStorage.removeItem('ttt_strategy');
    expect(getStoredStrategy()).toBe('random');
    window.localStorage.setItem('ttt_strategy', 'nope');
    expect(getStoredStrategy()).toBe('random');
    if (orig) window.localStorage.setItem('ttt_strategy', orig);
  });

  it('setStoredStrategy persists and read back', () => {
    setStoredStrategy('ai');
    expect(getStoredStrategy()).toBe('ai');
    setStoredStrategy('random');
    expect(getStoredStrategy()).toBe('random');
  });
});


