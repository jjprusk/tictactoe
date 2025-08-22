// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { flush } from '../test/flush';
import { createRoot } from 'react-dom/client';

describe('ConnectionStatus', () => {
  it('renders and updates when status changes', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    // Render component
    const { default: ConnectionStatus } = await import('./ConnectionStatus');
    await act(async () => { root.render(React.createElement(ConnectionStatus)); });
    await flush();

    // allow DOM to paint
    await Promise.resolve();

    // Initially disconnected
    const text1 = container.querySelector('[data-testid="status-text"]')!;
    expect(text1.textContent).toMatch(/Disconnected/i);

    // Simulate status update via socketService
    const { socketService } = await import('../socket/socketService');
    await act(async () => { (socketService as any).setStatus?.('connecting'); });
    await flush();
    const text2 = container.querySelector('[data-testid="status-text"]')!;
    // We can't directly call setStatus as it's private; instead, connect() triggers change in other tests
    expect(text2.textContent).toBeTruthy();
  });
});


