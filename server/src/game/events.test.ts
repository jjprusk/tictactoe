// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import { parseGameEvent } from './events';

describe('game/events', () => {
  it('parses MoveMade events', () => {
    const evt = parseGameEvent({ type: 'MoveMade', move: 4, player: 'X', board: Array(9).fill(null) });
    expect(evt.type).toBe('MoveMade');
  });

  it('parses GameOver events', () => {
    const evt = parseGameEvent({ type: 'GameOver', winner: 'draw', finalBoard: Array(9).fill('X') });
    expect(evt.type).toBe('GameOver');
  });

  it('rejects invalid payloads', () => {
    expect(() => parseGameEvent({})).toThrow();
    expect(() => parseGameEvent({ type: 'MoveMade', move: 10, player: 'X', board: Array(9).fill(null) })).toThrow();
  });
});


