// © 2025 Joe Pruskowski
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectGame, applyOptimisticMove } from '../store/gameSlice';
import { makeMove } from '../socket/clientEmitters';
import { sendLog } from '../utils/clientLogger';
import { generateNonce } from '../socket/nonce';

export default function Board(): JSX.Element {
  const dispatch = useDispatch();
  const game = useSelector(selectGame);

  let lastClickAt = 0;
  const onCellClick = async (index: number) => {
    const now = Date.now();
    // debounce rapid taps/clicks within 150ms
    if (now - lastClickAt < 150) return;
    lastClickAt = now;
    if (!game.gameId) return;
    if (game.role === 'observer') return;
    if (game.winner || game.draw) return;
    // Only allow input when it's this client's turn
    if (!game.myPlayer || game.myPlayer !== game.currentPlayer) return;
    const cellValue = game.board[index];
    const isPendingHere = game.pendingMoves.some((m) => m.position === index);
    if (cellValue || isPendingHere) return;
    // Optimistic enqueue only; server truth will update board via game_state
    void sendLog({ level: 'info', message: 'client:click', context: { index, gameId: game.gameId, player: game.currentPlayer } }).catch(() => void 0);
    const nonce = generateNonce();
    dispatch(applyOptimisticMove({ gameId: game.gameId, position: index, player: game.currentPlayer, nonce }));
    try {
      await makeMove({ gameId: game.gameId, position: index, player: game.myPlayer, nonce } as any);
    } catch {
      // Ack timeout or error; server will not send confirming state; rely on subsequent state or user retry
      void sendLog({ level: 'warn', message: 'client:makeMove-failed', context: { index, gameId: game.gameId } }).catch(() => void 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const key = e.key;
    let next = index;
    const row = Math.floor(index / 3);
    const col = index % 3;
    if (key === 'ArrowRight') {
      e.preventDefault();
      next = row * 3 + Math.min(2, col + 1);
    } else if (key === 'ArrowLeft') {
      e.preventDefault();
      next = row * 3 + Math.max(0, col - 1);
    } else if (key === 'ArrowDown') {
      e.preventDefault();
      next = Math.min(8, (row + 1) * 3 + col);
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      next = Math.max(0, (row - 1) * 3 + col);
    } else if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      void onCellClick(index);
      return;
    }
    if (next !== index) {
      const target = document.querySelector<HTMLButtonElement>(`button[data-idx="${next}"]`);
      target?.focus();
    }
  };

  return (
    <div
      role="grid"
      aria-label="TicTacToe grid"
      aria-rowcount={3}
      aria-colcount={3}
      className="grid grid-cols-3 gap-2 w-fit mx-auto"
    >
      {Array.from({ length: 9 }).map((_, i) => {
        const value = game.board[i];
        const pending = game.pendingMoves.find((m) => m.position === i);
        const label = value ?? (pending ? game.currentPlayer : '');
        const isLast = typeof game.lastMove === 'number' && game.lastMove === i;
        return (
          <button
            key={i}
            role="gridcell"
            data-idx={i}
            aria-rowindex={Math.floor(i / 3) + 1}
            aria-colindex={(i % 3) + 1}
            aria-label={`Cell ${i + 1}`}
            onClick={() => onCellClick(i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={`min-h-[44px] min-w-[44px] h-16 w-16 md:h-20 md:w-20 flex items-center justify-center text-2xl font-semibold rounded-md border select-none
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900
              ${value ? 'border-slate-300 dark:border-slate-600' : 'border-slate-200 dark:border-slate-700 hover:border-primary-500'}
              ${pending && !value ? 'opacity-70' : ''}
              ${isLast ? 'ring-2 ring-amber-400' : ''}
            `}
          >
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}


