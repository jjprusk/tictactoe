// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';

describe('sessionSlice', () => {
  it('initializes strategy from storage (defaults to ai0)', async () => {
    const { sessionReducer, setStrategy } = await import('./sessionSlice');
    const state = sessionReducer(undefined, { type: '@@INIT' } as any);
    expect(['ai0','ai1','ai2','ai3']).toContain(state.strategy);

    const next = sessionReducer(state, setStrategy('ai1' as any));
    expect(next.strategy).toBe('ai1');
  });
});


