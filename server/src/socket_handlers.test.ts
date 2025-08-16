// © 2025 Joe Pruskowski
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { io as Client } from 'socket.io-client';
import { buildHttpServer, buildIoServer } from './bootstrap';

describe('socket handlers', () => {
	const roomId = 'r1';
	const base = () => `http://localhost:${(server.address() as any).port}`;
	let server: ReturnType<typeof buildHttpServer>;

	beforeAll(async () => {
		server = buildHttpServer();
		const io = buildIoServer(server);
		// wire minimal handlers inline for tests mirroring production attach
		const { attachSocketHandlers } = await import('./socket_handlers');
		attachSocketHandlers(io);
		await new Promise<void>((resolve) => server.listen(0, () => resolve()));
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
	});

	it('emits server:health on connect and logs connect/disconnect', async () => {
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		await new Promise<void>((resolve, reject) => {
			const c = Client(base(), { transports: ['websocket'], timeout: 3000 });
			c.on('server:health', (p) => {
				expect(p).toEqual({ ok: true });
				c.disconnect();
			});
			c.on('disconnect', () => resolve());
			c.on('connect_error', reject);
		});
		// In test mode logs are suppressed by code; assert no spam in tests
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});

	it('room:join validates payload and assigns role', async () => {
		await new Promise<void>((resolve, reject) => {
			const c = Client(base(), { transports: ['websocket'], timeout: 3000 });
			c.on('connect', () => {
				c.emit('room:join', { roomId }, (res: any) => {
					expect(res.ok).toBe(true);
					expect(['player', 'observer']).toContain(res.role);
					c.disconnect();
				});
			});
			c.on('disconnect', () => resolve());
			c.on('connect_error', reject);
		});
	});

	it('room:join rejects invalid payload', async () => {
		await new Promise<void>((resolve, reject) => {
			const c = Client(base(), { transports: ['websocket'], timeout: 3000 });
			c.on('connect', () => {
				c.emit('room:join', {}, (res: any) => {
					expect(res).toEqual({ ok: false, error: 'invalid-payload' });
					c.disconnect();
				});
			});
			c.on('disconnect', () => resolve());
			c.on('connect_error', reject);
		});
	});

	it('move:make enforces nonce idempotency', async () => {
		await new Promise<void>((resolve, reject) => {
			const c = Client(base(), { transports: ['websocket'], timeout: 3000 });
			c.on('connect', () => {
				c.emit('room:join', { roomId }, () => {
					c.emit('move:make', { roomId, nonce: 'n1' }, (r1: any) => {
						expect(r1).toEqual({ ok: true });
						c.emit('move:make', { roomId, nonce: 'n1' }, (r2: any) => {
							expect(r2).toEqual({ ok: false, error: 'duplicate' });
							c.disconnect();
						});
					});
				});
			});
			c.on('disconnect', () => resolve());
			c.on('connect_error', reject);
		});
	});
});


