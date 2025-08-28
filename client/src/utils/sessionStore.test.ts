// © 2025 Joe Pruskowski
import { describe, it, expect, vi } from 'vitest';
import { sessionStore } from './sessionStore';

describe('sessionStore', () => {
  it('set/get/remove works with localStorage', () => {
    sessionStore.set('k1', 'v1');
    expect(sessionStore.get('k1')).toBe('v1');
    sessionStore.remove('k1');
    expect(sessionStore.get('k1')).toBeNull();
  });

  it('swallows storage errors gracefully', () => {
    const setSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('nope');
    });
    expect(() => sessionStore.set('k2', 'v2')).not.toThrow();
    setSpy.mockRestore();
  });
});


