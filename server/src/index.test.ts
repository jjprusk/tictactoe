// © 2025 Joe Pruskowski
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { app } from './app';

describe('server bootstrap', () => {
	it('creates an HTTP server without throwing', () => {
		const server = http.createServer(app);
		expect(server).toBeDefined();
		server.close();
	});

	describe('env validation at startup', () => {
		const originalEnv = { ...process.env } as NodeJS.ProcessEnv;
		beforeEach(() => {
			process.env = { ...originalEnv } as NodeJS.ProcessEnv;
		});
		afterEach(() => {
			process.env = originalEnv;
		});

		it('throws in test if config invalid (e.g., bad port)', async () => {
			process.env.SERVER_PORT = '0'; // invalid: min is 1
			await expect(import('./index')).rejects.toBeTruthy();
		});
	});
});


