// © 2025 Joe Pruskowski
import React from 'react';
import { useSelector } from 'react-redux';
import { selectGame } from '../store/gameSlice';

export default function NoGameNotice(): JSX.Element | null {
  const { gameId, showNewGameHint } = useSelector(selectGame);
  if (!showNewGameHint && gameId) return null;
  return (
    <div role="note" aria-live="polite" className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700 px-3 py-2">
      <span className="font-medium">No active game.</span> Click <span className="font-semibold" title="You must click New Game to start a match">New Game</span> to start playing.
    </div>
  );
}
