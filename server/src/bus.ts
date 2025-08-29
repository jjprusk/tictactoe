// © 2025 Joe Pruskowski
import { EventEmitter } from 'events';

export type BusEvents = {
  'log-level-changed': (level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent') => void;
};

class TypedBus extends EventEmitter {
  on<K extends keyof BusEvents>(event: K, listener: BusEvents[K]): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }
  off<K extends keyof BusEvents>(event: K, listener: BusEvents[K]): this {
    return super.off(event, listener as (...args: unknown[]) => void);
  }
  emit<K extends keyof BusEvents>(event: K, ...args: Parameters<BusEvents[K]>): boolean {
    return super.emit(event, ...(args as unknown as []));
  }
}

export const bus = new TypedBus();
