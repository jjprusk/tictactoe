// © 2025 Joe Pruskowski

/**
 * Canonical Redis key builders for live game state and related data.
 * These helpers centralize prefixes to avoid collisions and ease refactors.
 */

const ns = {
  game: 'game',
  room: 'room',
  nonce: 'nonce',
  session: 'session',
  rate: 'rate',
  lock: 'lock',
} as const;

function assertNonEmpty(value: string, label: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

// Game-scoped keys
export function keyGameState(gameId: string): string {
  assertNonEmpty(gameId, 'gameId');
  return `${ns.game}:${gameId}:state`;
}

export function keyGameNonces(gameId: string): string {
  assertNonEmpty(gameId, 'gameId');
  return `${ns.game}:${gameId}:nonces`; // could be a set of seen nonces
}

export function keyGameNonce(gameId: string, nonce: string): string {
  assertNonEmpty(gameId, 'gameId');
  assertNonEmpty(nonce, 'nonce');
  return `${ns.nonce}:${gameId}:${nonce}`;
}

export function keyGameLock(gameId: string): string {
  assertNonEmpty(gameId, 'gameId');
  return `${ns.lock}:${ns.game}:${gameId}`;
}

// Room-scoped keys (Socket.IO room == our game room)
export function keyRoomMembers(gameId: string): string {
  assertNonEmpty(gameId, 'gameId');
  return `${ns.room}:${gameId}:members`; // a set of socketIds
}

export function keyRoomPlayers(gameId: string): string {
  assertNonEmpty(gameId, 'gameId');
  return `${ns.room}:${gameId}:players`; // hash: socketId -> 'X' | 'O'
}

export function keyRoomLastActive(gameId: string): string {
  assertNonEmpty(gameId, 'gameId');
  return `${ns.room}:${gameId}:lastActive`;
}

// Session keys
export function keySession(token: string): string {
  assertNonEmpty(token, 'sessionToken');
  return `${ns.session}:${token}`; // hash mapping to gameId, player, socketId
}

export function keySessionLock(token: string): string {
  assertNonEmpty(token, 'sessionToken');
  return `${ns.lock}:${ns.session}:${token}`;
}

// Rate limit / backpressure keys
export function keySocketRate(socketId: string): string {
  assertNonEmpty(socketId, 'socketId');
  return `${ns.rate}:${socketId}`;
}

export const REDIS_KEYS = Object.freeze({
  keyGameState,
  keyGameNonces,
  keyGameNonce,
  keyGameLock,
  keyRoomMembers,
  keyRoomPlayers,
  keyRoomLastActive,
  keySession,
  keySessionLock,
  keySocketRate,
});
