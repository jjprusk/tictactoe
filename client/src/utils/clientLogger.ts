// © 2025 Joe Pruskowski

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface ClientLogPayload {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export interface SendLogOptions {
  /** Base URL of the server (e.g., http://localhost:3001). Defaults to window.location.origin. */
  baseUrl?: string;
  /** Abort controller signal. */
  signal?: AbortSignal;
  /** Request timeout in ms (default 3000). */
  timeoutMs?: number;
}

/**
 * Sends a log payload to the server's /logs endpoint so it is written to LOG via Pino.
 */
export async function sendLog(
  payload: ClientLogPayload,
  { baseUrl, signal, timeoutMs = 3000 }: SendLogOptions = {}
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const origin = (() => {
      if (baseUrl) return baseUrl;
      if (typeof window === 'undefined') return '';
      const envUrl = (import.meta as any)?.env?.VITE_SERVER_URL as string | undefined;
      const lsUrl = window.localStorage.getItem('ttt_socket_url') || undefined;
      try {
        const preferred = lsUrl ?? envUrl;
        if (preferred) return new URL(preferred).origin;
      } catch {}
      return window.location.origin;
    })();
    const res = await fetch(`${origin}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: signal ?? controller.signal,
    });
    if (!res.ok) throw new Error(`sendLog failed: HTTP ${res.status}`);
  } finally {
    clearTimeout(timer);
  }
}


export type StrategyOption = 'random' | 'ai';

const STRATEGY_KEY = 'ttt_strategy';

export function getStoredStrategy(): StrategyOption {
  const s = typeof window !== 'undefined' ? window.localStorage.getItem(STRATEGY_KEY) : null;
  return s === 'ai' || s === 'random' ? s : 'random';
}

export function setStoredStrategy(strategy: StrategyOption): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STRATEGY_KEY, strategy);
  }
}

