import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// Load variables from .env into process.env (if present)
loadDotenv();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Allow 0 to request an ephemeral port in tests; production should use >0
  SERVER_PORT: z.coerce.number().int().min(0).max(65535).default(3001),

  MONGO_URI: z
    .string()
    .default('mongodb://localhost:27017/tictactoe')
    .refine(
      (v) => v.startsWith('mongodb://') || v.startsWith('mongodb+srv://'),
      'MONGO_URI must start with mongodb:// or mongodb+srv://'
    ),

  REDIS_URL: z
    .string()
    .default('redis://localhost:6379')
    .refine((v) => v.startsWith('redis://') || v.startsWith('rediss://'), 'REDIS_URL must start with redis:// or rediss://'),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters').default('change-me'),

  // Optional/advanced
  AI_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  MODEL_REGISTRY_DIR: z.string().min(1).default('./server/models'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  PROMETHEUS_ENABLE: z.coerce.boolean().default(false),
  EMA_DEFAULT_N: z.coerce.number().int().positive().default(3),

  // Mongo retry config
  MONGO_MAX_RETRIES: z.coerce.number().int().min(0).default(5),
  MONGO_RETRY_INITIAL_MS: z.coerce.number().int().min(10).default(200),
  MONGO_RETRY_MAX_MS: z.coerce.number().int().min(50).default(2000),
});

export type AppConfig = z.infer<typeof EnvSchema>;

/**
 * Validates process.env against EnvSchema and returns a typed, frozen config object.
 * Throws an Error with a readable message when validation fails.
 */
export function loadConfig(): Readonly<AppConfig> {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${message}`);
  }
  return Object.freeze(parsed.data);
}

export const appConfig = loadConfig();


