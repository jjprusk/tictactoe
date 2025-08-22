// © 2025 Joe Pruskowski
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectGame, resetGameState } from '../store/gameSlice';

export default function ResetButton(): JSX.Element | null {
  const dispatch = useDispatch();
  const { gameId } = useSelector(selectGame);
  if (!gameId) return null;

  const onReset = (): void => {
    dispatch(resetGameState());
  };

  return (
    <button
      type="button"
      onClick={onReset}
      className="inline-flex items-center rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium"
      data-testid="reset-button"
    >
      Reset
    </button>
  );
}


