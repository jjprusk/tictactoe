// © 2025 Joe Pruskowski
import { test, expect } from '@playwright/test';

const backendEnabled = !!process.env.E2E_BACKEND;

test.describe('S106g - Admin flows', () => {
  test.skip(!backendEnabled, 'Backend-required admin tests disabled unless E2E_BACKEND=1');

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

  test('elevate admin, list games, close game, and room_info happy path', async ({ page }) => {
    const res = await page.evaluate(async () => {
      // @ts-ignore
      const base = localStorage.getItem('ttt_socket_url');
      // @ts-ignore
      const admin = window.io(base, { path: '/socket.io', transports: ['websocket'] });
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('connect timeout')), 5000);
        admin.on('connect', () => { clearTimeout(t); resolve(); });
        admin.on('connect_error', reject);
      });
      const elev = await new Promise<any>((resolve) => admin.emit('elevate_admin', { adminKey: 'test-admin-key' }, resolve));
      // Create a game via another socket
      // @ts-ignore
      const p1 = window.io(base, { path: '/socket.io', transports: ['websocket'] });
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('connect timeout')), 5000);
        p1.on('connect', () => { clearTimeout(t); resolve(); });
        p1.on('connect_error', reject);
      });
      const created = await new Promise<any>((resolve) => p1.emit('create_game', { strategy: 'random' }, resolve));
      const gameId = created.gameId as string;
      const list = await new Promise<any>((resolve) => admin.emit('admin:list_games', {}, resolve));
      const info = await new Promise<any>((resolve) => admin.emit('admin:room_info', { gameId }, resolve));
      const closed = await new Promise<any>((resolve) => admin.emit('admin:close_game', { gameId }, resolve));
      return { elev, list, info, closed, gameId };
    });

    expect(res.elev).toEqual({ ok: true, role: 'admin' });
    expect(res.list.ok).toBe(true);
    // list.games now returns objects with gameId; assert by mapping ids
    const ids = Array.isArray((res.list as any).games) ? (res.list as any).games.map((g: any) => g.gameId) : [];
    expect(ids).toContain(res.gameId);
    expect(res.info.ok).toBe(true);
    expect(res.info.gameId).toBe(res.gameId);
    expect(res.closed).toEqual({ ok: true });
  });
});


