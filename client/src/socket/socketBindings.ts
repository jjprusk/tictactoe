// © 2025 Joe Pruskowski
import { socketService } from './socketService';
import { store } from '../store';
import { setSocketError, setSocketStatus } from '../store/socketSlice';

export function bindSocketToStore(): void {
  // Reflect status changes into Redux
  socketService.subscribeStatus((s) => {
    store.dispatch(setSocketStatus(s));
  });

  // Example error binding (if we later emit standardized errors)
  socketService.on('error', (err: unknown) => {
    const msg = typeof err === 'string' ? err : (err as any)?.message ?? 'unknown error';
    store.dispatch(setSocketError(msg));
  });
}


