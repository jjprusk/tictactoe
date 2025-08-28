// © 2025 Joe Pruskowski
import { socketService } from './socketService';
import { store } from '../store';
import { setSocketError, setSocketStatus } from '../store/socketSlice';
import { setOffline } from '../store/gameSlice';
import { GameStatePayloadSchema, ErrorPayloadSchema } from './contracts';
import { gameStateReceived } from '../store/gameSlice';
import { sendLog } from '../utils/clientLogger';

export function bindSocketToStore(): void {
  // Reflect status changes into Redux
  socketService.subscribeStatus((s) => {
    store.dispatch(setSocketStatus(s));
    store.dispatch(setOffline(s !== 'connected'));
  });

  // Example error binding (if we later emit standardized errors)
  socketService.on('error', (err: unknown) => {
    // Try to parse standardized error payload; fallback to string
    const parsed = ErrorPayloadSchema.safeParse(err);
    if (parsed.success) {
      store.dispatch(setSocketError(`${parsed.data.code}: ${parsed.data.message}`));
    } else {
      const msg = typeof err === 'string' ? err : (err as any)?.message ?? 'unknown error';
      store.dispatch(setSocketError(msg));
    }
  });

  // Bind game_state with validation (placeholder dispatch; wire to store when implemented)
  socketService.on('game_state', (payload: unknown) => {
    const parsed = GameStatePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      store.dispatch(setSocketError('protocol: invalid game_state payload'));
      return;
    }
    try {
      const s1: any = (store as any).getState?.() ?? {};
      const before = (s1 as any).game;
      void sendLog({ level: 'info', message: 'client:recv game_state', context: { payload: parsed.data, before: before ? { gameId: before.gameId, lastMove: before.lastMove } : 'n/a' } }).catch(() => void 0);
      store.dispatch(gameStateReceived(parsed.data));
      const s2: any = (store as any).getState?.() ?? {};
      const after = (s2 as any).game;
      void sendLog({ level: 'info', message: 'client:applied game_state', context: { after: after ? { gameId: after.gameId, lastMove: after.lastMove, board: after.board } : 'n/a' } }).catch(() => void 0);
    } catch {}
  });
}


