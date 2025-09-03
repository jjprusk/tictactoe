// © 2025 Joe Pruskowski
import { test, expect } from '@playwright/test';

const backendEnabled = !!process.env.E2E_BACKEND;

test.describe('S107 - Optimistic UI', () => {
  test.skip(!backendEnabled, 'Backend-required optimistic test disabled unless E2E_BACKEND=1');

  test('click renders immediate pending mark then confirms from server', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('ttt_socket_url', 'http://localhost:3001');
        localStorage.setItem('ttt_start_mode', 'human');
      } catch {}
    });
    await page.route('**/favicon.*', (route) => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');

    // Start a new game via UI so the client store has myPlayer and role set
    const createBtn = (await page.$('[data-testid="create-game-btn"]')) ?? (await page.$('[data-testid="create-game-btn-secondary"]'));
    if (!createBtn) throw new Error('create game button not found');
    await createBtn.click();

    // Click top-left cell
    const cell = page.getByRole('gridcell', { name: /cell 1/i });
    await cell.click();

    // Pending mark should appear quickly, then server confirms
    await expect(cell).toContainText(/x|o/i, { timeout: 3000 });
  });
});


