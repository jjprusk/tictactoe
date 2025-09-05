// © 2025 Joe Pruskowski
import pino from 'pino';
import { resolve } from 'path';
import { appConfig } from './config/env';

// Write to repo root: tictactoe/LOG
const rootLogPath = resolve(__dirname, '..', '..', 'LOG');
// Only enable file transport when explicitly requested
const isTestEnv = process.env.NODE_ENV === 'test';
const enableFileTransport = process.env.LOG_TO_FILE === '1' && !isTestEnv;

type TransportTarget = {
  target: string;
  level?: string;
  options?: Record<string, unknown>;
};

const targets: TransportTarget[] = [];
// Optionally add file target first so tests can locate the file destination
if (enableFileTransport) {
  targets.push({
    target: 'pino/file',
    options: { destination: rootLogPath, mkdir: true },
  });
}
// In non-test environments, also write structured logs to stdout (fd 1)
if (!isTestEnv) {
  targets.push({
    target: 'pino/file',
    options: { destination: 1 },
    level: process.env.LOG_LEVEL || 'info',
  });
}

// Optional Mongo sink with basic sampling
// Note: This uses pino/file to stdout for simplicity; a real mongo transport would be added here.
// For our purposes, we gate enabling via env and will rely on app code to forward structured logs to Mongo.
const enableMongoSink = appConfig.LOG_TO_MONGO && !isTestEnv;
if (enableMongoSink) {
  // We simulate sampling by using pino's level filter and allow downstream code to apply additional sampling.
  targets.push({
    target: 'pino/file',
    options: { destination: 1 },
    level: process.env.LOG_LEVEL || 'info',
  });
}

export const loggerTransportTargets: ReadonlyArray<TransportTarget> | undefined = targets.length > 0 ? targets : undefined;

const transport = loggerTransportTargets ? pino.transport({ targets: loggerTransportTargets }) : undefined;

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    // lightweight sampler: drop a fraction of "info" logs when configured
    hooks:
      appConfig.LOG_SAMPLE_RATE < 1
        ? {
            logMethod(this: pino.Logger, args: unknown[], method: pino.LogFn, level: number) {
              try {
                if (level === 30 && Math.random() > appConfig.LOG_SAMPLE_RATE) return;
              } catch {
                // ignore
              }
              const invoke = method as unknown as (this: pino.Logger, ...a: unknown[]) => void;
              invoke.apply(this, args);
            },
          }
        : undefined,
  },
  transport
);


