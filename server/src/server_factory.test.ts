// © 2025 Joe Pruskowski
import { describe, it, expect, vi } from 'vitest';

const HOISTED = vi.hoisted(() => ({
  httpServerStub: {} as any,
  ioStub: { on: vi.fn() } as any,
  handlerSpy: vi.fn(),
}));

vi.mock('./bootstrap', () => ({
  buildHttpServer: vi.fn(() => HOISTED.httpServerStub),
  buildIoServer: vi.fn(() => HOISTED.ioStub),
}));

vi.mock('./socket_handlers', () => ({ attachSocketHandlers: HOISTED.handlerSpy }));

describe('server_factory', () => {
  it('builds http server, attaches socket.io, and binds handlers', async () => {
    const { createServers } = await import('./server_factory');
    const res = createServers();
    expect(res.httpServer).toBe(HOISTED.httpServerStub);
    expect(res.io).toBe(HOISTED.ioStub);
    expect(HOISTED.handlerSpy).toHaveBeenCalledWith(HOISTED.ioStub);
  });
});


