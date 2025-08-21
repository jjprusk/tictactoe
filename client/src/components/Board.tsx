// © 2025 Joe Pruskowski
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectGame, applyOptimisticMove } from '../store/gameSlice';
import { makeMove } from '../socket/clientEmitters';
import { generateNonce } from '../socket/nonce';

export default function Board(): JSX.Element {
  const dispatch = useDispatch();
  const game = useSelector(selectGame);

  const onCellClick = async (index: number) => {
    if (!game.gameId) return;
    if (game.winner || game.draw) return;
    const cellValue = game.board[index];
    const isPendingHere = game.pendingMoves.some((m) => m.position === index);
    if (cellValue || isPendingHere) return;
    // Optimistic enqueue only; server truth will update board via game_state
    const nonce = generateNonce();
    dispatch(applyOptimisticMove({ gameId: game.gameId, position: index, player: game.currentPlayer, nonce }));
    try {
      await makeMove({ gameId: game.gameId, position: index, player: game.currentPlayer, nonce });
    } catch {
      // Ack timeout or error; server will not send confirming state; rely on subsequent state or user retry
    }
  };

  return (
    <div role="grid" aria-label="TicTacToe grid" className="grid grid-cols-3 gap-2">
      {Array.from({ length: 9 }).map((_, i) => {
        const value = game.board[i];
        const pending = game.pendingMoves.find((m) => m.position === i);
        const label = value ?? (pending ? game.currentPlayer : '');
        return (
          <button
            key={i}
            role="gridcell"
            aria-label={`Cell ${i + 1}`}
            onClick={() => onCellClick(i)}
            className={`h-16 w-16 md:h-20 md:w-20 flex items-center justify-center text-2xl font-semibold rounded-md border
              ${value ? 'border-slate-300 dark:border-slate-600' : 'border-slate-200 dark:border-slate-700 hover:border-primary-500'}
              ${pending && !value ? 'opacity-70' : ''}
            `}
          >
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}


