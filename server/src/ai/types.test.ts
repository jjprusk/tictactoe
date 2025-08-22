// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import { AIRequestSchema, AIResponseSchema } from './types';

describe('AI types', () => {
  it('validates AIRequest and AIResponse schemas', () => {
    const req = AIRequestSchema.parse({
      board: [null, null, null, null, 'X', null, null, null, null],
      currentPlayer: 'O',
    });
    expect(req.currentPlayer).toBe('O');

    const res = AIResponseSchema.parse({ position: 4 });
    expect(res.position).toBe(4);
  });
});


