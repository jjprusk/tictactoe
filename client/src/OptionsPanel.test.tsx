// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

describe('OptionsPanel', () => {
  it('renders strategy select and updates localStorage on change', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const { default: OptionsPanel } = await import('./OptionsPanel');

    await act(async () => {
      root.render(React.createElement(OptionsPanel));
    });

    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select).toBeTruthy();

    await act(async () => {
      select.value = 'ai';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Our storage key per clientLogger is 'ttt_strategy'
    expect(window.localStorage.getItem('ttt_strategy')).toBe('ai');
  });
});


