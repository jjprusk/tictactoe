// © 2025 Joe Pruskowski
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as Client, Socket } from 'socket.io-client';
import { buildHttpServer, buildIoServer } from './bootstrap';
import { attachSocketHandlers } from './socket_handlers';

function ack<T = any>(s: Socket, event: string, payload: any, timeout = 500): Promise<T> {
	return new Promise((resolve, reject) => {
		const t = setTimeout(() => reject(new Error('timeout')), timeout);
		s.emit(event, payload, (res: any) => {
			clearTimeout(t);
			resolve(res);
		});
	});
}

describe('rooms/limits/leave', () => {
	let server: ReturnType<typeof buildHttpServer>;
	let url: string;

	beforeAll(async () => {
		server = buildHttpServer();
		const io = buildIoServer(server);
		attachSocketHandlers(io);
		await new Promise<void>((resolve) => server.listen(0, () => resolve()));
		const addr = server.address();
		const port = typeof addr === 'object' && addr ? addr.port : 0;
		url = `http://localhost:${port}`;
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
	});

	it('leave semantics: player leaves, observer upgrades to player', async () => {
		const p1 = Client(url, { transports: ['websocket'] });
		const p2 = Client(url, { transports: ['websocket'] });
		const obs = Client(url, { transports: ['websocket'] });
		await Promise.all([
			new Promise<void>((resolve) => p1.on('connect', () => resolve())),
			new Promise<void>((resolve) => p2.on('connect', () => resolve())),
			new Promise<void>((resolve) => obs.on('connect', () => resolve())),
		]);

		const r1: any = await ack(p1, 'room:join', { roomId: 'room' });
		const r2: any = await ack(p2, 'room:join', { roomId: 'room' });
		const ro: any = await ack(obs, 'room:join', { roomId: 'room' });
		expect(r1.role).toBe('player');
		expect(r2.role).toBe('player');
		expect(ro.role).toBe('observer');

		// player leaves
		await ack(p1, 'room:leave', { roomId: 'room' });
		// observer upgrades
		const up: any = await ack(obs, 'room:upgrade', { roomId: 'room' });
		expect(up.ok).toBe(true);
		expect(up.role).toBe('player');

		p1.disconnect();
		p2.disconnect();
		obs.disconnect();
	});
});


