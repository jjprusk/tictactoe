// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import { io as IOClient, Socket as IOClientSocket } from 'socket.io-client';

describe('socket metrics', () => {
  it('increments connection and disconnection counters and records move latency', async () => {
    process.env.PROMETHEUS_ENABLE = 'true';
    const { attachSocketHandlers } = await import('./socket_handlers');
    const { getMetricsText } = await import('./metrics');
    const httpServer = http.createServer();
    const io = new IOServer(httpServer, { transports: ['polling'] });
    attachSocketHandlers(io);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const address = httpServer.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    const client: IOClientSocket = IOClient(`http://127.0.0.1:${port}`, { transports: ['polling'] });
    await new Promise<void>((resolve) => client.on('connect', () => resolve()));
    // Exercise move:make to record latency
    await new Promise<void>((resolve, reject) => {
      client.emit('room:join', { roomId: 'r1' }, (resp: any) => {
        if (!resp.ok) return reject(new Error('join failed'));
        client.emit('move:make', { roomId: 'r1', nonce: 'n1' }, () => resolve());
      });
    });
    client.disconnect();
    await new Promise((r) => setTimeout(r, 50));

    const text = await getMetricsText();
    expect(text).toContain('socket_connections_total');
    expect(text).toContain('socket_disconnections_total');
    expect(text).toContain('move_latency_seconds_bucket');

    await new Promise<void>((resolve) => io.close(() => httpServer.close(() => resolve())));
  });
});


