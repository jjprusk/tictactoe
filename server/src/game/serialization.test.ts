// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import { createInitialState } from './state';
import { deserializeGameState, serializeGameState } from './serialization';

describe('game/serialization', () => {
  it('round-trips a basic state', () => {
    const s = createInitialState('X');
    const json = serializeGameState(s);
    const back = deserializeGameState(json);
    expect(back).toEqual(s);
  });

  it('validates board length and cell values', () => {
    expect(() => deserializeGameState({ board: [null], currentPlayer: 'X', moves: [] })).toThrow();
    expect(() => deserializeGameState({ board: Array(9).fill('Z'), currentPlayer: 'X', moves: [] })).toThrow();
  });

  it('validates player and moves range', () => {
    expect(() => deserializeGameState({ board: Array(9).fill(null), currentPlayer: 'Q', moves: [] })).toThrow();
    expect(() => deserializeGameState({ board: Array(9).fill(null), currentPlayer: 'X', moves: [9] })).toThrow();
  });
});


