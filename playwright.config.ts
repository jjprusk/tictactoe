// © 2025 Joe Pruskowski
import { defineConfig, devices } from '@playwright/test';
import { spawn } from 'node:child_process';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      // Build client (ensures Tailwind compiled)
      command: 'npm --workspace client run build',
      timeout: 120_000,
      reuseExistingServer: true,
      cwd: process.cwd(),
    },
    {
      // Preview the built client
      command: 'npm --workspace client run preview',
      url: 'http://localhost:5173',
      timeout: 60_000,
      reuseExistingServer: true,
      cwd: process.cwd(),
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});


