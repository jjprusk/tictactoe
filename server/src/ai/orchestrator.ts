// © 2025 Joe Pruskowski
import { getLegalMoves } from '../game/rules';
import type { Board, Player, Strategy } from '../game/types';
import { ai0Random, ai1Average, ai2Smart, ai3Genius } from './strategies';
import { observeAiDecisionLatencySeconds, observeMoveLatencySeconds } from '../metrics';
import { getTracer } from '../tracing';

export type NormalizedStrategy = 'ai0' | 'ai1' | 'ai2' | 'ai3';

export function normalizeStrategy(s: Strategy | string | undefined | null): NormalizedStrategy {
  if (s === 'ai0' || s === 'ai1' || s === 'ai2' || s === 'ai3') return s;
  if (s === 'random') return 'ai0';
  if (s === 'ai') return 'ai1';
  return 'ai0';
}

export async function makeMove(board: Board, player: Player, strategy: Strategy): Promise<number> {
  const tracer = getTracer();
  const span = tracer.startSpan('ai.makeMove');
  const normalized = normalizeStrategy(strategy);
  span.setAttribute('strategy', strategy);
  span.setAttribute('strategy.normalized', normalized);
  span.setAttribute('player', player);
  const start = process.hrtime.bigint();
  try {
    // Route by normalized strategy (all currently map to ai0 behavior internally)
    const pos =
      normalized === 'ai0' ? ai0Random(board, player) :
      normalized === 'ai1' ? ai1Average(board, player) :
      normalized === 'ai2' ? ai2Smart(board, player) :
      ai3Genius(board, player);
    const end = process.hrtime.bigint();
    observeMoveLatencySeconds('ok', Number(end - start) / 1e9);
    observeAiDecisionLatencySeconds(normalized, Number(end - start) / 1e9);
    span.end();
    return pos;
  } catch (_e) {
    const end = process.hrtime.bigint();
    observeMoveLatencySeconds('error', Number(end - start) / 1e9);
    span.setAttribute('error', true);
    span.end();
    return -1;
  }
}


