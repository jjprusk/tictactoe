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


export type StrategyOption = 'ai0' | 'ai1' | 'ai2' | 'ai3';

const STRATEGY_KEY = 'ttt_strategy';

export function getStoredStrategy(): StrategyOption {
  const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STRATEGY_KEY) : null;
  const normalized = (() => {
    if (raw === 'ai0' || raw === 'ai1' || raw === 'ai2' || raw === 'ai3') return raw;
    if (raw === 'random') return 'ai0';
    if (raw === 'ai') return 'ai1';
    if (raw === 'smart') return 'ai2';
    if (raw === 'genius') return 'ai3';
    return 'ai0';
  })();
  try { if (typeof window !== 'undefined') window.localStorage.setItem(STRATEGY_KEY, normalized); } catch {}
  return normalized as StrategyOption;
}

export function setStoredStrategy(strategy: StrategyOption | 'random' | 'ai' | 'smart' | 'genius'): void {
  const normalized = (() => {
    if (strategy === 'ai0' || strategy === 'ai1' || strategy === 'ai2' || strategy === 'ai3') return strategy;
    if (strategy === 'random') return 'ai0';
    if (strategy === 'ai') return 'ai1';
    if (strategy === 'smart') return 'ai2';
    if (strategy === 'genius') return 'ai3';
    return 'ai0';
  })();
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STRATEGY_KEY, normalized);
  }
}

export type StartModeOption = 'ai' | 'human' | 'alternate';
const START_MODE_KEY = 'ttt_start_mode';

export function getStoredStartMode(): StartModeOption {
  try {
    const v = typeof window !== 'undefined' ? (window.localStorage.getItem(START_MODE_KEY) as StartModeOption | null) : null;
    return v === 'ai' || v === 'human' || v === 'alternate' ? v : 'human';
  } catch {
    return 'human';
  }
}

export function setStoredStartMode(mode: StartModeOption): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(START_MODE_KEY, mode);
  } catch {}
}

