// © 2025 Joe Pruskowski
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { io as Client, Socket } from 'socket.io-client';
import { buildHttpServer, buildIoServer } from './bootstrap';
import { attachSocketHandlers } from './socket_handlers';

function emitWithAckTimeout<T = any>(
  socket: Socket,
  event: string,
  payload: any,
  timeoutMs: number
): Promise<{ ok: false; timedOut: true } | T> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ ok: false, timedOut: true } as any);
      }
    }, timeoutMs);
    socket.emit(event, payload, (res: T) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(res);
      }
    });
  });
}

describe('acks/timeouts', () => {
  let server: ReturnType<typeof buildHttpServer>;
  let baseUrl: string;

  beforeAll(async () => {
    server = buildHttpServer();
    const io = buildIoServer(server);
    attachSocketHandlers(io);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('room:join success ack', async () => {
    const c = Client(baseUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => c.on('connect', () => resolve()));
    const res: any = await emitWithAckTimeout(c, 'room:join', { roomId: 'j1' }, 500);
    expect(res.ok).toBe(true);
    c.disconnect();
  });

  it('room:join invalid payload error ack', async () => {
    const c = Client(baseUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => c.on('connect', () => resolve()));
    const res: any = await emitWithAckTimeout(c, 'room:join', {}, 500);
    expect(res).toEqual({ ok: false, error: 'invalid-payload' });
    c.disconnect();
  });

  it('move:make success and duplicate error acks', async () => {
    const c = Client(baseUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => c.on('connect', () => resolve()));
    await emitWithAckTimeout(c, 'room:join', { roomId: 'm1' }, 500);
    const ok: any = await emitWithAckTimeout(c, 'move:make', { roomId: 'm1', nonce: 'n1' }, 500);
    expect(ok).toEqual({ ok: true });
    const dup: any = await emitWithAckTimeout(c, 'move:make', { roomId: 'm1', nonce: 'n1' }, 500);
    expect(dup).toEqual({ ok: false, error: 'duplicate' });
    c.disconnect();
  });

  it('client ack timeout for unknown event and for delayed ack', async () => {
    const c = Client(baseUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => c.on('connect', () => resolve()));
    const unknown = await emitWithAckTimeout(c, 'no:such:event', {}, 100);
    expect((unknown as any).timedOut).toBe(true);

    // Delayed ack beyond timeout
    await emitWithAckTimeout(c, 'room:join', { roomId: 'm2' }, 500);
    const delayed = await emitWithAckTimeout(
      c,
      'move:make',
      { roomId: 'm2', nonce: 'n2', delayMs: 200 },
      100
    );
    expect((delayed as any).timedOut).toBe(true);
    c.disconnect();
  });
});


