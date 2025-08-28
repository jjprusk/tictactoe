// © 2025 Joe Pruskowski
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectGame, resetGameState } from '../store/gameSlice';
import { resetGame } from '../socket/clientEmitters';

export default function ResetButton(): JSX.Element | null {
  const dispatch = useDispatch();
  const { gameId } = useSelector(selectGame);
  if (!gameId) return null;

  const onReset = async (): Promise<void> => {
    // Optimistic clear for instantaneous UI feedback
    dispatch(resetGameState());
    try {
      if (gameId) await resetGame({ gameId });
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={onReset}
      className="inline-flex items-center rounded-md bg-primary-100 hover:bg-primary-200 text-primary-900 border border-primary-300 dark:bg-primary-800 dark:hover:bg-primary-700 dark:text-white dark:border-primary-600 px-3 py-1.5 text-sm font-medium"
      data-testid="reset-button"
    >
      Reset
    </button>
  );
}


