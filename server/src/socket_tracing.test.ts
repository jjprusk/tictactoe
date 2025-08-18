// © 2025 Joe Pruskowski
import { describe, it, expect, vi } from 'vitest';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import { io as IOClient } from 'socket.io-client';

describe('socket tracing', () => {
  it('ends span on ok and error paths', async () => {
    // Mock tracer with hoisted spies
    const hoisted = vi.hoisted(() => ({
      endSpy: vi.fn(),
      setAttrSpy: vi.fn(),
    }));
    vi.mock('./tracing', () => ({
      getTracer: () => ({ startSpan: () => ({ end: hoisted.endSpy, setAttribute: hoisted.setAttrSpy }) }),
    }));

    const { attachSocketHandlers } = await import('./socket_handlers');
    const httpServer = http.createServer();
    const io = new IOServer(httpServer, { transports: ['polling'] });
    attachSocketHandlers(io);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const port = (httpServer.address() as any).port as number;
    const client = IOClient(`http://127.0.0.1:${port}`, { transports: ['polling'] });
    await new Promise<void>((resolve) => client.on('connect', () => resolve()));

    // invalid payload
    await new Promise<void>((resolve) => client.emit('move:make', { bad: true }, () => resolve()));
    // ok path
    await new Promise<void>((resolve) => client.emit('room:join', { roomId: 't1' }, () => resolve()));
    await new Promise<void>((resolve) => client.emit('move:make', { roomId: 't1', nonce: 'n1' }, () => resolve()));

    expect(hoisted.endSpy).toHaveBeenCalled();
    client.disconnect();
    await new Promise<void>((resolve) => io.close(() => httpServer.close(() => resolve())));
  });
});


