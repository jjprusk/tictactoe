// © 2025 Joe Pruskowski
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectGame } from '../store/gameSlice';
import { createOrResetGame } from '../store/thunks';

type StartMode = 'ai' | 'human' | 'alternate';

function getStartMode(): StartMode {
  try {
    const v = window.localStorage.getItem('ttt_start_mode') as StartMode | null;
    return v === 'ai' || v === 'alternate' || v === 'human' ? v : 'human';
  } catch {
    return 'human';
  }
}

export default function NewGameButton(): JSX.Element {
  const dispatch = useDispatch();
  const { gameId } = useSelector(selectGame);
  const [ready, setReady] = useState<boolean>(() => {
    try {
      const strategy = window.localStorage.getItem('ttt_strategy');
      const start = window.localStorage.getItem('ttt_start_mode');
      // Treat missing as not ready so button is disabled until selection is made
      return Boolean(strategy) && Boolean(start);
    } catch { return false; }
  });

  useEffect(() => {
    function updateReady() {
      try {
        const strategy = window.localStorage.getItem('ttt_strategy');
        const start = window.localStorage.getItem('ttt_start_mode');
        setReady(Boolean(strategy) && Boolean(start));
      } catch {}
    }
    window.addEventListener('ttt:session-change' as any, updateReady as any);
    return () => { window.removeEventListener('ttt:session-change' as any, updateReady as any); };
  }, []);

  const onCreate = useCallback(async () => {
    if (!ready) return;
    try {
      await (dispatch as any)(createOrResetGame());
    } catch {}
  }, [dispatch, gameId, ready]);

  return (
    <button
      type="button"
      onClick={onCreate}
      className="inline-flex items-center rounded-md bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:border-slate-300 disabled:text-slate-600 text-white border border-primary-700 px-3 py-1.5 text-sm font-medium"
      disabled={!ready}
      data-testid="create-game-btn-secondary"
      title="Start a new game"
    >
      New Game
    </button>
  );
}


