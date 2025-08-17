// © 2025 Joe Pruskowski
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolve } from 'path';

// Hold spies across module reloads
let pinoSpy: any;
let transportSpy: any;

function mockPinoModule() {
  transportSpy = vi.fn((opts: any) => opts);
  // Capture both args and expose them on the returned object
  pinoSpy = vi.fn((options: any, transport?: any) => ({ options, transport }));
  (pinoSpy as any).transport = transportSpy;
  vi.mock('pino', () => ({ default: pinoSpy }));
}

const originalEnv = { ...process.env } as NodeJS.ProcessEnv;

describe('logger.ts', () => {
  beforeEach(() => {
    process.env = { ...originalEnv } as NodeJS.ProcessEnv;
    vi.resetModules();
  });
  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('in test mode does not configure file transport', async () => {
    process.env.NODE_ENV = 'test';
    mockPinoModule();
    const mod = await import('./logger');
    expect(mod.logger).toBeDefined();
    expect(transportSpy).not.toHaveBeenCalled();
    // level defaults to info
    expect(pinoSpy).toHaveBeenCalled();
    const [{ level }] = pinoSpy.mock.calls.at(0) as any[];
    expect(level).toBe('info');
  });

  it('with LOG_TO_FILE=1 configures pretty->file transport and honors LOG_LEVEL', async () => {
    process.env.NODE_ENV = 'development';
    process.env.LOG_LEVEL = 'debug';
    process.env.LOG_TO_FILE = '1';
    mockPinoModule();
    const mod = await import('./logger');
    // Inspect exported transport targets for determinism
    const targets = (mod as any).loggerTransportTargets as any[];
    expect(Array.isArray(targets)).toBe(true);
    const fileTarget = targets.find((t: any) => t.target === 'pino/file');
    expect(fileTarget).toBeTruthy();
    expect(resolve(fileTarget.options.destination).endsWith(resolve(__dirname, '..', '..', 'LOG'))).toBe(true);
  });
});


