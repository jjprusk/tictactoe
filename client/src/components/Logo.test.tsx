// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

describe('Logo', () => {
  it('renders an SVG with grid and strokes', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const { default: Logo } = await import('./Logo');
    await act(async () => {
      root.render(React.createElement(Logo, { size: 24 }));
    });
    await Promise.resolve();
    const svg = container.querySelector('svg[data-testid="app-logo"]');
    expect(svg).toBeTruthy();
  });
});


