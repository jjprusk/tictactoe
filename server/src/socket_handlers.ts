// © 2025 Joe Pruskowski
import type { Server as IOServer, Socket } from 'socket.io';
import { z } from 'zod';
import { incSocketConnections, incSocketDisconnections, observeMoveLatencySeconds } from './metrics';
import { getTracer } from './tracing';
import { randomUUID } from 'crypto';
import { generateMountainGameId } from './ids/mountain_names';
import { emitStandardError, ErrorCodes } from './socket/errors';
import {
	CreateGameRequestSchema,
	CreateGameAckSchema,
	JoinGameRequestSchema,
	JoinGameAckSchema,
	LeaveGameRequestSchema,
	LeaveGameAckSchema,
	MakeMoveRequestSchema,
	Player as ContractPlayer,
	ElevateAdminRequestSchema,
	AdminListGamesRequestSchema,
	AdminCloseGameRequestSchema,
	AdminRoomInfoRequestSchema,
  ListGamesRequestSchema,
} from './socket/contracts';

type Role = 'player' | 'observer' | 'admin';

type RoomState = {
	nonces: Set<string>;
	playerIds: Set<string>;
	playersBySocket: Map<string, ContractPlayer>;
	// session token -> socketId mapping for rejoin
	sessions?: Map<string, string>;
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
	const activeGameIds = new Set<string>();
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
			state = { nonces: new Set<string>(), playerIds: new Set<string>(), playersBySocket: new Map<string, ContractPlayer>(), sessions: new Map<string, string>() };
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
			const gameId = generateMountainGameId((id) => roomIdToState.has(id));
			const state = getRoomState(gameId);
			socket.join(gameId);
			state.playerIds.add(socket.id);
			state.playersBySocket.set(socket.id, 'X');
			socket.data.role = 'player';
			// create session token for host
			const token = `s_${randomUUID()}`;
			state.sessions?.set(token, socket.id);
			activeGameIds.add(gameId);
			ack?.(okCreateAck({ gameId, player: 'X', sessionToken: token }));
		});

		socket.on('join_game', (rawPayload: unknown, ack?: Ack) => {
			const parsed = JoinGameRequestSchema.safeParse(rawPayload);
			if (!parsed.success) {
				ack?.(errAck('invalid-payload'));
				return;
			}
			const { gameId, sessionToken } = parsed.data as { gameId: string; sessionToken?: string };
			const state = getRoomState(gameId);
			socket.join(gameId);
			let role: Role = 'observer';
			let player: ContractPlayer | undefined;
			if (sessionToken && state.sessions?.has(sessionToken)) {
				// resume prior session as player
				role = 'player';
				player = state.playersBySocket.get(state.sessions.get(sessionToken)!) ?? 'X';
				state.playerIds.add(socket.id);
				state.playersBySocket.set(socket.id, player);
				state.sessions?.set(sessionToken, socket.id);
			} else if (state.playerIds.size < 2) {
				state.playerIds.add(socket.id);
				role = 'player';
				const used = new Set(state.playersBySocket.values());
				player = used.has('X') ? 'O' : 'X';
				state.playersBySocket.set(socket.id, player);
			}
			socket.data.role = role;
			const token = sessionToken ?? (role === 'player' ? `s_${randomUUID()}` : undefined);
			if (token && role === 'player') state.sessions?.set(token, socket.id);
			ack?.(okJoinAck({ role, player, sessionToken: token }));
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

		// Admin: elevate to admin (simple shared key auth for now)
		socket.on('elevate_admin', (rawPayload: unknown, ack?: Ack) => {
			const parsed = ElevateAdminRequestSchema.safeParse(rawPayload);
			if (!parsed.success) {
				ack?.(errAck('invalid-payload'));
				return;
			}
			const { adminKey } = parsed.data;
			const expected = process.env.ADMIN_KEY || 'dev-admin-key';
			if (adminKey !== expected) {
				ack?.(errAck('unauthorized'));
				return;
			}
			socket.data.role = 'admin';
			ack?.({ ok: true, role: 'admin' });
		});

		// Admin: list active games
		socket.on('admin:list_games', (rawPayload: unknown, ack?: Ack) => {
			const parsed = AdminListGamesRequestSchema.safeParse(rawPayload ?? {});
			if (!parsed.success) {
				ack?.(errAck('invalid-payload'));
				return;
			}
			if (socket.data.role !== 'admin') {
				ack?.(errAck('forbidden'));
				return;
			}
			ack?.({ ok: true, games: Array.from(activeGameIds.values()) });
		});

		// Admin: close a game room
		socket.on('admin:close_game', (rawPayload: unknown, ack?: Ack) => {
			const parsed = AdminCloseGameRequestSchema.safeParse(rawPayload);
			if (!parsed.success) {
				ack?.(errAck('invalid-payload'));
				return;
			}
			if (socket.data.role !== 'admin') {
				ack?.(errAck('forbidden'));
				return;
			}
			const { gameId } = parsed.data;
			const room = io.sockets.adapter.rooms.get(gameId);
			if (room) {
				for (const sid of room) {
					const s = io.sockets.sockets.get(sid);
					s?.leave(gameId);
					if (s) emitStandardError(s, ErrorCodes.GameClosed);
				}
			}
			roomIdToState.delete(gameId);
			activeGameIds.delete(gameId);
			ack?.(okAck());
		});

		// Admin: room info (membership and roles)
		socket.on('admin:room_info', (rawPayload: unknown, ack?: Ack) => {
			const parsed = AdminRoomInfoRequestSchema.safeParse(rawPayload);
			if (!parsed.success) {
				ack?.(errAck('invalid-payload'));
				return;
			}
			if (socket.data.role !== 'admin') {
				ack?.(errAck('forbidden'));
				return;
			}
			const { gameId } = parsed.data;
			const state = roomIdToState.get(gameId);
			if (!state) {
				ack?.(errAck('not-found'));
				return;
			}
			let playerCount = 0;
			let observerCount = 0;
			const players: { socketId: string; player: ContractPlayer }[] = [];
			for (const sid of state.playerIds) {
				const p = state.playersBySocket.get(sid);
				if (p === 'X' || p === 'O') {
					playerCount += 1;
					players.push({ socketId: sid, player: p });
				}
			}
			// Observers are members of room minus playerIds
			const room = io.sockets.adapter.rooms.get(gameId);
			if (room) {
				for (const sid of room) {
					if (!state.playerIds.has(sid)) observerCount += 1;
				}
			}
			ack?.({ ok: true, gameId, playerCount, observerCount, players });
		});

		// Public: list games (no auth)
		socket.on('list_games', (rawPayload: unknown, ack?: Ack) => {
			const parsed = ListGamesRequestSchema.safeParse(rawPayload ?? {});
			if (!parsed.success) {
				ack?.(errAck('invalid-payload'));
				return;
			}
			ack?.({ ok: true, games: Array.from(activeGameIds.values()) });
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
function okCreateAck(args: { gameId: string; player: ContractPlayer; sessionToken?: string }): z.infer<typeof CreateGameAckSchema> {
	const base: { ok: true; gameId: string; player: ContractPlayer; sessionToken?: string } = { ok: true, gameId: args.gameId, player: args.player };
	if (args.sessionToken) base.sessionToken = args.sessionToken;
	return base;
}
function okJoinAck(args: { role: Role; player?: ContractPlayer; sessionToken?: string }): z.infer<typeof JoinGameAckSchema> {
	const base: { ok: true; role: Role; player?: ContractPlayer; sessionToken?: string } = { ok: true, role: args.role };
	if (args.player) base.player = args.player;
	if (args.sessionToken) base.sessionToken = args.sessionToken;
	return base;
}


