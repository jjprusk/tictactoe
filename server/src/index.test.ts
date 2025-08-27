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

// (server_factory not used by index.ts; keep tests independent of that module)

describe('server bootstrap', () => {
	it('creates an HTTP server without throwing', () => {
		const server = http.createServer((_, res) => { res.statusCode = 200; res.end('ok'); });
		expect(server).toBeDefined();
		server.close();
	});

	describe('env validation at startup', () => {
		const originalEnv = { ...process.env } as NodeJS.ProcessEnv;
		let consoleErrorSpy: ReturnType<typeof vi.spyOn> | undefined;
		beforeEach(() => {
			process.env = { ...originalEnv } as NodeJS.ProcessEnv;
			vi.resetModules();
			// Use stubbed HTTP server to avoid real sockets
			vi.mock('http', () => ({ default: { createServer: vi.fn(() => HOISTED.fakeServer) } }));
			// Stub pino-http to noop
			vi.mock('pino-http', () => ({ default: () => (_req: unknown, _res: unknown, next: () => void) => next() }));
			// Silence console.error noise from expected failure scenarios in this suite
			consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			// nothing
		});
		afterEach(() => {
			process.env = originalEnv;
			consoleErrorSpy?.mockRestore();
		});

		it('creates and listens on HTTP server', async () => {
			process.env.SERVER_PORT = '0';
			await import('./index');
			expect(HOISTED.fakeServer.listen).toHaveBeenCalled();
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

		it('attaches socket handlers via bootstrap/attachSocketHandlers', async () => {
			process.env.SERVER_PORT = '0';
			vi.resetModules();
			const handlers = await import('./socket_handlers');
			const spy = vi.spyOn(handlers, 'attachSocketHandlers');
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
			expect(errSpy).toHaveBeenCalledWith('[mongo] failed to connect after retries:', 'oops');
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
			try { process.emit('SIGTERM'); } catch (_e) { void 0; }
			try { process.emit('SIGTERM'); } catch (_e) { void 0; }
			const { logger } = await import('./logger');
			expect(logger.info).toHaveBeenCalledWith('SIGTERM received, initiating graceful shutdown');
			// called at least twice
			expect((logger.info as any).mock.calls.filter((c: any[]) => c[0] === 'SIGTERM received, initiating graceful shutdown').length).toBeGreaterThanOrEqual(2);
			// close should be invoked for each signal (may be more due to prior listeners)
			const closeCalls = (HOISTED.fakeServer.close as any).mock.calls.length;
			expect(closeCalls).toBeGreaterThanOrEqual(2);
		});

		it('handles SIGTERM gracefully (closes server then logs exit)', async () => {
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
			try {
				process.emit('SIGTERM');
			} catch {
				// ignore
			}
			const { logger } = await import('./logger');
			expect(logger.info).toHaveBeenCalledWith('SIGTERM received, initiating graceful shutdown');
			expect(logger.info).toHaveBeenCalledWith('HTTP server closed; exiting with code 0');
			expect((mod.httpServer.close as any).mock.calls.length > 0).toBe(true);
		});

		it('handles SIGINT gracefully (closes server then logs exit)', async () => {
			process.env.SERVER_PORT = '0';
			vi.resetModules();
			vi.mock('./logger', () => {
				const logger: any = { info: vi.fn(), child: vi.fn(() => logger) };
				return { logger };
			});
			const mod = await import('./index');
			try {
				process.emit('SIGINT');
			} catch (_e) { void 0; }
			const { logger } = await import('./logger');
			expect(logger.info).toHaveBeenCalledWith('SIGINT received, initiating graceful shutdown');
			expect(logger.info).toHaveBeenCalledWith('HTTP server closed; exiting with code 0');
			expect((mod.httpServer.close as any).mock.calls.length > 0).toBe(true);
		});

		it('logs configured port when address() is unavailable and calls attachSocketHandlers once', async () => {
			process.env.SERVER_PORT = '1234';
			vi.resetModules();
			// force address() to be undefined so index.ts falls back to configured port
			(HOISTED.fakeServer.address as any).mockReturnValueOnce(undefined);
			vi.mock('http', () => ({ default: { createServer: vi.fn(() => HOISTED.fakeServer) } }));
			// stable config
			const cfg = {
				NODE_ENV: 'test',
				SERVER_PORT: 1234,
				MONGO_URI: 'mongodb://localhost:27017/x',
				REDIS_URL: 'redis://localhost:6379',
				LOG_LEVEL: 'info',
				CORS_ORIGIN: 'http://localhost:5173',
				JWT_SECRET: 'change-me',
				AI_SERVICE_URL: 'http://localhost:8000',
				MODEL_REGISTRY_DIR: './',
				OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
				PROMETHEUS_ENABLE: false,
				EMA_DEFAULT_N: 3,
				MONGO_MAX_RETRIES: 0,
				MONGO_RETRY_INITIAL_MS: 200,
				MONGO_RETRY_MAX_MS: 2000,
			} as any;
			vi.doMock('./config/env', () => ({ appConfig: cfg, loadConfig: vi.fn(() => cfg) }));
			vi.doMock('./bootstrap', () => ({ buildIoServer: vi.fn(() => ({ on: vi.fn() })) }));
			// capture attachSocketHandlers calls
			const handlers = await import('./socket_handlers');
			const attachSpy = vi.spyOn(handlers, 'attachSocketHandlers');
			vi.mock('./logger', () => {
				const logger: any = { info: vi.fn(), child: vi.fn(() => logger) };
				return { logger };
			});
			await import('./index');
			const { logger } = await import('./logger');
			expect(logger.info).toHaveBeenCalledWith({ port: 1234 }, 'server started');
			expect(attachSpy).toHaveBeenCalledTimes(1);
			attachSpy.mockRestore();
		});


		it('exits(1) and logs on startup error in production (loadConfig throws)', async () => {
			const prevNodeEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = 'production';
			process.env.SERVER_PORT = '0';
			vi.resetModules();
			vi.mock('http', () => ({ default: { createServer: vi.fn(() => HOISTED.fakeServer) } }));
			const cfg = {
				NODE_ENV: 'production',
				SERVER_PORT: 0,
				MONGO_URI: 'mongodb://localhost:27017/x',
				REDIS_URL: 'redis://localhost:6379',
				LOG_LEVEL: 'info',
				CORS_ORIGIN: 'http://localhost:5173',
				JWT_SECRET: 'change-me',
				AI_SERVICE_URL: 'http://localhost:8000',
				MODEL_REGISTRY_DIR: './',
				OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
				PROMETHEUS_ENABLE: false,
				EMA_DEFAULT_N: 3,
				MONGO_MAX_RETRIES: 0,
				MONGO_RETRY_INITIAL_MS: 200,
				MONGO_RETRY_MAX_MS: 2000,
			} as any;
			vi.doMock('./config/env', () => ({ appConfig: cfg, loadConfig: vi.fn(() => { throw new Error('bad env'); }) }));
			const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: string | number | null | undefined) => {
				throw new Error(`exit ${code}`);
			}) as never);
			await expect(import('./index')).rejects.toBeTruthy();
			expect(errSpy).toHaveBeenCalled();
			const first = (errSpy as any).mock.calls.find((c: any[]) => typeof c[0] === 'string' && c[0].startsWith('[startup]'));
			expect(first).toBeTruthy();
			expect(exitSpy).toHaveBeenCalledWith(1);
			errSpy.mockRestore();
			process.env.NODE_ENV = prevNodeEnv;
		});

		it('exits(1) and logs when buildIoServer throws in production', async () => {
			const prevNodeEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = 'production';
			process.env.SERVER_PORT = '0';
			vi.resetModules();
			vi.mock('http', () => ({ default: { createServer: vi.fn(() => HOISTED.fakeServer) } }));
			vi.doMock('./bootstrap', () => ({ buildIoServer: vi.fn(() => { throw new Error('io fail'); }) }));
			const cfg = {
				NODE_ENV: 'production',
				SERVER_PORT: 0,
				MONGO_URI: 'mongodb://localhost:27017/x',
				REDIS_URL: 'redis://localhost:6379',
				LOG_LEVEL: 'info',
				CORS_ORIGIN: 'http://localhost:5173',
				JWT_SECRET: 'change-me',
				AI_SERVICE_URL: 'http://localhost:8000',
				MODEL_REGISTRY_DIR: './',
				OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
				PROMETHEUS_ENABLE: false,
				EMA_DEFAULT_N: 3,
				MONGO_MAX_RETRIES: 0,
				MONGO_RETRY_INITIAL_MS: 200,
				MONGO_RETRY_MAX_MS: 2000,
			} as any;
			vi.doMock('./config/env', () => ({ appConfig: cfg, loadConfig: vi.fn(() => cfg) }));
			const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: string | number | null | undefined) => {
				throw new Error(`exit ${code}`);
			}) as never);
			await expect(import('./index')).rejects.toBeTruthy();
			expect(errSpy).toHaveBeenCalled();
			const first = (errSpy as any).mock.calls.find((c: any[]) => typeof c[0] === 'string' && c[0].startsWith('[startup]'));
			expect(first).toBeTruthy();
			expect(exitSpy).toHaveBeenCalledWith(1);
			errSpy.mockRestore();
			process.env.NODE_ENV = prevNodeEnv;
		});

	});

	// Additional bootstrap behavior tests omitted to avoid brittle side-effects
});


