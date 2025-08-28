// © 2025 Joe Pruskowski
import React from 'react';
import { useSelector } from 'react-redux';
import { selectGame } from '../store/gameSlice';

export default function GameRoomBadge(): JSX.Element | null {
  const { gameId } = useSelector(selectGame);
  if (!gameId) return null;

  const isLocal = gameId.startsWith('local_');
  const label = isLocal ? 'Local Game' : gameId;

  return (
    <div
      className="inline-flex items-center rounded-full border border-slate-300 dark:border-slate-600 bg-white/60 dark:bg-slate-800/60 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-200"
      title={isLocal ? 'You are playing locally' : `Room: ${gameId}`}
      aria-label={isLocal ? 'Local game badge' : `Game room ${gameId}`}
      data-testid="game-room-badge"
    >
      <span className="font-medium mr-1">Room:</span>
      <span className="font-mono tracking-tight">{label}</span>
    </div>
  );
}


