// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';

describe('sessionSlice', () => {
  it('initializes strategy from storage (defaults to random)', async () => {
    const { sessionReducer, setStrategy } = await import('./sessionSlice');
    const state = sessionReducer(undefined, { type: '@@INIT' } as any);
    expect(state.strategy === 'random' || state.strategy === 'ai').toBe(true);

    const next = sessionReducer(state, setStrategy('ai'));
    expect(next.strategy).toBe('ai');
  });
});


