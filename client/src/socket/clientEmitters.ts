// © 2025 Joe Pruskowski
import { socketService } from './socketService';
import { generateNonce } from './nonce';
import {
  CreateGameRequestSchema,
  CreateGameAckSchema,
  JoinGameRequestSchema,
  JoinGameAckSchema,
  LeaveGameRequestSchema,
  LeaveGameAckSchema,
  MakeMoveRequestSchema,
  MakeMoveAckSchema,
  type CreateGameRequest,
  type CreateGameAck,
  type JoinGameRequest,
  type JoinGameAck,
  type LeaveGameRequest,
  type LeaveGameAck,
  type MakeMoveRequest,
  type MakeMoveAck,
  type ListGamesRequest,
  type ListGamesAck,
  ListGamesRequestSchema,
  ListGamesAckSchema,
} from './contracts';
import { getStoredStrategy } from '../utils/clientLogger';

async function emitWithAck<TReq, TAck>(event: string, req: TReq, timeoutMs?: number): Promise<TAck> {
  const defaultTimeout = Number((import.meta as any)?.env?.VITE_SOCKET_ACK_TIMEOUT_MS ?? 800);
  const ms = typeof timeoutMs === 'number' ? timeoutMs : defaultTimeout;
  return new Promise((resolve, reject) => {
    let settled = false;
    const sock = socketService.connect();
    const timer = (globalThis as any).setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('ack-timeout'));
      }
    }, ms);
    sock.emit(event, req, (ack: TAck) => {
      if (!settled) {
        settled = true;
        (globalThis as any).clearTimeout(timer);
        resolve(ack);
      }
    });
  });
}

export async function createGame(req: CreateGameRequest, timeoutMs?: number): Promise<CreateGameAck> {
  const withDefault = typeof (req as any)?.strategy === 'undefined' ? { ...req, strategy: getStoredStrategy() } : req;
  const parsedReq = CreateGameRequestSchema.parse(withDefault);
  const ack = await emitWithAck<CreateGameRequest, CreateGameAck>('create_game', parsedReq, timeoutMs);
  return CreateGameAckSchema.parse(ack);
}

export async function joinGame(req: JoinGameRequest, timeoutMs?: number): Promise<JoinGameAck> {
  const parsedReq = JoinGameRequestSchema.parse(req);
  const ack = await emitWithAck<JoinGameRequest, JoinGameAck>('join_game', parsedReq, timeoutMs);
  return JoinGameAckSchema.parse(ack);
}

export async function leaveGame(req: LeaveGameRequest, timeoutMs?: number): Promise<LeaveGameAck> {
  const parsedReq = LeaveGameRequestSchema.parse(req);
  const ack = await emitWithAck<LeaveGameRequest, LeaveGameAck>('leave_game', parsedReq, timeoutMs);
  return LeaveGameAckSchema.parse(ack);
}

export async function makeMove(req: MakeMoveRequest, timeoutMs?: number): Promise<MakeMoveAck> {
  const withNonce = { ...req, nonce: req.nonce ?? generateNonce() } as MakeMoveRequest;
  const parsedReq = MakeMoveRequestSchema.parse(withNonce);
  const ack = await emitWithAck<MakeMoveRequest, MakeMoveAck>('make_move', parsedReq, timeoutMs);
  return MakeMoveAckSchema.parse(ack);
}

export async function listGames(req: ListGamesRequest = {}, timeoutMs?: number): Promise<ListGamesAck> {
  const parsedReq = ListGamesRequestSchema.parse(req);
  const ack = await emitWithAck<ListGamesRequest, ListGamesAck>('list_games', parsedReq, timeoutMs);
  return ListGamesAckSchema.parse(ack);
}


