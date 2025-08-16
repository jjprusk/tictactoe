// © 2025 Joe Pruskowski
import pino from 'pino';

const enablePretty = process.env.PINO_PRETTY === '1' && process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: enablePretty ? { target: 'pino-pretty' } : undefined,
});


