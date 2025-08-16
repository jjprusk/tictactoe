// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import { buildMongoClient, connectWithRetry } from './mongo';

describe('mongo retry', () => {
	it('fails after retries for unreachable host within bounded time', async () => {
		const client = buildMongoClient('mongodb://127.0.0.1:1'); // invalid port
		const started = Date.now();
		await expect(
			connectWithRetry(client, { maxRetries: 2, initialDelayMs: 50, maxDelayMs: 100 })
		).rejects.toBeTruthy();
		const elapsed = Date.now() - started;
		expect(elapsed).toBeGreaterThanOrEqual(100);
		expect(elapsed).toBeLessThan(5000);
	});
});


