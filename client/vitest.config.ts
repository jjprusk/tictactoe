// © 2025 Joe Pruskowski
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});


