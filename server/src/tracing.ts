// © 2025 Joe Pruskowski
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { trace } from '@opentelemetry/api';
import { appConfig } from './config/env';

let initialized = false;

export function initTracing(): void {
  if (initialized) return;
  if (!appConfig.OTEL_EXPORTER_OTLP_ENDPOINT && process.env.NODE_ENV === 'test') {
    // Keep tests quiet unless explicitly enabled
    initialized = true;
    return;
  }

  const provider = new NodeTracerProvider();
  provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
  provider.register();
  initialized = true;
}

export function getTracer() {
  return trace.getTracer('tictactoe-server');
}


