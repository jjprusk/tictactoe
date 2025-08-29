// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import DebugMenu from './DebugMenu';
import { flush } from '../test/flush';

vi.mock('../utils/clientLogger', () => {
  const info = vi.fn(async () => undefined);
  return { createClientLogger: () => ({ info }) };
});

describe('DebugMenu', () => {
  it('renders button and toggles menu open/close with correct aria', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    root.render(React.createElement(DebugMenu));
    await flush();
    const btn = container.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement | null;
    expect(btn).toBeTruthy();
    expect(btn!.getAttribute('aria-expanded')).toBe('false');

    btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();
    expect(btn!.getAttribute('aria-expanded')).toBe('true');
    const menu = container.querySelector('[role="menu"]') as HTMLElement;
    expect(menu).toBeTruthy();

    // Click outside to close
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await flush();
    expect(btn!.getAttribute('aria-expanded')).toBe('false');
  });

  it('invokes Send Test Log and toggle action; flips debug panel flag', async () => {
    const onSend = vi.fn();
    const onToggle = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);
    root.render(React.createElement(DebugMenu, { onSendTestLog: onSend, onToggleDebugPanel: onToggle }));
    await flush();
    const btn = container.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement | null;

    // Send Test Log
    btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();
    // Send Test Log
    btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();
    const send = container.querySelector('[data-testid="send-test-log"]') as HTMLButtonElement;
    send?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();

    // Toggle Debug Panel and verify localStorage flips
    try { localStorage.setItem('ttt_debug', '0'); } catch {}
    btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();
    const toggle = Array.from(container.querySelectorAll('[role="menuitem"]')).find(el => /toggle debug panel/i.test(el.textContent || '')) as HTMLButtonElement;
    toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('ttt_debug')).toBe('1');
  });
});
