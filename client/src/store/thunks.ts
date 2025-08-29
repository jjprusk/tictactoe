// © 2025 Joe Pruskowski
import { createAsyncThunk } from '@reduxjs/toolkit';
import { getStoredStrategy } from '../utils/clientLogger';
import { sessionStore } from '../utils/sessionStore';
import { createGame, resetGame } from '../socket/clientEmitters';
import { socketService } from '../socket/socketService';
import { setCurrentGame, setMyPlayer, setRole, applyLocalMove, type Player } from './gameSlice';
import { pickRandomMove } from '../game/localRules';

type StartMode = 'ai' | 'human' | 'alternate';

function getStartMode(): StartMode {
  try {
    const v = window.localStorage.getItem('ttt_start_mode') as StartMode | null;
    if (v === 'ai' || v === 'alternate' || v === 'human') return v;
    // Default to 'alternate' and persist for first-run consistency
    window.localStorage.setItem('ttt_start_mode', 'alternate');
    return 'alternate';
  } catch {
    return 'alternate';
  }
}

export const createOrResetGame = createAsyncThunk(
  'game/createOrReset',
  async (_: void, { dispatch, getState }) => {
    const startMode = getStartMode();
    if (socketService.getForcedOffline()) {
      // Offline flow with Alternates support
      let effectiveAiStarts = startMode === 'ai';
      if (startMode === 'alternate') {
        const key = '__ttt_alt_start_human__';
        try {
          const raw = window.localStorage.getItem(key);
          const prevHumanStarts = raw === 'true' ? true : raw === 'false' ? false : undefined;
          const currentHumanStarts = typeof prevHumanStarts === 'boolean' ? !prevHumanStarts : true; // default first to human
          window.localStorage.setItem(key, String(currentHumanStarts));
          effectiveAiStarts = !currentHumanStarts;
        } catch {
          effectiveAiStarts = false;
        }
      }
      const state: any = getState();
      const existingId: string | null = state?.game?.gameId ?? null;
      const myPlayer: Player = effectiveAiStarts ? ('O' as any) : ('X' as any);
      const localId = existingId && existingId.startsWith('local_') ? existingId : `local_${Date.now()}`;
      dispatch(setCurrentGame({ gameId: localId, startingPlayer: 'X' as any }));
      dispatch(setMyPlayer(myPlayer));
      dispatch(setRole('player'));
      if (myPlayer === 'O') {
        const pos = pickRandomMove(Array.from({ length: 9 }, () => null));
        if (pos >= 0) dispatch(applyLocalMove({ position: pos }));
      }
      return { gameId: localId, mode: 'offline' as const };
    }

    // Online:
    // - If already in a room and startMode is 'human', reset within the same room
    // - If startMode is 'ai' or 'alternate', create a new game so roles/starting player can change
    const state: any = getState();
    const gameId: string | null = state?.game?.gameId ?? null;
    if (gameId && !gameId.startsWith('local_') && startMode === 'human') {
      await resetGame({ gameId });
      return { gameId, mode: 'online-reset' as const };
    }

    const payload: any = { strategy: getStoredStrategy(), startMode };
    payload.aiStarts = startMode === 'ai';
    const ack = await createGame(payload);
    if ((ack as any).ok) {
      const starting = (ack as any).currentPlayer ?? (ack as any).player;
      const newGameId = (ack as any).gameId as string;
      dispatch(setCurrentGame({ gameId: newGameId, startingPlayer: starting as any }));
      dispatch(setMyPlayer((ack as any).player as any));
      dispatch(setRole('player'));
      const token = (ack as any).sessionToken as string | undefined;
      if (token) sessionStore.set(`ttt_session_${newGameId}`, token);
      return { gameId: newGameId, mode: 'online-create' as const };
    }
    return { gameId: null, mode: 'error' as const };
  }
);


