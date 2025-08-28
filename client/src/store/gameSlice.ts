// © 2025 Joe Pruskowski
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Player } from '../socket/contracts';
import type { GameStatePayload } from '../socket/contracts';
import { checkWin as localCheckWin, checkDraw as localCheckDraw, nextPlayer as localNextPlayer } from '../game/localRules';

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
  myPlayer?: Player;
  showNewGameHint?: boolean;
  offline: boolean;
}

const emptyBoard: BoardCell[] = Array.from({ length: 9 }, () => null);

const initialState: GameClientState = {
  gameId: null,
  board: emptyBoard.slice(),
  currentPlayer: 'X',
  pendingMoves: [],
  role: undefined,
  myPlayer: undefined,
  showNewGameHint: false,
  offline: false,
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setOffline(state, action: PayloadAction<boolean>) {
      state.offline = action.payload;
    },
    setCurrentGame(state, action: PayloadAction<{ gameId: string; startingPlayer?: Player }>) {
      state.gameId = action.payload.gameId;
      state.board = emptyBoard.slice();
      state.currentPlayer = action.payload.startingPlayer ?? 'X';
      state.lastMove = undefined;
      state.winner = undefined;
      state.draw = undefined;
      state.pendingMoves = [];
      state.role = undefined;
      state.showNewGameHint = false;
      // myPlayer remains until explicitly set by join/create ack
    },
    setMyPlayer(state, action: PayloadAction<Player | undefined>) {
      state.myPlayer = action.payload;
    },
    applyOptimisticMove(state, action: PayloadAction<{ gameId: string; position: number; player: Player; nonce: string }>) {
      const { gameId, position, player, nonce } = action.payload;
      if (state.gameId !== gameId) return;
      // Record pending; board is reconciled only from server truth
      state.pendingMoves.push({ gameId, position, player, nonce });
    },
    applyLocalMove(state, action: PayloadAction<{ position: number }>) {
      const { position } = action.payload;
      if (state.gameId === null) return;
      if (state.board[position] !== null) return;
      const nextBoard = state.board.slice();
      nextBoard[position] = state.currentPlayer;
      state.board = nextBoard;
      state.lastMove = position;
      const winner = localCheckWin(nextBoard);
      const draw = winner ? false : localCheckDraw(nextBoard);
      if (winner) {
        state.winner = winner as Player;
        state.draw = false;
      } else if (draw) {
        state.winner = undefined;
        state.draw = true;
      } else {
        state.currentPlayer = localNextPlayer(state.currentPlayer) as Player;
      }
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
      state.showNewGameHint = false;
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
      state.myPlayer = undefined;
      state.showNewGameHint = true;
    },
  },
});

export const { setCurrentGame, setMyPlayer, applyOptimisticMove, applyLocalMove, moveRejected, gameStateReceived, resetGameState, setRole, setOffline } = gameSlice.actions;
export const gameReducer = gameSlice.reducer;

// Selectors
export const selectGame = (state: { game: GameClientState }) => state.game;
export const selectPendingAt = (state: { game: GameClientState }, index: number) =>
  state.game.pendingMoves.find((m) => m.position === index) ?? null;


