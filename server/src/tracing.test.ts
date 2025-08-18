// © 2025 Joe Pruskowski
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('tracing.ts', () => {
  const originalEnv = { ...process.env } as NodeJS.ProcessEnv;

  beforeEach(() => {
    process.env = { ...originalEnv } as NodeJS.ProcessEnv;
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it('is a no-op in test without OTLP endpoint', async () => {
    process.env.NODE_ENV = 'test';
    // Mock SDK classes and capture constructor calls
    const providerCtor = vi.fn();
    vi.mock('@opentelemetry/sdk-trace-node', () => ({
      NodeTracerProvider: function mockProvider(this: any) {
        providerCtor();
        this.addSpanProcessor = vi.fn();
        this.register = vi.fn();
      },
    }));
    vi.mock('@opentelemetry/sdk-trace-base', () => ({
      ConsoleSpanExporter: vi.fn(),
      SimpleSpanProcessor: vi.fn(),
    }));

    const tracing = await import('./tracing');
    tracing.initTracing();
    expect(providerCtor).not.toHaveBeenCalled();
    // getTracer should still return a tracer object interface
    const tracer = tracing.getTracer();
    expect(tracer).toBeDefined();
  });

  it('initializes provider and registers exporter when enabled', async () => {
    process.env.NODE_ENV = 'test';
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';

    const hoisted = vi.hoisted(() => ({
      providerInstance: { addSpanProcessor: vi.fn(), register: vi.fn() } as any,
      providerCtor: vi.fn(),
      simpleCtor: vi.fn(),
      consoleCtor: vi.fn(),
    }));

    vi.mock('@opentelemetry/sdk-trace-node', () => ({
      NodeTracerProvider: function mockProvider(this: any) {
        hoisted.providerCtor();
        return hoisted.providerInstance;
      },
    }));
    vi.mock('@opentelemetry/sdk-trace-base', () => ({
      ConsoleSpanExporter: function mockConsole(this: any) {
        hoisted.consoleCtor();
      },
      SimpleSpanProcessor: function mockSimple(this: any) {
        hoisted.simpleCtor();
      },
    }));

    const tracing = await import('./tracing');
    tracing.initTracing();
    expect(hoisted.providerCtor).toHaveBeenCalledTimes(1);
    expect(hoisted.simpleCtor).toHaveBeenCalledTimes(1);
    expect(hoisted.consoleCtor).toHaveBeenCalledTimes(1);
    expect(hoisted.providerInstance.addSpanProcessor).toHaveBeenCalledTimes(1);
    expect(hoisted.providerInstance.register).toHaveBeenCalledTimes(1);

    // Idempotent: second call does nothing
    tracing.initTracing();
    expect(hoisted.providerCtor).toHaveBeenCalledTimes(1);
  });
});


