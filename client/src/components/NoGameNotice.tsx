// © 2025 Joe Pruskowski
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectGame } from '../store/gameSlice';
import { createGame } from '../socket/clientEmitters';
import { setCurrentGame, setRole, setMyPlayer, applyLocalMove } from '../store/gameSlice';
import { pickRandomMove } from '../game/localRules';
import { getStoredStrategy, getStoredStartMode } from '../utils/clientLogger';

export default function NoGameNotice(): JSX.Element | null {
  const dispatch = useDispatch();
  const { gameId, showNewGameHint, offline } = useSelector(selectGame);
  if (!showNewGameHint && gameId) return null;
  return (
    <div role="note" aria-live="polite" className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700 px-3 py-2">
      <p className="text-center">
        <span className="font-medium">No active game.</span> Click{' '}
        <button
          type="button"
          className="font-semibold underline underline-offset-2"
          title="Start a new game"
          onClick={async () => {
            try {
              if (offline) {
                // Start a local game when offline
                const startMode = getStoredStartMode?.() ?? 'human';
                const myPlayer = startMode === 'ai' ? ('O' as any) : ('X' as any);
                const localId = `local_${Date.now()}`;
                dispatch(setCurrentGame({ gameId: localId, startingPlayer: 'X' as any }));
                dispatch(setMyPlayer(myPlayer));
                dispatch(setRole('player'));
                // If AI should start, make an immediate local move as X
                if (myPlayer === 'O') {
                  const pos = pickRandomMove(Array.from({ length: 9 }, () => null));
                  if (pos >= 0) dispatch(applyLocalMove({ position: pos }));
                }
              } else {
                const ack: any = await createGame({ strategy: getStoredStrategy?.(), startMode: getStoredStartMode?.() } as any);
                if (ack?.ok) {
                  const starting = ack.currentPlayer ?? ack.player;
                  dispatch(setCurrentGame({ gameId: ack.gameId as string, startingPlayer: starting as any }));
                  dispatch(setMyPlayer(ack.player as any));
                  dispatch(setRole('player'));
                }
              }
            } catch {}
          }}
        >
          New Game
        </button>{' '}
        to start playing.
      </p>
    </div>
  );
}
