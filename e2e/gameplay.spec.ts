// © 2025 Joe Pruskowski
import { test, expect } from '@playwright/test';

const skipIfNoBackend = !process.env.E2E_BACKEND;

// Helper to stub noisy assets and set socket URL before page scripts run
test.beforeEach(async ({ page }) => {
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
});

function gridCell(page, idx: number) {
  return page.locator(`[role="gridcell"][data-idx="${idx}"]`);
}

// S126a: E2E gameplay (HvRandom): human-first, AI-first, alternating
(test.skip as any)(skipIfNoBackend, 'Backend not enabled (set E2E_BACKEND=1)');

test.describe('E2E gameplay (S126a)', () => {
  test.setTimeout(60_000);

  test('human-first: human move then AI responds', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('ttt_start_mode', 'human');
      } catch {}
    });
    await page.goto('/');
    await page.waitForSelector('#root', { state: 'attached', timeout: 20_000 });
    await page.getByTestId('app-title').waitFor({ state: 'visible' });

    // Start new game (mobile layout uses secondary id)
    const createBtn = (await page.$('[data-testid="create-game-btn"]')) ?? (await page.$('[data-testid="create-game-btn-secondary"]'));
    if (!createBtn) throw new Error('create game button not found');
    await createBtn.click();

    // Click center cell (4) as human
    const center = gridCell(page, 4);
    await center.click();
    // Expect a mark to appear in center (X) eventually
    await expect(center).toHaveText(/x|o/i, { timeout: 5_000 });

    // After human move, AI should respond with another mark elsewhere
    // Wait until any other cell shows a mark
    const anyOther = page.locator('[role="gridcell"] >> text=/x|o/i').nth(1);
    await expect(anyOther).toBeVisible({ timeout: 10_000 });
  });

  test('ai-first: AI moves immediately, then human responds', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('ttt_start_mode', 'ai');
      } catch {}
    });
    await page.goto('/');
    await page.waitForSelector('#root', { state: 'attached', timeout: 20_000 });
    await page.getByTestId('app-title').waitFor({ state: 'visible' });

    const createBtn2 = (await page.$('[data-testid="create-game-btn"]')) ?? (await page.$('[data-testid="create-game-btn-secondary"]'));
    if (!createBtn2) throw new Error('create game button not found');
    await createBtn2.click();

    // AI should make an opening move as X without user input
    const firstMark = page.locator('[role="gridcell"] >> text=/x/i');
    await expect(firstMark).toBeVisible({ timeout: 10_000 });

    // Human (O) clicks a different cell
    // Pick the first empty cell
    const emptyCells = page.locator('[role="gridcell"]:has-text("")');
    const count = await emptyCells.count();
    for (let i = 0; i < count; i++) {
      const cell = emptyCells.nth(i);
      try {
        await cell.click();
        break;
      } catch {}
    }
    // After click, ensure at least two marks are present by checking the second mark
    const secondMark = page.locator('[role="gridcell"] >> text=/x|o/i').nth(1);
    await expect(secondMark).toBeVisible({ timeout: 5_000 });
  });

  test('alternate start: first game human-first, second game AI-first', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('ttt_start_mode', 'alternate');
      } catch {}
    });
    await page.goto('/');
    await page.waitForSelector('#root', { state: 'attached', timeout: 20_000 });
    await page.getByTestId('app-title').waitFor({ state: 'visible' });

    // Game 1: should be human-first by default
    const createBtn3 = (await page.$('[data-testid="create-game-btn"]')) ?? (await page.$('[data-testid="create-game-btn-secondary"]'));
    if (!createBtn3) throw new Error('create game button not found');
    await createBtn3.click();
    const beforeMoveMarks1 = page.locator('[role="gridcell"] >> text=/x|o/i');
    await expect(beforeMoveMarks1).toHaveCount(0);
    // Human makes opening move
    await gridCell(page, 0).click();
    await expect(gridCell(page, 0)).toHaveText(/x|o/i, { timeout: 5_000 });

    // Reset to create a second game scenario
    // Click New Game again to open a new room (alternation occurs on server create)
    const createBtn4 = (await page.$('[data-testid="create-game-btn"]')) ?? (await page.$('[data-testid="create-game-btn-secondary"]'));
    if (!createBtn4) throw new Error('create game button not found');
    await createBtn4.click();

    // Game 2: should be AI-first now; expect an X to appear without clicking
    const aiFirstMark = page.locator('[role="gridcell"] >> text=/x/i');
    await expect(aiFirstMark).toBeVisible({ timeout: 10_000 });
  });
});
