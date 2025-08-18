// © 2025 Joe Pruskowski
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import http from 'http';

// Hoisted fakes used by mocks
const HOISTED = vi.hoisted(() => {
	const fakeServer: any = {
		listen: vi.fn((_: unknown, cb?: () => void) => { cb && cb(); return fakeServer; }),
		address: vi.fn(() => ({ port: 0 })),
		close: vi.fn((cb?: () => void) => { cb && cb(); return fakeServer; }),
		listeners: vi.fn(() => []),
		on: vi.fn(),
		once: vi.fn(),
		emit: vi.fn(),
		removeListener: vi.fn(),
		removeAllListeners: vi.fn(),
	};
	return { fakeServer };
});

describe('server bootstrap', () => {
	it('creates an HTTP server without throwing', () => {
		const server = http.createServer((_, res) => { res.statusCode = 200; res.end('ok'); });
		expect(server).toBeDefined();
		server.close();
	});

	describe('env validation at startup', () => {
		const originalEnv = { ...process.env } as NodeJS.ProcessEnv;
		beforeEach(() => {
			process.env = { ...originalEnv } as NodeJS.ProcessEnv;
			vi.resetModules();
			// Use stubbed HTTP server to avoid real sockets
			vi.mock('http', () => ({ default: { createServer: vi.fn(() => HOISTED.fakeServer) } }));
			// Stub pino-http to noop
			vi.mock('pino-http', () => ({ default: () => (_req: unknown, _res: unknown, next: () => void) => next() }));
		});
		afterEach(() => {
			process.env = originalEnv;
		});

		it('throws in test if config invalid (e.g., bad port)', async () => {
			process.env.SERVER_PORT = '-1'; // invalid: below 0
			await expect(import('./index')).rejects.toBeTruthy();
		});

		it('starts server successfully with valid env and closes', async () => {
			process.env.SERVER_PORT = '0'; // let OS choose an ephemeral port
			const mod = await import('./index');
			const srv = mod.httpServer as http.Server;
			expect(srv).toBeDefined();
			await new Promise<void>((resolve) => srv.close(() => resolve()));
		});

		it('attaches socket handlers via server_factory', async () => {
			process.env.SERVER_PORT = '0';
			vi.resetModules();
			const factory = await import('./server_factory');
			const spy = vi.spyOn(factory, 'createServers');
			await import('./index');
			expect(spy).toHaveBeenCalledTimes(1);
			spy.mockRestore();
		});

		it('initializes tracing on startup', async () => {
			process.env.SERVER_PORT = '0';
			vi.resetModules();
			const tracing = await import('./tracing');
			const initSpy = vi.spyOn(tracing, 'initTracing');
			await import('./index');
			expect(initSpy).toHaveBeenCalled();
			initSpy.mockRestore();
		});

	});

	// Additional bootstrap behavior tests omitted to avoid brittle side-effects
});


