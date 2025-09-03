// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { flush } from '../test/flush';

vi.mock('../socket/socketService', () => {
  const handlers: Record<string, Array<(p: unknown) => void>> = {};
  return {
    socketService: {
      on: vi.fn((ev: string, h: (p: unknown) => void) => {
        handlers[ev] = handlers[ev] || [];
        handlers[ev].push(h);
      }),
      off: vi.fn((ev: string, h: (p: unknown) => void) => {
        handlers[ev] = (handlers[ev] || []).filter((x) => x !== h);
      }),
      // Helper for tests to emit
      __emit: (ev: string, payload: unknown) => {
        (handlers[ev] || []).forEach((h) => h(payload));
      },
    },
  };
});

async function render(): Promise<{ container: HTMLDivElement; unmount: () => void; svc: any }> {
  const container = document.createElement('div');
  const root = createRoot(container);
  const mod = await import('./NoticeBanner');
  const svc = (await import('../socket/socketService')) as any;
  root.render(React.createElement(mod.default));
  await flush();
  return { container, unmount: () => root.unmount(), svc };
}

describe('NoticeBanner', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders nothing by default', async () => {
    const { container, unmount } = await render();
    expect(container.textContent?.trim()).toBe('');
    unmount();
  });

  it('shows message when room:notice arrives and can be dismissed', async () => {
    const { container, unmount, svc } = await render();
    // Emit valid notice
    svc.socketService.__emit('room:notice', { message: 'A player joined. Game reset to head-to-head.' });
    await flush();
    expect(container.textContent).toContain('Game reset to head-to-head');
    const dismiss = container.querySelector('button[aria-label="Dismiss notice"]') as HTMLButtonElement;
    dismiss?.click();
    await flush();
    // After dismiss, content disappears
    expect(container.textContent?.trim()).toBe('');
    unmount();
  });

  it('ignores non-string messages', async () => {
    const { container, unmount, svc } = await render();
    svc.socketService.__emit('room:notice', { message: 123 as any });
    svc.socketService.__emit('room:notice', {} as any);
    await flush();
    expect(container.textContent?.trim()).toBe('');
    unmount();
  });
});


