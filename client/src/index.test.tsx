// © 2025 Joe Pruskowski
import { describe, it, expect, vi } from 'vitest';

const renderSpy = vi.fn();
const createRootSpy = vi.fn(() => ({ render: renderSpy } as any));

vi.mock('react-dom/client', () => ({
  createRoot: createRootSpy,
}));

describe('index.tsx entry', () => {
  it('calls createRoot and render with #root', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    await import('./index');

    expect(createRootSpy).toHaveBeenCalled();
    expect(renderSpy).toHaveBeenCalled();
  });
});


