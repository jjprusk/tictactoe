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


