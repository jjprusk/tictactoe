// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import { buildMongoClient, connectWithRetry, ensureIndexes } from './mongo';

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
  it('ensureIndexes best-effort: should not crash when client missing; may reject when server requires auth', async () => {
    await expect(ensureIndexes('tictactoe_test')).resolves.toBeUndefined();
    const uri = process.env.MONGO_TEST_URI;
    if (!uri) return; // skip live-connect path in CI without Mongo
    const client = buildMongoClient(uri);
    try {
      await connectWithRetry(client, { maxRetries: 0, initialDelayMs: 10, maxDelayMs: 10 });
      try {
        await ensureIndexes('tictactoe_test');
        expect(true).toBe(true);
      } catch (e) {
        const msg = (e as Error)?.message || '';
        expect(/requires authentication|Unauthorized/i.test(msg)).toBe(true);
      }
    } finally {
      try { await client.close(); } catch { void 0; }
    }
  });
});


