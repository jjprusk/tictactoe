// © 2025 Joe Pruskowski
import { socketService } from './socketService';
import { store } from '../store';
import { setSocketError, setSocketStatus } from '../store/socketSlice';
import { GameStatePayloadSchema, ErrorPayloadSchema } from './contracts';
import { gameStateReceived } from '../store/gameSlice';

export function bindSocketToStore(): void {
  // Reflect status changes into Redux
  socketService.subscribeStatus((s) => {
    store.dispatch(setSocketStatus(s));
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
    store.dispatch(gameStateReceived(parsed.data));
  });
}


