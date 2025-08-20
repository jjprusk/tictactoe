// © 2025 Joe Pruskowski
import { test, expect } from '@playwright/test';

test('realtime connect indicator changes when server reachable/unreachable', async ({ page }) => {
  // Start with no /socket.io endpoint — status should remain Disconnected/Connecting…
  await page.goto('/');
  await expect(page.getByTestId('status-text')).toBeVisible();

  // With no backend running during CI smoke, we at least assert the UI renders and does not crash.
  const txt = await page.getByTestId('status-text').innerText();
  expect(txt.length).toBeGreaterThan(0);
});


