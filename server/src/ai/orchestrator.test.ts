// © 2025 Joe Pruskowski
import { describe, it, expect, vi } from 'vitest';
import { makeMove } from './orchestrator';

describe('makeMove orchestrator', () => {
  it('uses random strategy to pick a legal move', async () => {
    const board = [null, 'X', null, null, 'O', null, null, null, null] as any;
    const pos = await makeMove(board, 'X', 'random');
    expect(pos).toBeGreaterThanOrEqual(0);
    expect(pos).toBeLessThan(9);
    expect(board[pos]).toBeNull();
  });

  it('returns -1 when no legal moves', async () => {
    const full = ['X','O','X','O','X','O','X','O','X'] as any;
    const pos = await makeMove(full, 'O', 'random');
    expect(pos).toBe(-1);
  });

  it('records latency metric even when random throws', async () => {
    const { pickRandomMove } = await import('./random');
    const spy = vi.spyOn(await import('../metrics'), 'observeMoveLatencySeconds');
    const board = [null, null, null, null, null, null, null, null, null] as any;
    // Force error path by mocking random picker
    vi.spyOn(await import('./random'), 'pickRandomMove').mockImplementation(() => { throw new Error('boom'); });
    const pos = await makeMove(board, 'X', 'random');
    expect(pos).toBe(-1);
    expect(spy).toHaveBeenCalled();
    (pickRandomMove as any).mockRestore?.();
    spy.mockRestore();
  });
});


