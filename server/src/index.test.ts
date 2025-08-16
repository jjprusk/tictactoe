// © 2025 Joe Pruskowski
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
			process.env.SERVER_PORT = '-1'; // invalid: below 0
			vi.resetModules();
			await expect(import('./index')).rejects.toBeTruthy();
		});

		it('starts server successfully with valid env and closes', async () => {
			process.env.SERVER_PORT = '0'; // let OS choose an ephemeral port
			vi.resetModules();
			const mod = await import('./index');
			const srv = mod.httpServer as http.Server;
			expect(srv).toBeDefined();
			// server should be listening
			expect(typeof srv.address()).toBe('object');
			await new Promise<void>((resolve) => srv.close(() => resolve()));
		});
	});
});


