// © 2025 Joe Pruskowski
import { describe, it, expect, vi } from 'vitest';
import { sendLog } from './utils/clientLogger';

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
});


