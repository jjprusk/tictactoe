// © 2025 Joe Pruskowski
import React from 'react';
import { useSelector } from 'react-redux';
import { selectGame } from '../store/gameSlice';

export default function CurrentPlayer(): JSX.Element | null {
  const { currentPlayer, winner, draw, gameId } = useSelector(selectGame);
  if (!gameId) return null;

  let label = `Current: ${currentPlayer}`;
  if (winner) label = `Winner: ${winner}`;
  if (draw) label = 'Draw';

  return (
    <div className="flex items-center justify-center text-sm text-slate-700 dark:text-slate-300" aria-live="polite" aria-atomic="true">
      <span data-testid="current-player-label" className="inline-flex items-center gap-2">
        <span className="font-medium">{label}</span>
        <span
          aria-hidden
          className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs font-semibold
            ${currentPlayer === 'X' ? 'bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-900/30 dark:text-primary-200 dark:border-primary-800' : 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800'}`}
        >
          {currentPlayer}
        </span>
      </span>
    </div>
  );
}


