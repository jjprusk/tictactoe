// © 2025 Joe Pruskowski
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Player } from '../socket/contracts';
import type { GameStatePayload } from '../socket/contracts';

export type BoardCell = Player | null;

export interface PendingMove {
  gameId: string;
  nonce: string;
  position: number;
  player: Player;
}

export interface GameClientState {
  gameId: string | null;
  board: BoardCell[]; // length 9
  currentPlayer: Player;
  lastMove?: number;
  winner?: Player;
  draw?: boolean;
  pendingMoves: PendingMove[];
  role?: 'player' | 'observer';
}

const emptyBoard: BoardCell[] = Array.from({ length: 9 }, () => null);

const initialState: GameClientState = {
  gameId: null,
  board: emptyBoard.slice(),
  currentPlayer: 'X',
  pendingMoves: [],
  role: undefined,
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setCurrentGame(state, action: PayloadAction<{ gameId: string }>) {
      state.gameId = action.payload.gameId;
      state.board = emptyBoard.slice();
      state.currentPlayer = 'X';
      state.lastMove = undefined;
      state.winner = undefined;
      state.draw = undefined;
      state.pendingMoves = [];
      state.role = undefined;
    },
    applyOptimisticMove(state, action: PayloadAction<{ gameId: string; position: number; player: Player; nonce: string }>) {
      const { gameId, position, player, nonce } = action.payload;
      if (state.gameId !== gameId) return;
      // Record pending; board is reconciled only from server truth
      state.pendingMoves.push({ gameId, position, player, nonce });
    },
    moveRejected(state, action: PayloadAction<{ gameId: string; nonce: string }>) {
      const { gameId, nonce } = action.payload;
      if (state.gameId !== gameId) return;
      state.pendingMoves = state.pendingMoves.filter((m) => m.nonce !== nonce);
    },
    gameStateReceived(state, action: PayloadAction<GameStatePayload>) {
      const gs = action.payload;
      if (state.gameId && state.gameId !== gs.gameId) {
        // Switch to server-emitted game
        state.gameId = gs.gameId;
      } else if (!state.gameId) {
        state.gameId = gs.gameId;
      }
      state.board = gs.board.slice();
      state.currentPlayer = gs.currentPlayer;
      state.lastMove = gs.lastMove;
      state.winner = gs.winner;
      state.draw = gs.draw;
      // Reconcile: drop any pending occupying confirmed cells or different gameId
      state.pendingMoves = state.pendingMoves.filter((m) => m.gameId === gs.gameId && gs.board[m.position] === null);
    },
    setRole(state, action: PayloadAction<'player' | 'observer'>) {
      state.role = action.payload;
    },
    resetGameState(state) {
      state.gameId = null;
      state.board = emptyBoard.slice();
      state.currentPlayer = 'X';
      state.lastMove = undefined;
      state.winner = undefined;
      state.draw = undefined;
      state.pendingMoves = [];
      state.role = undefined;
    },
  },
});

export const { setCurrentGame, applyOptimisticMove, moveRejected, gameStateReceived, resetGameState, setRole } = gameSlice.actions;
export const gameReducer = gameSlice.reducer;

// Selectors
export const selectGame = (state: { game: GameClientState }) => state.game;
export const selectPendingAt = (state: { game: GameClientState }, index: number) =>
  state.game.pendingMoves.find((m) => m.position === index) ?? null;


