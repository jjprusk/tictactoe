// © 2025 Joe Pruskowski
import { getLegalMoves } from '../game/rules';
import type { Board, Player, Strategy } from '../game/types';
import { pickRandomMove } from './random';
import { observeAiDecisionLatencySeconds, observeMoveLatencySeconds } from '../metrics';
import { getTracer } from '../tracing';

export async function makeMove(board: Board, player: Player, strategy: Strategy): Promise<number> {
  const tracer = getTracer();
  const span = tracer.startSpan('ai.makeMove');
  span.setAttribute('strategy', strategy);
  span.setAttribute('player', player);
  const start = process.hrtime.bigint();
  try {
    if (strategy === 'random') {
      const pos = pickRandomMove(board, player);
      const end = process.hrtime.bigint();
      observeMoveLatencySeconds('ok', Number(end - start) / 1e9);
      observeAiDecisionLatencySeconds('random', Number(end - start) / 1e9);
      span.end();
      return pos;
    }
    // Placeholder for 'ai' strategy: fall back to random for now
    const legal = getLegalMoves(board);
    const pos = legal.length ? legal[0] : -1;
    const end = process.hrtime.bigint();
    observeMoveLatencySeconds('ok', Number(end - start) / 1e9);
    observeAiDecisionLatencySeconds('ai', Number(end - start) / 1e9);
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


