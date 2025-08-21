// © 2025 Joe Pruskowski
import { test, expect } from '@playwright/test';

const backendEnabled = !!process.env.E2E_BACKEND;

test.describe('Socket.IO contracts - happy paths', () => {
  test.skip(!backendEnabled, 'Backend-required contracts tests disabled unless E2E_BACKEND=1');

  test('create_game -> join_game (player) -> join_game (observer) -> leave_game', async ({ page }) => {
    // Force client to use API server and silence preview-only asset requests
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

    // Navigate to host page to enable localStorage
    await page.goto('/');

    // Load socket.io client UMD from CDN into the page
    await page.addScriptTag({ url: 'https://cdn.socket.io/4.7.2/socket.io.min.js' });

    // Establish first socket and create game
    const createRes = await page.evaluate(async () => {
      // @ts-ignore - provided by addScriptTag
      const s1 = window.io(localStorage.getItem('ttt_socket_url'), { path: '/socket.io', transports: ['websocket'] });
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('connect timeout')), 5000);
        s1.on('connect', () => { clearTimeout(t); resolve(); });
        s1.on('connect_error', reject);
      });
      const ack = await new Promise<any>((resolve) => s1.emit('create_game', { strategy: 'random' }, resolve));
      return { ack, id: s1.id };
    });

    expect(createRes.ack?.ok).toBe(true);
    expect(typeof createRes.ack.gameId).toBe('string');
    expect(createRes.ack.gameId.length).toBeGreaterThan(0);
    expect(createRes.ack.player).toBe('X');
    expect(typeof createRes.ack.sessionToken).toBe('string');

    const gameId: string = createRes.ack.gameId;

    // Second socket joins game as player/observer depending on availability
    const joinRes = await page.evaluate(async (gid) => {
      // @ts-ignore
      const s2 = window.io(localStorage.getItem('ttt_socket_url'), { path: '/socket.io', transports: ['websocket'] });
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('connect timeout')), 5000);
        s2.on('connect', () => { clearTimeout(t); resolve(); });
        s2.on('connect_error', reject);
      });
      const ack = await new Promise<any>((resolve) => s2.emit('join_game', { gameId: gid }, resolve));
      return { ack };
    }, gameId);

    expect(joinRes.ack?.ok).toBe(true);
    expect(['player', 'observer']).toContain(joinRes.ack.role);
    if (joinRes.ack.role === 'player') {
      expect(joinRes.ack.player).toBe('O');
    }

    // Third socket joins as observer (should be observer once both players filled)
    const joinObs = await page.evaluate(async (gid) => {
      // @ts-ignore
      const s3 = window.io(localStorage.getItem('ttt_socket_url'), { path: '/socket.io', transports: ['websocket'] });
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('connect timeout')), 5000);
        s3.on('connect', () => { clearTimeout(t); resolve(); });
        s3.on('connect_error', reject);
      });
      const ack = await new Promise<any>((resolve) => s3.emit('join_game', { gameId: gid }, resolve));
      return { ack };
    }, gameId);

    expect(joinObs.ack?.ok).toBe(true);
    expect(joinObs.ack.role).toBe('observer');

    // Leave game via a temporary socket
    const leaveRes = await page.evaluate(async (gid) => {
      // @ts-ignore
      const s4 = window.io(localStorage.getItem('ttt_socket_url'), { path: '/socket.io', transports: ['websocket'] });
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('connect timeout')), 5000);
        s4.on('connect', () => { clearTimeout(t); resolve(); });
        s4.on('connect_error', reject);
      });
      const ack = await new Promise<any>((resolve) => s4.emit('leave_game', { gameId: gid }, resolve));
      return { ack };
    }, gameId);

    expect(leaveRes.ack?.ok).toBe(true);
  });
});


