// © 2025 Joe Pruskowski
import pino from 'pino';
import { resolve } from 'path';

// Write to repo root: tictactoe/LOG
const rootLogPath = resolve(__dirname, '..', '..', 'LOG');
// Only enable file transport when explicitly requested, and never in tests
const enableFileTransport = process.env.LOG_TO_FILE === '1' && process.env.NODE_ENV !== 'test';

export const loggerTransportTargets: any = enableFileTransport
  ? [
      {
        target: 'pino-pretty',
        options: { colorize: false },
        level: process.env.LOG_LEVEL || 'info',
      },
      {
        target: 'pino/file',
        options: { destination: rootLogPath, mkdir: true },
      },
    ]
  : undefined;

const transport = loggerTransportTargets ? pino.transport({ targets: loggerTransportTargets as any }) : undefined;

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
  },
  transport
);


