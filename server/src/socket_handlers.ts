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
  OkListGamesAckSchema,
  type CreateGameRequest,
  ResetGameRequestSchema,
} from './socket/contracts';
import type { Board, Strategy } from './game/types';
import { applyMove, nextPlayer, checkWin, checkDraw } from './game/rules';
import { appConfig } from './config/env';
import { makeMove as orchestrateMove, normalizeStrategy } from './ai/orchestrator';
import { bus } from './bus';

type Role = 'player' | 'observer' | 'admin';

type RoomState = {
	nonces: Set<string>;
	playerIds: Set<string>;
	playersBySocket: Map<string, ContractPlayer>;
	// session token -> socketId mapping for rejoin
	sessions?: Map<string, string>;
  // game state
  board?: Board;
  currentPlayer?: ContractPlayer;
  strategy?: Strategy;
  // last time anything happened in this room (ms since epoch)
  lastActiveAt?: number;
  // whether game completed (win/draw)
  completed?: boolean;
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

  // Propagate admin log-level changes to connected clients
  bus.on('log-level-changed', (level) => {
    try {
      io.emit('admin:log-level', { level });
    } catch {
      // ignore
    }
  });

	function getRoomState(roomId: string): RoomState {
		let state = roomIdToState.get(roomId);
		if (!state) {
			state = { nonces: new Set<string>(), playerIds: new Set<string>(), playersBySocket: new Map<string, ContractPlayer>(), sessions: new Map<string, string>(), lastActiveAt: Date.now() };
			roomIdToState.set(roomId, state);
		}
		return state;
	}

	function leaveOtherGameRooms(socket: Socket, keepGameId?: string): void {
		for (const gameId of roomIdToState.keys()) {
			if (keepGameId && gameId === keepGameId) continue;
			const room = io.sockets.adapter.rooms.get(gameId);
			if (room && room.has(socket.id)) {
				socket.leave(gameId);
				const state = roomIdToState.get(gameId);
				if (state) {
					state.playerIds.delete(socket.id);
					state.playersBySocket.delete(socket.id);
				}
			}
		}
		pruneInactiveRooms();
	}

	function touchRoom(gameId: string): void {
		const s = roomIdToState.get(gameId);
		if (s) s.lastActiveAt = Date.now();
	}

	const roomTtlMs = Number(process.env.GAME_TTL_MS || '120000'); // 2 minutes default

	function pruneInactiveRooms(): void {
		const now = Date.now();
		for (const gameId of Array.from(activeGameIds.values())) {
			const room = io.sockets.adapter.rooms.get(gameId);
			const members = room?.size ?? 0;
			const state = roomIdToState.get(gameId);
			const last = state?.lastActiveAt ?? 0;
			// Only expire when room is empty and beyond TTL
			if (members === 0 && now - last > roomTtlMs) {
				roomIdToState.delete(gameId);
				activeGameIds.delete(gameId);
			}
		}
	}

	// Periodic sweep in development/production; tests rely on explicit pruning hooks
	if (!isTest) {
		setInterval(pruneInactiveRooms, Math.min(Math.max(roomTtlMs / 4, 5000), 60000));
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
			// Move socket exclusively to this new room
			leaveOtherGameRooms(socket, gameId);
			socket.join(gameId);
			state.playerIds.add(socket.id);
			socket.data.role = 'player';
      // initialize game state; starting player is always 'X'
      state.board = Array.from({ length: 9 }, () => null) as Board;
      state.currentPlayer = 'X';
      const req = parsed.data as CreateGameRequest & { aiStarts?: boolean; startMode?: 'ai' | 'human' | 'alternate' };
      const normalizedStrategy = normalizeStrategy(req.strategy ?? appConfig.AI_STRATEGY);
      state.strategy = normalizedStrategy as Strategy;
      // Determine who starts (AI vs Human). X always moves first.
      let effectiveAiStarts: boolean;
      if (req.startMode === 'ai') effectiveAiStarts = true;
      else if (req.startMode === 'human') effectiveAiStarts = false;
      else if (req.startMode === 'alternate') {
        const key = '__ttt_alt_start_human__';
        const g = globalThis as unknown as Record<string, boolean | undefined>;
        const prevHumanStarts = g[key];
        const currentHumanStarts = typeof prevHumanStarts === 'boolean' ? !prevHumanStarts : true; // default first to human
        g[key] = currentHumanStarts;
        effectiveAiStarts = !currentHumanStarts;
      } else {
        effectiveAiStarts = !!req.aiStarts; // back-compat
      }
      // If AI starts, host gets 'O'; otherwise host gets 'X'
      const hostPlayer: ContractPlayer = effectiveAiStarts ? 'O' : 'X';
      state.playersBySocket.set(socket.id, hostPlayer);
			// create session token for host
			const token = `s_${randomUUID()}`;
			state.sessions?.set(token, socket.id);
			activeGameIds.add(gameId);
			touchRoom(gameId);
			ack?.(okCreateAck({ gameId, player: hostPlayer, sessionToken: token, currentPlayer: state.currentPlayer! }));
			try { io.emit('lobby:update'); } catch (_e) { /* noop: broadcast best-effort */ }
      // If AI starts, trigger immediate AI opening move
      if (effectiveAiStarts) {
        (async () => {
          try {
            const assigned = new Set(state.playersBySocket.values());
            // AI controls X when host is O
            const aiControlsX = assigned.has('O') && !assigned.has('X');
            if (aiControlsX && state.currentPlayer === 'X') {
              const aiPos = await orchestrateMove(state.board!, state.currentPlayer!, state.strategy ?? 'ai0');
              if (aiPos >= 0 && state.board![aiPos] === null) {
                const aiPlayer = state.currentPlayer!;
                state.board = applyMove(state.board!, aiPos, aiPlayer) as Board;
                const winner = checkWin(state.board) as ContractPlayer | null;
                const aiDraw = winner ? false : checkDraw(state.board);
                state.currentPlayer = winner || aiDraw ? state.currentPlayer : nextPlayer(aiPlayer) as ContractPlayer;
                io.to(gameId).emit('game_state', { gameId, board: state.board, currentPlayer: state.currentPlayer!, lastMove: aiPos, winner: winner ?? undefined, draw: aiDraw || undefined });
              }
            }
          } catch (e) {
            // ignore
          }
        })();
      }
		});

		socket.on('join_game', (rawPayload: unknown, ack?: Ack) => {
			const parsed = JoinGameRequestSchema.safeParse(rawPayload);
			if (!parsed.success) {
				ack?.(errAck('invalid-payload'));
				return;
			}
			const { gameId, sessionToken, asObserver } = parsed.data as { gameId: string; sessionToken?: string; asObserver?: boolean };
			const state = getRoomState(gameId);
			// Move socket exclusively to target room
			leaveOtherGameRooms(socket, gameId);
			socket.join(gameId);
			let role: Role = 'observer';
			const beforePlayers = state.playerIds.size;
			let player: ContractPlayer | undefined;
			if (sessionToken && state.sessions?.has(sessionToken)) {
				// resume prior session as player
				role = 'player';
				player = state.playersBySocket.get(state.sessions.get(sessionToken)!) ?? 'X';
				state.playerIds.add(socket.id);
				state.playersBySocket.set(socket.id, player);
				state.sessions?.set(sessionToken, socket.id);
			} else if (!asObserver && state.playerIds.size < 2) {
				state.playerIds.add(socket.id);
				role = 'player';
				const used = new Set(state.playersBySocket.values());
				player = used.has('X') ? 'O' : 'X';
				state.playersBySocket.set(socket.id, player);
			}
			socket.data.role = role;
			const token = sessionToken ?? (role === 'player' ? `s_${randomUUID()}` : undefined);
			if (token && role === 'player') state.sessions?.set(token, socket.id);
			touchRoom(gameId);
			ack?.(okJoinAck({ role, player, sessionToken: token }));
			// If this join fills the second human seat, reset the game for fair H2H and notify room
			try {
				if (role === 'player' && beforePlayers < 2 && state.playerIds.size >= 2) {
					// Reset board and turn
					state.nonces = new Set<string>();
					state.board = Array.from({ length: 9 }, () => null) as Board;
					state.currentPlayer = 'X';
					state.completed = false;
					io.to(gameId).emit('game_state', { gameId, board: state.board, currentPlayer: state.currentPlayer! });
					io.to(gameId).emit('room:notice', { message: 'A player joined. Game reset to head-to-head.' });
					io.to(gameId).emit('room:mode', { h2h: true });
				}
			} catch (_e) { /* noop */ }
			try { io.emit('lobby:update'); } catch (_e) { /* noop */ }
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
			try { io.emit('lobby:update'); } catch (_e) { /* noop */ }
			// If room is now empty, prune it from active list
			pruneInactiveRooms();
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
			pruneInactiveRooms();
			const items = Array.from(activeGameIds.values())
				.map((id) => {
					const state = roomIdToState.get(id);
					const room = io.sockets.adapter.rooms.get(id);
					if (!state) return null;
					let observerCount = 0;
					if (room) {
						for (const sid of room) {
							if (!state.playerIds.has(sid)) observerCount += 1;
						}
					}
					const assigned = new Set(state.playersBySocket.values());
					const hasX = assigned.has('X');
					const hasO = assigned.has('O');
					const status = state.completed ? 'complete' : hasX && hasO ? 'in_progress' : 'waiting';
					const lastActiveAt = state.lastActiveAt ?? Date.now();
					return { gameId: id, hasX, hasO, observerCount, status, lastActiveAt };
				})
				.filter((v): v is NonNullable<typeof v> => !!v)
				.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
			const ackPayload = OkListGamesAckSchema.parse({ ok: true, games: items });
			ack?.(ackPayload);
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
			try { io.emit('lobby:update'); } catch (_e) { /* noop */ }
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
			pruneInactiveRooms();
			const items = Array.from(activeGameIds.values())
				.map((id) => {
					const state = roomIdToState.get(id);
					const room = io.sockets.adapter.rooms.get(id);
					const members = room?.size ?? 0;
					if (!state || members === 0) return null;
					let observerCount = 0;
					if (room) {
						for (const sid of room) {
							if (!state.playerIds.has(sid)) observerCount += 1;
						}
					}
					const assigned = new Set(state.playersBySocket.values());
					const hasX = assigned.has('X');
					const hasO = assigned.has('O');
					const status = state.completed ? 'complete' : hasX && hasO ? 'in_progress' : 'waiting';
					const lastActiveAt = state.lastActiveAt ?? Date.now();
					return { gameId: id, hasX, hasO, observerCount, status, lastActiveAt };
				})
				.filter((v): v is NonNullable<typeof v> => !!v)
				.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
			const ackPayload = OkListGamesAckSchema.parse({ ok: true, games: items });
			ack?.(ackPayload);
		});

		// Reset game: clear board, starting player is always 'X', possibly trigger AI opening move
		socket.on('reset_game', async (rawPayload: unknown, ack?: Ack) => {
			const parsed = ResetGameRequestSchema.safeParse(rawPayload);
			if (!parsed.success) {
				ack?.(errAck('invalid-payload'));
				return;
			}
			const { gameId } = parsed.data as { gameId: string };
			const state = getRoomState(gameId);
			// Reset nonces and board
			state.nonces = new Set<string>();
			state.board = Array.from({ length: 9 }, () => null) as Board;
			state.currentPlayer = 'X';
			ack?.(okAck());
			// Emit cleared state first
			io.to(gameId).emit('game_state', { gameId, board: state.board, currentPlayer: state.currentPlayer! });
			try { io.emit('lobby:update'); } catch (_e) { /* noop */ }
			touchRoom(gameId);
			// If AI should start, make an immediate move (using current configured strategy)
			try {
				const assigned = new Set(state.playersBySocket.values());
				const aiPlayers: ContractPlayer[] = (['X', 'O'] as const).filter((p) => !assigned.has(p)) as ContractPlayer[];
				if (aiPlayers.includes(state.currentPlayer!)) {
					const aiPos = await orchestrateMove(state.board, state.currentPlayer!, state.strategy ?? 'ai0');
					if (aiPos >= 0 && state.board[aiPos] === null) {
						const aiPlayer = state.currentPlayer!;
						state.board = applyMove(state.board, aiPos, aiPlayer) as Board;
						const winner = checkWin(state.board) as ContractPlayer | null;
						const aiDraw = winner ? false : checkDraw(state.board);
						state.currentPlayer = winner || aiDraw ? state.currentPlayer : nextPlayer(aiPlayer) as ContractPlayer;
						io.to(gameId).emit('game_state', { gameId, board: state.board, currentPlayer: state.currentPlayer!, lastMove: aiPos, winner: winner ?? undefined, draw: aiDraw || undefined });
					}
				}
			} catch {
				// ignore AI errors on reset
			}
		});

		socket.on('make_move', async (rawPayload: unknown, ack?: Ack) => {
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
			const { gameId, nonce, position, player } = parsed.data as z.infer<typeof MakeMoveRequestSchema>;
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
			try {
				// Apply player move
				if (!state.board) state.board = Array.from({ length: 9 }, () => null) as Board;
				if (!state.currentPlayer) state.currentPlayer = 'X';
				const legalCellEmpty = state.board[position] === null;
				if (!legalCellEmpty || state.currentPlayer !== player) {
					ack?.(errAck('invalid-move'));
					const end = process.hrtime.bigint();
					observeMoveLatencySeconds('error', Number(end - start) / 1e9);
					span.setAttribute('error', true);
					span.setAttribute('error.kind', 'invalid-move');
					span.end();
					return;
				}
				state.board = applyMove(state.board, position, player) as Board;
				let winner = checkWin(state.board) as ContractPlayer | null;
				const draw = winner ? false : checkDraw(state.board);
				state.currentPlayer = winner || draw ? state.currentPlayer : nextPlayer(player) as ContractPlayer;
				if (winner || draw) state.completed = true;
				io.to(gameId).emit('game_state', { gameId, board: state.board, currentPlayer: state.currentPlayer!, lastMove: position, winner: winner ?? undefined, draw: draw || undefined });
				ack?.(okAck());
				// Trigger AI move if applicable based on current configured strategy
				if (!winner && !draw) {
					// Determine if next player is AI-controlled (no human assigned for that letter)
					const assigned = new Set(state.playersBySocket.values());
					const aiPlayers: ContractPlayer[] = (['X', 'O'] as const).filter((p) => !assigned.has(p)) as ContractPlayer[];
					if (aiPlayers.includes(state.currentPlayer!)) {
						const aiPos = await orchestrateMove(state.board, state.currentPlayer!, state.strategy ?? 'ai0');
						if (aiPos >= 0 && state.board[aiPos] === null) {
							const aiPlayer = state.currentPlayer!;
							state.board = applyMove(state.board, aiPos, aiPlayer) as Board;
							winner = checkWin(state.board) as ContractPlayer | null;
							const aiDraw = winner ? false : checkDraw(state.board);
							state.currentPlayer = winner || aiDraw ? state.currentPlayer : nextPlayer(aiPlayer) as ContractPlayer;
							if (winner || aiDraw) state.completed = true;
							io.to(gameId).emit('game_state', { gameId, board: state.board, currentPlayer: state.currentPlayer!, lastMove: aiPos, winner: winner ?? undefined, draw: aiDraw || undefined });
						}
					}
				}
				const end = process.hrtime.bigint();
				observeMoveLatencySeconds('ok', Number(end - start) / 1e9);
				span.end();
				touchRoom(gameId);
			} catch {
				ack?.(errAck('error'));
				const end = process.hrtime.bigint();
				observeMoveLatencySeconds('error', Number(end - start) / 1e9);
				span.setAttribute('error', true);
				span.end();
			}
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
			// Prune any rooms that no longer have members
			pruneInactiveRooms();
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
function okCreateAck(args: { gameId: string; player: ContractPlayer; sessionToken?: string; currentPlayer: ContractPlayer }): z.infer<typeof CreateGameAckSchema> {
	const base: { ok: true; gameId: string; player: ContractPlayer; sessionToken?: string; currentPlayer: ContractPlayer } = { ok: true, gameId: args.gameId, player: args.player, currentPlayer: args.currentPlayer };
	if (args.sessionToken) base.sessionToken = args.sessionToken;
	return base;
}
function okJoinAck(args: { role: Role; player?: ContractPlayer; sessionToken?: string }): z.infer<typeof JoinGameAckSchema> {
	const base: { ok: true; role: Role; player?: ContractPlayer; sessionToken?: string } = { ok: true, role: args.role };
	if (args.player) base.player = args.player;
	if (args.sessionToken) base.sessionToken = args.sessionToken;
	return base;
}


