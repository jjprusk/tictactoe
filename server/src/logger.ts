// © 2025 Joe Pruskowski
import pino from 'pino';
import { resolve } from 'path';

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

export const loggerTransportTargets: ReadonlyArray<TransportTarget> | undefined = targets.length > 0 ? targets : undefined;

const transport = loggerTransportTargets ? pino.transport({ targets: loggerTransportTargets }) : undefined;

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
  },
  transport
);


