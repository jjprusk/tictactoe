// © 2025 Joe Pruskowski
import { describe, it, expect, vi } from 'vitest';
import { makeMove, normalizeStrategy } from './orchestrator';

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

  it('routes ai1/ai2/ai3 to ai0 behavior (random picker) for now', async () => {
    const board = [null, 'X', null, null, 'O', null, null, null, null] as any;
    const spy = vi.spyOn(await import('./random'), 'pickRandomMove');
    await makeMove(board, 'X', 'ai1' as any);
    await makeMove(board, 'X', 'ai2' as any);
    await makeMove(board, 'X', 'ai3' as any);
    expect(spy).toHaveBeenCalledTimes(3);
    spy.mockRestore();
  });

  it('normalizeStrategy maps legacy and passes through new values', () => {
    expect(normalizeStrategy('random')).toBe('ai0');
    // legacy removed in contracts; normalization still accepts but maps to ai1
    expect(normalizeStrategy('ai')).toBe('ai1');
    expect(normalizeStrategy('ai0')).toBe('ai0');
    expect(normalizeStrategy('ai1')).toBe('ai1');
    expect(normalizeStrategy('ai2')).toBe('ai2');
    expect(normalizeStrategy('ai3')).toBe('ai3');
    expect(normalizeStrategy(undefined)).toBe('ai0');
    expect(normalizeStrategy(null as unknown as string)).toBe('ai0');
    expect(normalizeStrategy('weird')).toBe('ai0');
  });

  it('normalizeStrategy table covers expected mappings', () => {
    const cases: Array<[any, string]> = [
      ['random', 'ai0'],
      ['ai', 'ai1'],
      ['ai0', 'ai0'],
      ['ai1', 'ai1'],
      ['ai2', 'ai2'],
      ['ai3', 'ai3'],
      [undefined, 'ai0'],
      [null, 'ai0'],
      ['garbage', 'ai0'],
    ];
    for (const [inp, out] of cases) {
      expect(normalizeStrategy(inp as any)).toBe(out);
    }
  });

  it('makeMove accepts all strategy variants and returns legal or -1', async () => {
    const strategies = ['ai0','ai1','ai2','ai3'] as const;
    const board = [null, 'X', null, null, 'O', null, null, null, null] as any;
    for (const s of strategies) {
      const pos = await makeMove(board, 'X', s as any);
      expect(typeof pos).toBe('number');
      if (pos !== -1) {
        expect(pos).toBeGreaterThanOrEqual(0);
        expect(pos).toBeLessThan(9);
        expect(board[pos]).toBeNull();
      }
    }
    const full = ['X','O','X','O','X','O','X','O','X'] as any;
    for (const s of strategies) {
      const pos = await makeMove(full, 'X', s as any);
      expect(pos).toBe(-1);
    }
  });
});


