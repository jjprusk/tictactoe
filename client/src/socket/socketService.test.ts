// © 2025 Joe Pruskowski
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('socket.io-client', () => {
  const handlers = new Map<string, Function[]>();
  let connected = false;
  const fakeSocket = {
    on: vi.fn((event: string, fn: Function) => {
      const arr = handlers.get(event) ?? [];
      arr.push(fn);
      handlers.set(event, arr);
    }),
    off: vi.fn((event: string, fn: Function) => {
      const arr = handlers.get(event) ?? [];
      handlers.set(event, arr.filter((h) => h !== fn));
    }),
    emit: vi.fn(),
    disconnect: vi.fn(() => {
      connected = false;
      const arr = handlers.get('disconnect') ?? [];
      arr.forEach((h) => h());
    }),
    get connected() {
      return connected;
    },
    // helper for tests to simulate inbound client events
    emitLocal: (event: string) => {
      const arr = handlers.get(event) ?? [];
      arr.forEach((h) => h());
    },
  } as any;

  const io = vi.fn(() => {
    // simulate async connect tick
    setTimeout(() => {
      connected = true;
      const arr = handlers.get('connect') ?? [];
      arr.forEach((h) => h());
    }, 0);
    return fakeSocket;
  });

  return { io };
});

describe('socketService', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('connects and updates status, then disconnects', async () => {
    const { socketService } = await import('./socketService');

    let statuses: string[] = [];
    const unsub = socketService.subscribeStatus((s) => statuses.push(s));

    const sock = socketService.connect({ url: 'http://localhost:3001' });
    expect(sock).toBeTruthy();
    expect(socketService.getStatus()).toBe('connecting');

    // wait microtask for simulated connect
    await new Promise((r) => setTimeout(r, 0));
    expect(socketService.getStatus()).toBe('connected');
    expect(socketService.isConnected()).toBe(true);

    await socketService.disconnect();
    expect(socketService.getStatus()).toBe('disconnected');
    expect(socketService.isConnected()).toBe(false);

    unsub();
    expect(statuses[0]).toBe('disconnected');
    expect(statuses).toContain('connecting');
    expect(statuses).toContain('connected');
    expect(statuses.at(-1)).toBe('disconnected');
  });

  it('reuses existing socket and proxies on/off/emit with options', async () => {
    const { socketService } = await import('./socketService');
    const mod = (await import('socket.io-client')) as any;
    // reset call counts from previous test
    (mod.io as any).mockClear?.();

    // subscribe returns initial status
    const seen: string[] = [];
    const unsub = socketService.subscribeStatus((s) => seen.push(s));
    expect(seen[0]).toBe('disconnected');

    // connect with options and without url uses window.origin
    // Ensure test origin is stable
    Object.defineProperty(window, 'location', { value: new URL('http://localhost:3000'), writable: false });
    const origin = window.location.origin;
    const s1 = socketService.connect({ reconnectionAttempts: 5 });
    const s2 = socketService.connect();
    expect(s1).toBe(s2);

    // io called once and with merged options
    const ioMock = mod.io as unknown as ReturnType<typeof vi.fn> & { mock: any };
    expect(ioMock.mock.calls.length).toBe(1);
    const [calledUrl, calledOpts] = ioMock.mock.calls[0];
    const envUrl = (import.meta as any)?.env?.VITE_SERVER_URL as string | undefined;
    const expectedUrl = envUrl ?? origin;
    expect(calledUrl).toBe(expectedUrl);
    expect(calledOpts.reconnection).toBe(true);
    expect(calledOpts.reconnectionAttempts).toBe(5);
    expect(calledOpts.reconnectionDelay).toBe(500);
    expect(calledOpts.reconnectionDelayMax).toBe(2000);
    expect(Array.isArray(calledOpts.transports)).toBe(true);

    // Wait until mocked connect fires
    await new Promise((r) => setTimeout(r, 0));

    // on/off/emit proxy to underlying socket
    const fakeSocket = ioMock.mock.results[0].value;
    const handler = vi.fn();
    socketService.on('foo', handler);
    socketService.emit('foo', { a: 1 });
    socketService.off('foo', handler);
    expect(fakeSocket.on).toHaveBeenCalledWith('foo', handler);
    expect(fakeSocket.emit).toHaveBeenCalledWith('foo', { a: 1 });
    expect(fakeSocket.off).toHaveBeenCalledWith('foo', handler);

    unsub();
    await socketService.disconnect();
  });

  it('maps reconnect events to status updates', async () => {
    const { socketService } = await import('./socketService');
    const mod = (await import('socket.io-client')) as any;
    (mod.io as any).mockClear?.();

    const seen: string[] = [];
    const unsub = socketService.subscribeStatus((s) => seen.push(s));
    socketService.connect({ url: 'http://localhost:3001' });
    await new Promise((r) => setTimeout(r, 0));

    const fakeSocket = (mod.io as any).mock.results[0].value;
    fakeSocket.emitLocal('reconnect_attempt');
    expect(socketService.getStatus()).toBe('connecting');
    fakeSocket.emitLocal('reconnect');
    expect(socketService.getStatus()).toBe('connected');
    fakeSocket.emitLocal('reconnect_error');
    expect(socketService.getStatus()).toBe('connecting');
    fakeSocket.emitLocal('reconnect_failed');
    expect(socketService.getStatus()).toBe('disconnected');

    unsub();
    await socketService.disconnect();
  });

  it('probeServerHealthy returns true on 200 and false on error/non-ok', async () => {
    const { socketService } = await import('./socketService');
    const svc: any = socketService;
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any);

    // ok: true
    fetchSpy.mockResolvedValueOnce({ ok: true } as any);
    await expect(svc.probeServerHealthy('http://x')).resolves.toBe(true);

    // ok: false
    fetchSpy.mockResolvedValueOnce({ ok: false } as any);
    await expect(svc.probeServerHealthy('http://x')).resolves.toBe(false);

    // throws
    fetchSpy.mockRejectedValueOnce(new Error('network'));
    await expect(svc.probeServerHealthy('http://x')).resolves.toBe(false);

    fetchSpy.mockRestore();
  });

  it('probe path defers socket creation when server is down in dev', async () => {
    const { socketService } = await import('./socketService');
    const mod = (await import('socket.io-client')) as any;
    (mod.io as any).mockClear?.();

    // force probe to be enabled regardless of env
    (socketService as any).setProbeOverrideForTest(true);

    // Make fetch fail twice
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any);
    fetchSpy.mockRejectedValueOnce(new Error('down'));
    fetchSpy.mockResolvedValueOnce({ ok: false } as any);

    const unsub = socketService.subscribeStatus(() => {});
    socketService.connect({ url: 'http://localhost:3001' });
    // allow probe to run
    await Promise.resolve();
    await Promise.resolve();
    // still no socket attempt
    expect((mod.io as any).mock.calls.length).toBe(0);

    unsub();
    fetchSpy.mockRestore();
    await socketService.disconnect();
    // clear override
    (socketService as any).setProbeOverrideForTest(undefined);
  });
});


