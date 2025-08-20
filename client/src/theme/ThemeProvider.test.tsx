// © 2025 Joe Pruskowski
import React from 'react';
import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, useTheme } from './ThemeProvider';

const Probe: React.FC = () => {
  const { theme, toggleTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="mode">{theme}</span>
      <button data-testid="toggle" onClick={() => toggleTheme()} />
      <button data-testid="set-dark" onClick={() => setTheme('dark')} />
      <button data-testid="set-light" onClick={() => setTheme('light')} />
    </div>
  );
};

describe('ThemeProvider', () => {
  it('applies dark class on documentElement and persists choice', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>
      );
    });

    // default is light
    const modeEl = container.querySelector('[data-testid="mode"]')!;
    expect(modeEl.textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // set dark
    await act(async () => {
      (container.querySelector('[data-testid="set-dark"]') as HTMLButtonElement).click();
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem('ttt_theme')).toBe('dark');

    // toggle back to light
    await act(async () => {
      (container.querySelector('[data-testid="toggle"]') as HTMLButtonElement).click();
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem('ttt_theme')).toBe('light');
  });
});


