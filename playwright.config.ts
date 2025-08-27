// © 2025 Joe Pruskowski
import { defineConfig, devices } from '@playwright/test';
import { spawn } from 'node:child_process';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    video: (process.env.PW_VIDEO as any) === 'on' ? 'on' : 'retain-on-failure',
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  webServer: [
    {
      // Start server API for realtime tests
      command: 'npm --workspace server run dev',
      url: 'http://localhost:3001/healthz',
      timeout: 120_000,
      reuseExistingServer: true,
      cwd: process.cwd(),
      env: { ADMIN_KEY: 'test-admin-key' },
    },
    {
      // Preview the built client (scripts/e2e-start.sh builds beforehand)
      command: 'npm --workspace client run preview -- --strictPort',
      url: 'http://localhost:5173',
      timeout: 120_000,
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


