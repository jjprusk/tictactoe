// © 2025 Joe Pruskowski
import { MongoClient } from 'mongodb';

export type MongoRetryConfig = {
	maxRetries: number;
	initialDelayMs: number;
	maxDelayMs: number;
};

let cachedClient: MongoClient | null = null;

export function buildMongoClient(uri: string): MongoClient {
	return new MongoClient(uri, {
		// Force server selection short timeouts so retries progress quickly during tests
		directConnection: false,
		serverSelectionTimeoutMS: 1000,
	});
}

export async function connectWithRetry(
	client: MongoClient,
	{ maxRetries, initialDelayMs, maxDelayMs }: MongoRetryConfig
): Promise<MongoClient> {
	let attempt = 0;
	let delay = initialDelayMs;
	// eslint-disable-next-line no-constant-condition
	while (true) {
		try {
			await client.connect();
			cachedClient = client;
			return client;
		} catch (err) {
			attempt += 1;
			if (attempt > maxRetries) {
				throw err;
			}
			await new Promise<void>((resolve) => setTimeout(() => resolve(), delay));
			delay = Math.min(maxDelayMs, Math.floor(delay * 1.5));
		}
	}
}

export function getMongoClient(): MongoClient | null {
	return cachedClient;
}

export async function closeMongoClient(): Promise<void> {
	if (cachedClient) {
		await cachedClient.close();
		cachedClient = null;
	}
}

// Test helper to control cached client in unit tests
export function __setClientForTest(client: MongoClient | null): void {
	cachedClient = client;
}

// S131: Ensure compound and TTL indexes
export async function ensureIndexes(dbName = 'tictactoe'): Promise<void> {
	if (!cachedClient) return;
	const db = cachedClient.db(dbName);
	// Games: active by updatedAt; unique id is implicit (_id)
	await db.collection('games').createIndexes([
		{ key: { status: 1, updatedAt: -1 }, name: 'status_updatedAt' },
		{ key: { createdAt: 1 }, name: 'createdAt_asc' },
		{ key: { updatedAt: -1 }, name: 'updatedAt_desc' },
	]);
	// Moves: unique per (gameId, idx), chronological per game
	await db.collection('moves').createIndexes([
		{ key: { gameId: 1, idx: 1 }, name: 'game_idx', unique: true },
		{ key: { gameId: 1, createdAt: 1 }, name: 'game_createdAt' },
	]);
	// Sessions: latest by game, TTL expiry on expiresAt if present
	await db.collection('sessions').createIndexes([
		{ key: { gameId: 1, updatedAt: -1 }, name: 'game_updatedAt_desc' },
		// TTL index requires expireAfterSeconds; if expiresAt missing, doc is not expired
		{ key: { expiresAt: 1 }, name: 'expiresAt_ttl', expireAfterSeconds: 0 },
	]);
	// Models: unique version; tag + createdAt for discovery
	await db.collection('models').createIndexes([
		{ key: { version: 1 }, name: 'version_unique', unique: true },
		{ key: { tags: 1, createdAt: -1 }, name: 'tags_createdAt_desc' },
	]);
	// Logs: by game/time, session/time, level/time
	await db.collection('logs').createIndexes([
		{ key: { gameId: 1, createdAt: 1 }, name: 'game_createdAt' },
		{ key: { sessionId: 1, createdAt: 1 }, name: 'session_createdAt' },
		{ key: { level: 1, createdAt: 1 }, name: 'level_createdAt' },
	]);
}


