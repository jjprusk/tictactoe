// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';

describe('Redux store', () => {
  it('creates a store with session slice and exposes dispatch/getState', async () => {
    const { store } = await import('./store');
    expect(store).toBeTruthy();
    expect(typeof store.dispatch).toBe('function');
    expect(typeof store.getState).toBe('function');
    // With session slice present
    const state = store.getState();
    expect(state).toHaveProperty('session');
    expect(['ai0','ai1','ai2','ai3']).toContain(state.session.strategy);
  });
});


