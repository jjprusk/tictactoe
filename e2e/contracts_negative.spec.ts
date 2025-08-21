// © 2025 Joe Pruskowski
import { test, expect } from '@playwright/test';

const backendEnabled = !!process.env.E2E_BACKEND;

test.describe('Socket.IO contracts - negative paths', () => {
  test.skip(!backendEnabled, 'Backend-required negative contracts tests disabled unless E2E_BACKEND=1');

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

  test('invalid payloads return standardized error acks', async ({ page }) => {
    // Create a socket connection
    await page.evaluate(async () => {
      // @ts-ignore
      const s = window.io(localStorage.getItem('ttt_socket_url'), { path: '/socket.io', transports: ['websocket'] });
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('connect timeout')), 5000);
        s.on('connect', () => { clearTimeout(t); resolve(); });
        s.on('connect_error', reject);
      });
      // invalid create_game
      await new Promise<void>((resolve) => {
        s.emit('create_game', { strategy: 'bogus' }, (ack: any) => {
          if (ack && ack.ok === false && typeof ack.error === 'string') resolve();
          else throw new Error('expected error ack for invalid create_game');
        });
      });
      // valid create_game to get gameId
      const ok = await new Promise<any>((resolve) => s.emit('create_game', { strategy: 'random' }, resolve));
      if (!ok?.ok) throw new Error('expected ok create_game');
      const gameId = ok.gameId as string;
      // invalid join_game
      await new Promise<void>((resolve) => {
        s.emit('join_game', { gameId: '' }, (ack: any) => {
          if (ack && ack.ok === false) resolve(); else throw new Error('expected error ack for invalid join_game');
        });
      });
      // invalid make_move (bad position)
      await new Promise<void>((resolve) => {
        s.emit('make_move', { gameId, position: -1, player: 'X', nonce: 'n-bad' }, (ack: any) => {
          if (ack && ack.ok === false) resolve(); else throw new Error('expected error ack for invalid make_move');
        });
      });
    });
  });

  test('duplicate nonce yields error on second make_move', async ({ page }) => {
    const res = await page.evaluate(async () => {
      // @ts-ignore
      const s = window.io(localStorage.getItem('ttt_socket_url'), { path: '/socket.io', transports: ['websocket'] });
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('connect timeout')), 5000);
        s.on('connect', () => { clearTimeout(t); resolve(); });
        s.on('connect_error', reject);
      });
      const create = await new Promise<any>((resolve) => s.emit('create_game', { strategy: 'random' }, resolve));
      if (!create?.ok) throw new Error('expected ok create_game');
      const gameId = create.gameId as string;
      // First move ok
      const ack1 = await new Promise<any>((resolve) => s.emit('make_move', { gameId, position: 0, player: 'X', nonce: 'dup-1' }, resolve));
      // Duplicate nonce should error
      const ack2 = await new Promise<any>((resolve) => s.emit('make_move', { gameId, position: 1, player: 'X', nonce: 'dup-1' }, resolve));
      return { ack1, ack2 };
    });
    expect(res.ack1?.ok).toBe(true);
    expect(res.ack2?.ok).toBe(false);
  });

  test('ack timeout is handled when event is not recognized', async ({ page }) => {
    const timedOut = await page.evaluate(async () => {
      // @ts-ignore
      const s = window.io(localStorage.getItem('ttt_socket_url'), { path: '/socket.io', transports: ['websocket'] });
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('connect timeout')), 5000);
        s.on('connect', () => { clearTimeout(t); resolve(); });
        s.on('connect_error', reject);
      });
      const withTimeout = (ms: number) => new Promise<'timeout' | 'ack'>((resolve) => {
        let settled = false;
        const to = setTimeout(() => { if (!settled) { settled = true; resolve('timeout'); } }, ms);
        s.emit('nonexistent:event', { foo: 'bar' }, () => { if (!settled) { settled = true; clearTimeout(to); resolve('ack'); } });
      });
      return await withTimeout(1000);
    });
    expect(timedOut).toBe('timeout');
  });
});


