// © 2025 Joe Pruskowski
import { Registry, collectDefaultMetrics, Histogram, Counter } from 'prom-client';
import type { Request, Response, NextFunction } from 'express';
import { appConfig } from './config/env';

// Use an isolated registry to avoid global state between tests
export const metricsRegistry = new Registry();

const metricsEnabled = appConfig.PROMETHEUS_ENABLE === true;

let httpRequestDurationSeconds: Histogram<'method' | 'route' | 'status_code'> | undefined;
let moveLatencySeconds: Histogram<'status'> | undefined;
let socketConnectionsCounter: Counter<string> | undefined;
let socketDisconnectionsCounter: Counter<string> | undefined;

if (metricsEnabled) {
  collectDefaultMetrics({ register: metricsRegistry });
  httpRequestDurationSeconds = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [metricsRegistry],
  });
  moveLatencySeconds = new Histogram({
    name: 'move_latency_seconds',
    help: 'Latency for processing move:make events in seconds',
    labelNames: ['status'] as const,
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [metricsRegistry],
  });
  socketConnectionsCounter = new Counter({
    name: 'socket_connections_total',
    help: 'Total Socket.IO connections',
    registers: [metricsRegistry],
  });
  socketDisconnectionsCounter = new Counter({
    name: 'socket_disconnections_total',
    help: 'Total Socket.IO disconnections',
    registers: [metricsRegistry],
  });
}

export function isMetricsEnabled(): boolean {
  return metricsEnabled;
}

type RequestWithRoute = Request & { route?: { path?: string } };

export function recordHttpMetricsMiddleware() {
  if (!metricsEnabled || !httpRequestDurationSeconds) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }
  return (req: RequestWithRoute, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const end = process.hrtime.bigint();
      const durationNs = Number(end - start);
      const durationSec = durationNs / 1e9;
      // Attempt to extract route path; fallback to path or originalUrl
      const route = req.route?.path ?? req.path ?? req.originalUrl ?? 'unknown';
      httpRequestDurationSeconds!
        .labels(String(req.method || ''), String(route), String(res.statusCode || ''))
        .observe(durationSec);
    });
    next();
  };
}

export async function getMetricsText(): Promise<string> {
  return metricsEnabled ? metricsRegistry.metrics() : 'PROMETHEUS_DISABLED';
}

export function incSocketConnections(): void {
  if (metricsEnabled && socketConnectionsCounter) {
    socketConnectionsCounter.inc();
  }
}

export function incSocketDisconnections(): void {
  if (metricsEnabled && socketDisconnectionsCounter) {
    socketDisconnectionsCounter.inc();
  }
}

export function resetMetricsForTest(): void {
  metricsRegistry.resetMetrics();
}

export function observeMoveLatencySeconds(status: 'ok' | 'error', seconds: number): void {
  if (metricsEnabled && moveLatencySeconds) {
    moveLatencySeconds.labels(status).observe(seconds);
  }
}


