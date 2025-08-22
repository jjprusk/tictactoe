// © 2025 Joe Pruskowski
import React from 'react';
import { useSelector } from 'react-redux';
import { selectGame } from '../store/gameSlice';

export default function ObserverNotice(): JSX.Element | null {
  const { role, gameId } = useSelector(selectGame);
  if (!gameId || role !== 'observer') return null;

  return (
    <div
      role="note"
      aria-live="polite"
      className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 text-sm"
      data-testid="observer-notice"
    >
      Spectator mode: you can observe the game in real time but cannot make moves.
    </div>
  );
}


