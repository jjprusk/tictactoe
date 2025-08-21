// © 2025 Joe Pruskowski
import type { Socket } from 'socket.io';

export const ErrorCodes = {
	InvalidPayload: 'invalid-payload',
	Duplicate: 'duplicate',
	RateLimit: 'rate-limit',
	Unauthorized: 'unauthorized',
	Forbidden: 'forbidden',
	NotFound: 'not-found',
	GameClosed: 'game-closed',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

const defaultMessages: Record<ErrorCode, string> = {
	'invalid-payload': 'The provided payload is invalid.',
	duplicate: 'This request was a duplicate and has been ignored.',
	'rate-limit': 'Too many requests in a short time. Please try again later.',
	unauthorized: 'You are not authorized to perform this action.',
	forbidden: 'You do not have permission to perform this action.',
	'not-found': 'The requested resource was not found.',
	'game-closed': 'The game has been closed by an administrator.',
};

export function emitStandardError(socket: Socket, code: ErrorCode, message?: string): void {
	socket.emit('error', { code, message: message ?? defaultMessages[code] });
}


