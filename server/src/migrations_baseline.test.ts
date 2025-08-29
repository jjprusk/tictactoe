// © 2025 Joe Pruskowski
import { describe, it, expect, vi } from 'vitest';
import path from 'path';

function loadBaseline() {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	return require(path.resolve(__dirname, '..', 'migrations', '20250201-000-initial-baseline.js')) as {
		up: (db: any) => Promise<void>;
		down: (db: any) => Promise<void>;
	};
}

type FakeCollection = {
	createIndex: ReturnType<typeof vi.fn>;
	dropIndexes: ReturnType<typeof vi.fn>;
};

function buildFakeDb(overrides?: Partial<Record<string, Partial<FakeCollection>>>): any {
	const cache = new Map<string, FakeCollection>();
	return {
		collection: (name: string) => {
			if (!cache.has(name)) {
				const base: FakeCollection = {
					createIndex: vi.fn(async () => {}),
					dropIndexes: vi.fn(async () => {}),
				};
				const withOverrides = Object.assign(base, overrides?.[name] ?? {});
				cache.set(name, withOverrides as FakeCollection);
			}
			return cache.get(name)!;
		},
		__collections: cache,
	};
}

describe('baseline migration 20250201-000-initial-baseline.js', () => {
	it('up() creates expected indexes on all collections', async () => {
		const mod = loadBaseline();
		const db = buildFakeDb();
		await mod.up(db);

		const games = db.__collections.get('games') as FakeCollection;
		const moves = db.__collections.get('moves') as FakeCollection;
		const sessions = db.__collections.get('sessions') as FakeCollection;
		const models = db.__collections.get('models') as FakeCollection;
		const logs = db.__collections.get('logs') as FakeCollection;

		expect(games.createIndex).toHaveBeenCalledTimes(3);
		expect(moves.createIndex).toHaveBeenCalledTimes(2);
		expect(sessions.createIndex).toHaveBeenCalledTimes(2);
		expect(models.createIndex).toHaveBeenCalledTimes(2);
		expect(logs.createIndex).toHaveBeenCalledTimes(3);

		// spot-check options
		expect(moves.createIndex).toHaveBeenCalledWith({ gameId: 1, idx: 1 }, { unique: true });
		expect(sessions.createIndex).toHaveBeenCalledWith({ expiresAt: 1 }, { expireAfterSeconds: 0 });
		expect(models.createIndex).toHaveBeenCalledWith({ version: 1 }, { unique: true });
	});

	it('down() drops indexes and swallows errors', async () => {
		const mod = loadBaseline();
		const db = buildFakeDb({
			logs: { dropIndexes: vi.fn(async () => { throw new Error('boom'); }) },
		});
		await expect(mod.down(db)).resolves.toBeUndefined();
		for (const name of ['games', 'moves', 'sessions', 'models', 'logs']) {
			const col = db.__collections.get(name) as FakeCollection;
			expect(col.dropIndexes).toHaveBeenCalledTimes(1);
		}
	});
});
