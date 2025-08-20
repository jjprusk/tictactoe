// © 2025 Joe Pruskowski
import type { Server as IOServer, Socket } from 'socket.io';
import { z } from 'zod';
import { incSocketConnections, incSocketDisconnections, observeMoveLatencySeconds } from './metrics';
import { getTracer } from './tracing';
import { randomUUID } from 'crypto';
import {
	CreateGameRequestSchema,
	CreateGameAckSchema,
	JoinGameRequestSchema,
	JoinGameAckSchema,
	LeaveGameRequestSchema,
	LeaveGameAckSchema,
	MakeMoveRequestSchema,
	Player as ContractPlayer,
} from './socket/contracts';

type Role = 'player' | 'observer';

type RoomState = {
	nonces: Set<string>;
	playerIds: Set<string>;
	playersBySocket: Map<string, ContractPlayer>;
};

const joinSchema = z.object({ roomId: z.string().min(1) });
const moveSchema = z.object({ roomId: z.string().min(1), nonce: z.string().min(1) });

type Ack = (response: { ok: boolean; [k: string]: unknown }) => void;

declare module 'socket.io' {
	interface SocketData {
		role?: Role;
	}
}

export function attachSocketHandlers(io: IOServer) {
	const roomIdToState = new Map<string, RoomState>();
	// Simple per-socket fixed-window rate limiter for tests/integration
	const rateLimit = Number(process.env.TEST_RATE_LIMIT || '0');
	const rateWindowMs = Number(process.env.TEST_RATE_WINDOW_MS || '1000');
	const socketIdToHits = new Map<string, number[]>();
	const isTest = process.env.NODE_ENV === 'test';
	const log = (...args: unknown[]) => {
		if (!isTest) {
			// eslint-disable-next-line no-console
			console.log('[socket]', ...args);
		}
	};

	function getRoomState(roomId: string): RoomState {
		let state = roomIdToState.get(roomId);
		if (!state) {
			state = { nonces: new Set<string>(), playerIds: new Set<string>(), playersBySocket: new Map<string, ContractPlayer>() };
			roomIdToState.set(roomId, state);
		}
		return state;
	}

	io.on('connection', (socket: Socket) => {
		incSocketConnections();
		log('connected', socket.id);
		socket.emit('server:health', { ok: true });

		// New contract-based events
		socket.on('create_game', (rawPayload: unknown, ack?: Ack) => {
			const parsed = CreateGameRequestSchema.safeParse(rawPayload ?? {});
			if (!parsed.success) {
				ack?.(errAck('invalid-payload'));
				return;
			}
			const gameId = `g_${randomUUID()}`;
			const state = getRoomState(gameId);
			socket.join(gameId);
			state.playerIds.add(socket.id);
			state.playersBySocket.set(socket.id, 'X');
			socket.data.role = 'player';
			ack?.(okCreateAck({ gameId, player: 'X' }));
		});

		socket.on('join_game', (rawPayload: unknown, ack?: Ack) => {
			const parsed = JoinGameRequestSchema.safeParse(rawPayload);
			if (!parsed.success) {
				ack?.(errAck('invalid-payload'));
				return;
			}
			const { gameId } = parsed.data;
			const state = getRoomState(gameId);
			socket.join(gameId);
			let role: Role = 'observer';
			let player: ContractPlayer | undefined;
			if (state.playerIds.size < 2) {
				state.playerIds.add(socket.id);
				role = 'player';
				const used = new Set(state.playersBySocket.values());
				player = used.has('X') ? 'O' : 'X';
				state.playersBySocket.set(socket.id, player);
			}
			socket.data.role = role;
			ack?.(okJoinAck({ role, player }));
		});

		socket.on('leave_game', (rawPayload: unknown, ack?: Ack) => {
			const parsed = LeaveGameRequestSchema.safeParse(rawPayload);
			if (!parsed.success) {
				ack?.(errAck('invalid-payload'));
				return;
			}
			const { gameId } = parsed.data;
			const state = getRoomState(gameId);
			socket.leave(gameId);
			state.playerIds.delete(socket.id);
			state.playersBySocket.delete(socket.id);
			ack?.(okAck());
		});

		socket.on('make_move', (rawPayload: unknown, ack?: Ack) => {
			const tracer = getTracer();
			const span = tracer.startSpan('socket.make_move');
			const start = process.hrtime.bigint();
			// Backpressure: optional test-mode rate limit per socket
			if (rateLimit > 0) {
				const now = Date.now();
				const hits = socketIdToHits.get(socket.id) ?? [];
				const pruned = hits.filter((t) => now - t < rateWindowMs);
				if (pruned.length >= rateLimit) {
					ack?.(errAck('rate-limit'));
					return;
				}
				pruned.push(now);
				socketIdToHits.set(socket.id, pruned);
			}
			const parsed = MakeMoveRequestSchema.safeParse(rawPayload);
			if (!parsed.success) {
				ack?.(errAck('invalid-payload'));
				const end = process.hrtime.bigint();
				observeMoveLatencySeconds('error', Number(end - start) / 1e9);
				span.setAttribute('error', true);
				span.setAttribute('error.kind', 'invalid-payload');
				span.end();
				return;
			}
			const { gameId, nonce } = parsed.data as z.infer<typeof MakeMoveRequestSchema>;
			const state = getRoomState(gameId);
			if (state.nonces.has(nonce)) {
				ack?.(errAck('duplicate'));
				const end = process.hrtime.bigint();
				observeMoveLatencySeconds('error', Number(end - start) / 1e9);
				span.setAttribute('error', true);
				span.setAttribute('error.kind', 'duplicate');
				span.end();
				return;
			}
			state.nonces.add(nonce);
			ack?.(okAck());
			const end = process.hrtime.bigint();
			observeMoveLatencySeconds('ok', Number(end - start) / 1e9);
			span.end();
		});

		// Legacy/test routes retained for existing tests
		socket.on('room:join', (rawPayload: unknown, ack?: Ack) => {
			const parsed = joinSchema.safeParse(rawPayload);
			if (!parsed.success) {
				ack?.({ ok: false, error: 'invalid-payload' });
				return;
			}
			const { roomId } = parsed.data;
			const state = getRoomState(roomId);
			socket.join(roomId);
			let role: Role = 'observer';
			if (state.playerIds.size < 2) {
				state.playerIds.add(socket.id);
				role = 'player';
			}
			socket.data.role = role;
			ack?.({ ok: true, role, players: state.playerIds.size });
		});

		socket.on('room:leave', (rawPayload: unknown, ack?: Ack) => {
			const parsed = joinSchema.safeParse(rawPayload);
			if (!parsed.success) {
				ack?.({ ok: false, error: 'invalid-payload' });
				return;
			}
			const { roomId } = parsed.data;
			const state = getRoomState(roomId);
			socket.leave(roomId);
			state.playerIds.delete(socket.id);
			ack?.({ ok: true });
		});

		socket.on('room:upgrade', (rawPayload: unknown, ack?: Ack) => {
			const parsed = joinSchema.safeParse(rawPayload);
			if (!parsed.success) {
				ack?.({ ok: false, error: 'invalid-payload' });
				return;
			}
			const { roomId } = parsed.data;
			const state = getRoomState(roomId);
			let role: Role = 'observer';
			if (state.playerIds.size < 2) {
				state.playerIds.add(socket.id);
				role = 'player';
			}
			socket.data.role = role;
			ack?.({ ok: true, role, players: state.playerIds.size });
		});

		socket.on('move:make', (rawPayload: unknown, ack?: Ack) => {
			const tracer = getTracer();
			const span = tracer.startSpan('socket.move_make');
			const start = process.hrtime.bigint();
			// Backpressure: optional test-mode rate limit per socket
			if (rateLimit > 0) {
				const now = Date.now();
				const hits = socketIdToHits.get(socket.id) ?? [];
				const pruned = hits.filter((t) => now - t < rateWindowMs);
				if (pruned.length >= rateLimit) {
					ack?.({ ok: false, error: 'rate-limit' });
					return;
				}
				pruned.push(now);
				socketIdToHits.set(socket.id, pruned);
			}
			const parsed = moveSchema.extend({ delayMs: z.number().int().nonnegative().optional() }).safeParse(rawPayload);
			if (!parsed.success) {
				ack?.({ ok: false, error: 'invalid-payload' });
				const end = process.hrtime.bigint();
				observeMoveLatencySeconds('error', Number(end - start) / 1e9);
				span.setAttribute('error', true);
				span.setAttribute('error.kind', 'invalid-payload');
				span.end();
				return;
			}
			const { roomId, nonce, delayMs } = parsed.data as { roomId: string; nonce: string; delayMs?: number };
			const state = getRoomState(roomId);
			if (state.nonces.has(nonce)) {
				ack?.({ ok: false, error: 'duplicate' });
				const end = process.hrtime.bigint();
				observeMoveLatencySeconds('error', Number(end - start) / 1e9);
				span.setAttribute('error', true);
				span.setAttribute('error.kind', 'duplicate');
				span.end();
				return;
			}
			state.nonces.add(nonce);
			const doAck = () => {
				ack?.({ ok: true });
				const end = process.hrtime.bigint();
				observeMoveLatencySeconds('ok', Number(end - start) / 1e9);
				span.end();
			};
			if (isTest && typeof delayMs === 'number' && delayMs > 0) {
				setTimeout(doAck, delayMs);
			} else {
				doAck();
			}
		});

		socket.on('disconnect', () => {
			// Cleanup from all room states
			for (const [, state] of roomIdToState) {
				state.playerIds.delete(socket.id);
				state.playersBySocket.delete(socket.id);
			}
			log('disconnected', socket.id);
			incSocketDisconnections();
		});
	});
}

function okAck(): z.infer<typeof LeaveGameAckSchema> {
	return { ok: true } as const;
}
function errAck(error: string): z.infer<typeof LeaveGameAckSchema> {
	return { ok: false, error } as const;
}
function okCreateAck(args: { gameId: string; player: ContractPlayer }): z.infer<typeof CreateGameAckSchema> {
	return { ok: true, gameId: args.gameId, player: args.player } as const;
}
function okJoinAck(args: { role: Role; player?: ContractPlayer }): z.infer<typeof JoinGameAckSchema> {
	return { ok: true, role: args.role, player: args.player } as const;
}


