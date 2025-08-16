# Socket.IO Test Plan

A minimal, high-impact plan to complete Socket.IO testing in small, reviewable steps. Focus: correctness, resilience, and reproducibility in CI and local.

## Goals
- Validate real-time reliability (connectivity, acks, timeouts)
- Prove correctness under failure and race scenarios
- Ensure graceful behavior with bursts, reconnections, and restarts
- Keep CI deterministic; offload heavy/chaotic tests to on-demand jobs

## Scope
- Server Socket.IO handlers and flows (join/leave/move/health)
- Client interactions using `socket.io-client` in tests
- Unit + integration tests; load/chaos as optional jobs

## Environment & Helpers
- Vitest (node env), `socket.io-client`
- Helpers: `buildHttpServer()`, `buildIoServer()`, `emitWithAckTimeout()`
- Test env knobs (as needed): `TEST_PING_INTERVAL`, `TEST_PING_TIMEOUT`, `TEST_RATE_LIMIT`

## Phase 1: Core reliability (unit/integration)
- Acks/Timeouts
  - Per-event ack timeout helper; tests for `room:join`, `room:leave`, `move:make` (success + error)
  - Timeouts for unknown events and artificially delayed acks (fake timers)
- Reconnect/Resume
  - Client auto-reconnect → rejoin previous role
  - Idempotency across reconnects (same nonce after reconnect → duplicate)
- Rooms/Limits/Leave
  - `room:leave` updates player counts; observer can upgrade to player
  - Optional hard capacity: explicit rejection vs observer fallback

## Phase 2: Security/transport behavior
- CORS/Auth
  - Origin check (allowRequest/middleware); rejected origins tested
  - Stub auth token; unauthorized clients error/disconnect
- Transport Fallback
  - Polling-only connection; same health/join/move behavior

## Phase 3: Liveness and resilience
- Heartbeats
  - Low pingInterval/pingTimeout; silent client cleaned up and slot released
- Ordering/Races
  - Concurrent distinct moves → ordered acks/state
  - Out-of-order acks via server delay; client converges
- Backpressure
  - Test-mode rate limiter on `move:make`
  - Burst over threshold → throttle/error acks; process remains responsive

## Phase 4: Chaos and load (separate jobs)
- Chaos (integration-only)
  - Packet delay/loss wrapper; retries/idempotency hold
  - Server restart during active room with backoff/port-wait helper; clients rejoin
- Load
  - Artillery/K6: ~120 VUs connect → join → move loop
  - Success: connect error <1%, ack p95 <300ms

## Deliverables per PR (suggested)
- [x] PR1: Acks/Timeouts + Reconnect/Resume tests
- [x] PR2: Rooms/Limits + Leave semantics tests
- [x] PR3: CORS/Auth + Transport fallback tests
- [x] PR4: Heartbeats + Ordering/Races tests
- [x] PR5: Backpressure limiter + tests
- [ ] PR6: Chaos (restart/packet loss) integration tests (CI-skipped, on-demand)
- [x] PR7: Artillery script + optional on-demand workflow

## CI Strategy
- Unit/integration suite on each push/PR: typecheck, lint, test
- Chaos/restart tests marked integration; separate on-demand workflow
- Pin Node/npm; install with `npm ci --workspaces`

## Success Criteria
- Green CI for unit/integration
- Coverage: lines/statements ≥70%, functions ≥70%, branches ≥60%
- Chaos and load tests passing on demand with thresholds

## Local Commands
- `npm run test` (server workspace)
- `npm run test:watch`
- `npm run test:cov` (HTML at `server/coverage/index.html`)
