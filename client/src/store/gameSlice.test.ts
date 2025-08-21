// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import { gameReducer, setCurrentGame, applyOptimisticMove, moveRejected, gameStateReceived, type GameClientState } from './gameSlice';

describe('gameSlice', () => {
  it('sets current game and resets state', () => {
    const s = gameReducer(undefined, setCurrentGame({ gameId: 'g1' }));
    expect(s.gameId).toBe('g1');
    expect(s.board.filter((c) => c !== null).length).toBe(0);
    expect(s.pendingMoves.length).toBe(0);
  });

  it('records optimistic moves without mutating board', () => {
    let s = gameReducer(undefined, setCurrentGame({ gameId: 'g1' }));
    s = gameReducer(s as GameClientState, applyOptimisticMove({ gameId: 'g1', position: 0, player: 'X', nonce: 'n1' }));
    expect(s.pendingMoves).toEqual([{ gameId: 'g1', position: 0, player: 'X', nonce: 'n1' }]);
    expect(s.board[0]).toBeNull();
  });

  it('reconciles on gameStateReceived and clears fulfilled pending', () => {
    let s = gameReducer(undefined, setCurrentGame({ gameId: 'g1' }));
    s = gameReducer(s as GameClientState, applyOptimisticMove({ gameId: 'g1', position: 0, player: 'X', nonce: 'n1' }));
    s = gameReducer(s as GameClientState, gameStateReceived({ gameId: 'g1', board: ['X', null, null, null, null, null, null, null, null], currentPlayer: 'O' } as any));
    expect(s.board[0]).toBe('X');
    expect(s.pendingMoves.length).toBe(0);
  });

  it('moveRejected removes only the targeted pending move', () => {
    let s = gameReducer(undefined, setCurrentGame({ gameId: 'g1' }));
    s = gameReducer(s as GameClientState, applyOptimisticMove({ gameId: 'g1', position: 1, player: 'X', nonce: 'n1' }));
    s = gameReducer(s as GameClientState, applyOptimisticMove({ gameId: 'g1', position: 2, player: 'X', nonce: 'n2' }));
    s = gameReducer(s as GameClientState, moveRejected({ gameId: 'g1', nonce: 'n1' }));
    expect(s.pendingMoves.map((m) => m.nonce)).toEqual(['n2']);
  });
});


