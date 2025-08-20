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
    const origin = window.location.origin;
    const s1 = socketService.connect({ reconnectionAttempts: 5 });
    const s2 = socketService.connect();
    expect(s1).toBe(s2);

    // io called once and with merged options
    const ioMock = mod.io as unknown as ReturnType<typeof vi.fn> & { mock: any };
    expect(ioMock.mock.calls.length).toBe(1);
    const [calledUrl, calledOpts] = ioMock.mock.calls[0];
    expect(calledUrl).toBe(origin);
    expect(calledOpts.reconnection).toBe(true);
    expect(calledOpts.reconnectionAttempts).toBe(5);
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
});


