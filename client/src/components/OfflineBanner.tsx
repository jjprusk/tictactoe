// © 2025 Joe Pruskowski
import React from 'react';
import { useSelector } from 'react-redux';
import { selectGame } from '../store/gameSlice';

export default function OfflineBanner(): JSX.Element | null {
  const game = useSelector(selectGame);
  if (!game.offline) return null;
  return (
    <div role="status" aria-live="polite" className="mb-3 rounded-md border border-amber-300 bg-amber-50 text-amber-900 px-3 py-2 text-sm">
      You are offline. Playing locally with Random opponent. Server actions are disabled until reconnection.
    </div>
  );
}


