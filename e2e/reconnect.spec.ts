// © 2025 Joe Pruskowski
import { test, expect } from '@playwright/test';

const backendEnabled = !!process.env.E2E_BACKEND;

test.describe('S106f - Reconnect with sessionToken', () => {
  test.skip(!backendEnabled, 'Backend-required reconnect test disabled unless E2E_BACKEND=1');

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('ttt_socket_url', 'http://localhost:3001'); } catch {}
    });
    await page.route('**/favicon.*', (route) => route.fulfill({ status: 204, body: '' }));
    await page.route('**/*.webmanifest', (route) => route.fulfill({ status: 204, body: '' }));
    await page.route('**/robots.txt', (route) => route.fulfill({ status: 204, body: '' }));
    await page.route('**/logs', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 204, body: '' });
      } else {
        await route.fallback();
      }
    });
    await page.goto('/');
    await page.addScriptTag({ url: 'https://cdn.socket.io/4.7.2/socket.io.min.js' });
  });

  test('disconnect and rejoin as same player using sessionToken', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // @ts-ignore
      const base = localStorage.getItem('ttt_socket_url');
      // @ts-ignore
      const s1 = window.io(base, { path: '/socket.io', transports: ['websocket'] });
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('connect timeout')), 5000);
        s1.on('connect', () => { clearTimeout(t); resolve(); });
        s1.on('connect_error', reject);
      });
      const createAck = await new Promise<any>((resolve) => s1.emit('create_game', { strategy: 'random' }, resolve));
      if (!createAck?.ok) throw new Error('expected ok create_game');
      const gameId = createAck.gameId as string;
      const sessionToken = createAck.sessionToken as string;
      const player = createAck.player as string;
      s1.disconnect();

      // @ts-ignore
      const s2 = window.io(base, { path: '/socket.io', transports: ['websocket'] });
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('connect timeout')), 5000);
        s2.on('connect', () => { clearTimeout(t); resolve(); });
        s2.on('connect_error', reject);
      });
      const resumeAck = await new Promise<any>((resolve) => s2.emit('join_game', { gameId, sessionToken }, resolve));
      return { createAck, resumeAck, player };
    });

    expect(result.createAck.ok).toBe(true);
    expect(typeof result.createAck.sessionToken).toBe('string');
    expect(result.resumeAck.ok).toBe(true);
    expect(result.resumeAck.role).toBe('player');
    // When resuming as player, server may not always echo player letter; if present, ensure matches
    if (result.resumeAck.player) {
      expect(result.resumeAck.player).toBe(result.player);
    }
  });
});


