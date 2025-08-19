// © 2025 Joe Pruskowski
import { test, expect } from '@playwright/test';

test('renders header, applies Tailwind, theme persists, and /logs works', async ({ page }) => {
  // intercept /logs to avoid needing server during smoke; just validate the POST hits
  await page.route('**/logs', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 204, body: '' });
    } else {
      await route.fallback();
    }
  });

  await page.goto('/');

  // Header text
  await expect(page.getByText('TicTacToe')).toBeVisible();

  // Tailwind styles: check computed style from class on header
  const h1 = page.locator('h1');
  await expect(h1).toBeVisible();
  const color = await h1.evaluate((el) => getComputedStyle(el).color);
  expect(color).not.toBe('rgb(0, 0, 0)');

  // Theme persistence: set to dark in localStorage, reload, body should carry dark effects on root
  await page.evaluate(() => localStorage.setItem('ttt_theme', 'dark'));
  await page.reload();
  const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  expect(hasDark).toBe(true);

  // Send Test Log button posts /logs
  const btn = page.getByRole('button', { name: /send test log/i });
  await expect(btn).toBeVisible();
  await Promise.all([
    page.waitForRequest((req) => req.url().endsWith('/logs') && req.method() === 'POST'),
    btn.click(),
  ]);
});


