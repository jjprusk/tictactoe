// © 2025 Joe Pruskowski
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
      provider: 'v8',
      thresholds: {
        lines: 0.6,
        functions: 0.6,
        statements: 0.6,
        branches: 0.5,
      },
    },
  },
});


