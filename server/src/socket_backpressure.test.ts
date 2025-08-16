// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import { io as Client } from 'socket.io-client';
import { buildHttpServer, buildIoServer } from './bootstrap';
import { attachSocketHandlers } from './socket_handlers';

async function startServerWithEnv(env: Record<string, string>) {
	const old: Record<string, string | undefined> = {};
	for (const k of Object.keys(env)) {
		old[k] = process.env[k];
		process.env[k] = env[k];
	}
	const server = buildHttpServer();
	const io = buildIoServer(server, {});
	attachSocketHandlers(io);
	await new Promise<void>((resolve) => server.listen(0, () => resolve()));
	const port = (server.address() as any).port as number;
	return { server, url: `http://localhost:${port}`, restore: () => Object.keys(env).forEach((k) => (process.env[k] = old[k])) };
}

describe('backpressure/rate limit', () => {
	it('throttles bursts with error acks and remains responsive', async () => {
		const { server, url, restore } = await startServerWithEnv({ TEST_RATE_LIMIT: '5', TEST_RATE_WINDOW_MS: '500' });
		const c = Client(url, { transports: ['websocket'] });
		await new Promise<void>((resolve) => c.on('connect', () => resolve()));
		await new Promise<void>((resolve, reject) => c.emit('room:join', { roomId: 'bp' }, (res: any) => (res.ok ? resolve() : reject(new Error('join failed')))));

		const results: any[] = await Promise.all(
			Array.from({ length: 10 }, (_, i) => new Promise((resolve) => c.emit('move:make', { roomId: 'bp', nonce: `n${i}` }, (r: any) => resolve(r))))
		);
		const oks = results.filter((r) => r.ok === true).length;
		const throttled = results.filter((r) => r.error === 'rate-limit').length;
		expect(oks).toBeGreaterThan(0);
		expect(throttled).toBeGreaterThan(0);

		// After window passes, requests should succeed again
		await new Promise<void>((resolve) => setTimeout(() => resolve(), 600));
		const again: any = await new Promise((resolve) => c.emit('move:make', { roomId: 'bp', nonce: 'last' }, (r: any) => resolve(r)));
		expect(again).toEqual({ ok: true });

		c.disconnect();
		await new Promise<void>((resolve) => server.close(() => resolve()));
		restore();
	});
});


