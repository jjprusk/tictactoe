// © 2025 Joe Pruskowski
import { test, expect } from '@playwright/test';

const skipIfNoBackend = !process.env.E2E_BACKEND;

// Helper to stub noisy assets and set socket URL before page scripts run
async function preparePage(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    try {
      // Force client to connect directly to server in preview
      window.localStorage.setItem('ttt_socket_url', 'http://localhost:3001');
    } catch {}
  });
  await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
  await page.route('**/favicon.svg', (route) => route.fulfill({ status: 204, body: '' }));
  await page.route('**/robots.txt', (route) => route.fulfill({ status: 204, body: '' }));
  await page.route('**/apple-touch-icon.png', (route) => route.fulfill({ status: 204, body: '' }));
  await page.route('**/manifest.webmanifest', (route) => route.fulfill({ status: 204, body: '' }));
  // Silence /logs in preview mode
  await page.route('**/logs*', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 204, body: '' });
    } else {
      await route.fallback();
    }
  });
}

// S010: E2E Watch flow: open lobby → watch → board renders, inputs disabled
(test.skip as any)(skipIfNoBackend, 'Backend not enabled (set E2E_BACKEND=1)');

test.describe('E2E watch flow (S010)', () => {
  test.setTimeout(60_000);

  test('lobby list → Watch joins as observer; board renders and input is disabled', async ({ page, context }) => {
    // Page 1: create a room to watch
    await preparePage(page);
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('ttt_strategy', 'ai0');
        window.localStorage.setItem('ttt_start_mode', 'human');
      } catch {}
    });
    await page.goto('/');
    await page.waitForSelector('#root', { state: 'attached', timeout: 20_000 });
    await page.getByTestId('app-title').waitFor({ state: 'visible' });
    const createBtn = (await page.$('[data-testid="create-game-btn"]')) ?? (await page.$('[data-testid="create-game-btn-secondary"]'));
    if (!createBtn) throw new Error('create game button not found');
    await createBtn.click();
    // Ensure a room badge shows up with a room id
    const roomBadge = page.getByTestId('game-room-badge');
    await expect(roomBadge).toBeVisible({ timeout: 10_000 });

    // Page 2: open lobby and click Watch on the first room
    const watcher = await context.newPage();
    await preparePage(watcher);
    await watcher.goto('/');
    await watcher.waitForSelector('#root', { state: 'attached', timeout: 20_000 });
    await watcher.getByTestId('app-title').waitFor({ state: 'visible' });
    // Wait for lobby to populate and click first visible Watch (desktop+mobile both render lobby)
    const firstWatch = watcher.locator('[data-testid^="watch-\"]:visible');
    await firstWatch.first().waitFor({ state: 'visible', timeout: 20_000 });
    await firstWatch.first().click();

    // Board should render
    const grid = watcher.locator('[role="grid"]');
    await expect(grid).toBeVisible({ timeout: 10_000 });

    // As observer, clicking a cell should not place a mark
    const firstCell = watcher.locator('[role="gridcell"][data-idx="0"]');
    const beforeText = (await firstCell.innerText()).trim();
    await firstCell.click();
    const afterText = (await firstCell.innerText()).trim();
    expect(afterText).toBe(beforeText);
  });
});


