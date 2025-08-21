// © 2025 Joe Pruskowski
import { describe, it, expect, vi } from 'vitest';
import { MOUNTAIN_NAMES, normalizeMountainName, generateMountainGameId } from './mountain_names';

describe('mountain id generator', () => {
	it('normalizes names to kebab-case ascii', () => {
		expect(normalizeMountainName('Mont Blanc')).toBe('mont-blanc');
		expect(normalizeMountainName('Aoraki / Mount Cook')).toBe('aoraki-mount-cook');
		expect(normalizeMountainName('Pico de Orizaba')).toBe('pico-de-orizaba');
		expect(normalizeMountainName('Šumava')).toBe('sumava');
	});

	it('produces a readable non-empty id and eventually resolves collisions', () => {
		const taken = new Set<string>();
		const isTaken = (id: string) => taken.has(id);
		for (let i = 0; i < 100; i += 1) {
			const id = generateMountainGameId(isTaken);
			expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
			expect(id.length).toBeGreaterThan(0);
			taken.add(id);
		}
	});

	it('fallback adds short alphabetic suffix when base names are exhausted', () => {
		const normalized = MOUNTAIN_NAMES.map((n) => normalizeMountainName(n));
		const allTaken = new Set<string>(normalized);
		const candidate = generateMountainGameId((id) => allTaken.has(id));
		expect(candidate).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
		expect(allTaken.has(candidate)).toBe(false);
	});

	it('timestamp fallback is used when everything is taken (including suffixed)', () => {
		const origNow = Date.now;
		const ts = 1_700_000_000_000; // fixed timestamp
		Date.now = (() => ts) as unknown as typeof Date.now;
		try {
			const alwaysTaken = () => true;
			const id = generateMountainGameId(alwaysTaken);
			expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
			const suffix = ts.toString(36);
			expect(id.endsWith(suffix)).toBe(true);
		} finally {
			Date.now = origNow;
		}
	});

	it('normalization removes diacritics, punctuation, and compresses dashes', () => {
		expect(normalizeMountainName('Mont Pelée')).toBe('mont-pelee');
		expect(normalizeMountainName('Mauna    Kea')).toBe('mauna-kea');
		expect(normalizeMountainName('Cerro---Torre')).toBe('cerro-torre');
		expect(normalizeMountainName('--Aoraki / Mount Cook--')).toBe('aoraki-mount-cook');
	});

	it('normalize is idempotent', () => {
		const once = normalizeMountainName('Mont Blanc');
		const twice = normalizeMountainName(once);
		expect(once).toBe('mont-blanc');
		expect(twice).toBe(once);
	});

	it('picks first mountain when Math.random returns 0', () => {
		const r = vi.spyOn(Math, 'random').mockReturnValue(0);
		const taken = new Set<string>();
		const id = generateMountainGameId((x) => taken.has(x));
		// First name is "Everest" => "everest"
		expect(id).toBe('everest');
		r.mockRestore();
	});
});


