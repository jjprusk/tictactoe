// © 2025 Joe Pruskowski
import type { Player } from '../socket/contracts';

export type LocalBoard = Array<Player | null>;

export function getLegalMoves(board: LocalBoard): number[] {
  const moves: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) moves.push(i);
  }
  return moves;
}

export function applyMove(board: LocalBoard, position: number, player: Player): LocalBoard {
  if (board[position] !== null) return board;
  const next = board.slice();
  next[position] = player;
  return next;
}

export function nextPlayer(p: Player): Player {
  return p === 'X' ? 'O' : 'X';
}

export function checkWin(board: LocalBoard): Player | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    const v = board[a];
    if (v && v === board[b] && v === board[c]) return v;
  }
  return null;
}

export function checkDraw(board: LocalBoard): boolean {
  return board.every((c) => c !== null) && !checkWin(board);
}

export function pickRandomMove(board: LocalBoard): number {
  const moves = getLegalMoves(board);
  if (moves.length === 0) return -1;
  const idx = Math.floor(Math.random() * moves.length);
  return moves[idx] ?? -1;
}


