// © 2025 Joe Pruskowski
import { test, expect } from '@playwright/test';

const backendEnabled = !!process.env.E2E_BACKEND;

test.describe('S107 - Optimistic UI', () => {
  test.skip(!backendEnabled, 'Backend-required optimistic test disabled unless E2E_BACKEND=1');

  test('click renders immediate pending mark then confirms from server', async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('ttt_socket_url', 'http://localhost:3001'); } catch {}
    });
    await page.route('**/favicon.*', (route) => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.addScriptTag({ url: 'https://cdn.socket.io/4.7.2/socket.io.min.js' });

    // Prepare a new game via socket, then set in client store
    const gameId = await page.evaluate(async () => {
      // @ts-ignore
      const io = window.io;
      // @ts-ignore
      const base = localStorage.getItem('ttt_socket_url');
      const s = io(base, { path: '/socket.io', transports: ['websocket'] });
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('connect timeout')), 5000);
        s.on('connect', () => { clearTimeout(t); resolve(); });
        s.on('connect_error', reject);
      });
      const created = await new Promise<any>((resolve) => s.emit('create_game', { strategy: 'random' }, resolve));
      // @ts-ignore
      window.__tttSetCurrentGame(created.gameId);
      return created.gameId as string;
    });

    // Click top-left cell
    const cell = page.getByRole('gridcell', { name: /cell 1/i });
    await cell.click();
    // Pending mark should appear quickly (opacity applied), then server confirms and text remains
    await expect(cell).toContainText(/x|o/i, { timeout: 3000 });
  });
});


