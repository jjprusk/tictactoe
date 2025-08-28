// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import { gameReducer, setCurrentGame, applyOptimisticMove, moveRejected, gameStateReceived, type GameClientState, setOffline, setMyPlayer, applyLocalMove, resetGameState, setRole, selectPendingAt } from './gameSlice';

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

  it('setOffline toggles offline flag', () => {
    let s = gameReducer(undefined, setOffline(true));
    expect(s.offline).toBe(true);
    s = gameReducer(s, setOffline(false));
    expect(s.offline).toBe(false);
  });

  it('setMyPlayer sets the current client player', () => {
    let s = gameReducer(undefined, setCurrentGame({ gameId: 'g1' }));
    s = gameReducer(s as GameClientState, setMyPlayer('X'));
    expect((s as GameClientState).myPlayer).toBe('X');
  });

  it('applyLocalMove applies move, sets lastMove and advances current player', () => {
    let s = gameReducer(undefined, setCurrentGame({ gameId: 'local_1', startingPlayer: 'X' as any }));
    s = gameReducer(s as GameClientState, applyLocalMove({ position: 0 }));
    const st = s as GameClientState;
    expect(st.board[0]).toBe('X');
    expect(st.lastMove).toBe(0);
    expect(st.currentPlayer).toBe('O');
  });

  it('applyLocalMove detects win and does not advance current player', () => {
    // X to win with positions 0,1 already occupied by X
    let s = gameReducer(undefined, setCurrentGame({ gameId: 'local_2', startingPlayer: 'X' as any }));
    // Manually set up board by applying local moves X->O->X to fill [0] X and [3] O and [1] X
    s = gameReducer(s as GameClientState, applyLocalMove({ position: 0 })); // X
    s = gameReducer(s as GameClientState, applyLocalMove({ position: 3 })); // O
    s = gameReducer(s as GameClientState, applyLocalMove({ position: 1 })); // X
    // Now O plays somewhere irrelevant
    s = gameReducer(s as GameClientState, applyLocalMove({ position: 4 })); // O
    // X plays winning move at 2
    s = gameReducer(s as GameClientState, applyLocalMove({ position: 2 })); // X wins (0,1,2)
    const st = s as GameClientState;
    expect(st.winner).toBe('X');
    expect(st.draw).toBe(false);
    // currentPlayer remains the same after win per reducer logic
    expect(st.currentPlayer).toBe('X');
  });

  it('applyLocalMove detects draw', () => {
    // Create a near-draw board and play final move to force draw
    let s = gameReducer(undefined, setCurrentGame({ gameId: 'local_3', startingPlayer: 'X' as any }));
    // Sequence to achieve a draw:
    // X:0 O:1 X:2 O:4 X:3 O:5 X:7 O:6 -> board has one empty (8), next X plays 8 -> draw
    const moves = [0,1,2,4,3,5,7,6,8];
    for (const pos of moves) {
      s = gameReducer(s as GameClientState, applyLocalMove({ position: pos }));
    }
    const st = s as GameClientState;
    expect(st.draw).toBe(true);
    expect(st.winner).toBeUndefined();
  });

  it('gameStateReceived switches to server game if different id', () => {
    let s = gameReducer(undefined, setCurrentGame({ gameId: 'g1' }));
    s = gameReducer(s as GameClientState, gameStateReceived({ gameId: 'g2', board: Array(9).fill(null), currentPlayer: 'X' } as any));
    expect((s as GameClientState).gameId).toBe('g2');
  });

  it('resetGameState clears state and shows new game hint', () => {
    let s = gameReducer(undefined, setCurrentGame({ gameId: 'g1' }));
    s = gameReducer(s as GameClientState, resetGameState());
    const st = s as GameClientState;
    expect(st.gameId).toBeNull();
    expect(st.board.every((c) => c === null)).toBe(true);
    expect(st.showNewGameHint).toBe(true);
  });

  it('setRole updates the role', () => {
    let s = gameReducer(undefined, setCurrentGame({ gameId: 'g1' }));
    s = gameReducer(s as GameClientState, setRole('observer'));
    expect((s as GameClientState).role).toBe('observer');
  });

  it('selectPendingAt selects only matching index', () => {
    let s = gameReducer(undefined, setCurrentGame({ gameId: 'g1' }));
    s = gameReducer(s as GameClientState, applyOptimisticMove({ gameId: 'g1', position: 4, player: 'X', nonce: 'n1' }));
    const at4 = selectPendingAt({ game: s as GameClientState }, 4);
    const at5 = selectPendingAt({ game: s as GameClientState }, 5);
    expect(at4?.position).toBe(4);
    expect(at5).toBeNull();
  });
});


