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

		it('logs server started with port on listen', async () => {
			process.env.SERVER_PORT = '0';
			vi.resetModules();
			vi.mock('./logger', () => {
				const logger: any = { info: vi.fn(), child: vi.fn(() => logger) };
				return { logger };
			});
			await import('./index');
			const { logger } = await import('./logger');
			expect(logger.info).toHaveBeenCalledWith({ port: 0 }, 'server started');
		});

		it('logs console error on mongo connectWithRetry rejection', async () => {
			process.env.SERVER_PORT = '0';
			vi.resetModules();
			vi.mock('./db/mongo', () => ({
				buildMongoClient: vi.fn(() => ({})),
				connectWithRetry: vi.fn(() => Promise.reject(new Error('oops'))),
			}));
			const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			await import('./index');
			await new Promise((r) => setTimeout(r, 0));
			expect(errSpy).toHaveBeenCalled();
			errSpy.mockRestore();
		});

		it('handles duplicate SIGTERM signals without crashing', async () => {
			process.env.SERVER_PORT = '0';
			vi.resetModules();
			vi.mock('./logger', () => {
				const logger: any = { info: vi.fn(), child: vi.fn(() => logger) };
				return { logger };
			});
			await import('./index');
			const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: string | number | null | undefined) => {
				throw new Error(`exit ${code}`);
			}) as never);
			try { process.emit('SIGTERM'); } catch (_e) { void 0; }
			try { process.emit('SIGTERM'); } catch (_e) { void 0; }
			const { logger } = await import('./logger');
			expect(logger.info).toHaveBeenCalledWith('SIGTERM received, initiating graceful shutdown');
			// called at least twice
			expect((logger.info as any).mock.calls.filter((c: any[]) => c[0] === 'SIGTERM received, initiating graceful shutdown').length).toBeGreaterThanOrEqual(2);
			// close should be invoked for each signal (may be more due to prior listeners)
			const closeCalls = (HOISTED.fakeServer.close as any).mock.calls.length;
			expect(closeCalls).toBeGreaterThanOrEqual(2);
			expect(exitSpy).toHaveBeenCalled();
		});

		it('handles SIGTERM gracefully (closes server then exits 0)', async () => {
			process.env.SERVER_PORT = '0';
			vi.resetModules();
			// Mock logger to capture messages
			vi.mock('./logger', () => {
				const logger: any = {
					info: vi.fn(),
					child: vi.fn(() => logger),
				};
				return { logger };
			});
			const mod = await import('./index');
			const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: string | number | null | undefined) => {
				throw new Error(`exit ${code}`);
			}) as never);
			// ensure close will call its callback (already implemented in hoisted fake)
			try {
				process.emit('SIGTERM');
			} catch {
				// ignore thrown by mocked process.exit
			}
			const { logger } = await import('./logger');
			expect(logger.info).toHaveBeenCalledWith('SIGTERM received, initiating graceful shutdown');
			expect(logger.info).toHaveBeenCalledWith('HTTP server closed; exiting with code 0');
			expect((mod.httpServer.close as any).mock.calls.length > 0).toBe(true);
			expect(exitSpy).toHaveBeenCalledWith(0);
		});

		it('handles SIGINT gracefully (closes server then exits 0)', async () => {
			process.env.SERVER_PORT = '0';
			vi.resetModules();
			vi.mock('./logger', () => {
				const logger: any = { info: vi.fn(), child: vi.fn(() => logger) };
				return { logger };
			});
			const mod = await import('./index');
			const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: string | number | null | undefined) => {
				throw new Error(`exit ${code}`);
			}) as never);
			try {
				process.emit('SIGINT');
			} catch (_e) { void 0; }
			const { logger } = await import('./logger');
			expect(logger.info).toHaveBeenCalledWith('SIGINT received, initiating graceful shutdown');
			expect(logger.info).toHaveBeenCalledWith('HTTP server closed; exiting with code 0');
			expect((mod.httpServer.close as any).mock.calls.length > 0).toBe(true);
			expect(exitSpy).toHaveBeenCalledWith(0);
		});

	});

	// Additional bootstrap behavior tests omitted to avoid brittle side-effects
});


