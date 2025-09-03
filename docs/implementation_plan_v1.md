## Implementation Plan V1 (Basic AI only)

### Purpose
Deliver a complete, stable V1 focused on gameplay, reliability, observability, storage, and admin features while intentionally deferring advanced AI behavior. Keep the AI framework and contracts intact but route all levels to Basic (random) in V1. Advanced AI (rule-based/minimax/MCTS) will be implemented in V2.

### Scope Principles
- Keep existing strategy contract (`ai0`–`ai3`) and normalization intact for forward compatibility.
- Route `ai1`–`ai3` to `ai0` (random) in V1; no behavioral differences between levels.
- Maintain offline mode parity and resilient reconnect/session behavior.
- Ensure strong unit/integration/E2E coverage and operational controls (logging, retention, admin endpoints, exports).

### Deferred to V2 (Advanced AI)
- Implement true `ai1` (heuristic rule-based), `ai2` (depth-limited minimax with alpha–beta), `ai3` (perfect minimax / table-based) with metrics and golden tests.
- Optional enhancements: opening book, MCTS experimentation, bitboard/TT cache, determinism-by-seed.

### V1 Steps (derived from original plan)

#### S126–S129 family (Gameplay, E2E, Offline, Persistence, Session)
- S126a: E2E gameplay tests, including first-play and alternating scenarios; stabilize test environment and graceful shutdown.
- S127: Offline mode with local rules to enable play without server.
- S128: Offline banner and disabling server emits when forced offline.
- S129: Session persistence on reconnect; room lifecycle consistency; centralized client thunk to create/reset games honoring Begins.
- S129a: ConnectionStatus slider toggle; reset on offline/online transitions.

#### S129b–S129r (AI naming/contract framework only in V1)
- Keep new strategy values (`ai0`–`ai3`) in contracts and storage; read-time migration for legacy values.
- Normalize all strategies server-side; in V1 route `ai1`–`ai3` to `ai0` under the hood.
- Keep UI labels “Basic / Average / Smart / Genius” or show “Basic” only (product choice), but behavior remains Basic in V1.

#### Data layer & migrations (S130–S135)
- S130: MongoDB Zod schemas for `games`, `moves`, `sessions`, `models`, `logs`.
- S131: Compound indexes and TTLs (e.g., sessions TTL, moves unique compound).
- Wire `ensureIndexes()` on server startup.
- S132: migrate-mongo config and baseline migration (idempotent; mirrors ensureIndexes).
- S133–S135: Repository functions: save game start, save moves, save outcome.

#### Redis & retention (S136–S139)
- S136: Redis key patterns for consistency.
- S137: Cache helpers: set/get JSON and strings with optional TTL.
- S138: Log retention job for Mongo (delete older than configured cutoff).
- S139: Retention configuration via env; verify with tests.

#### Metrics & tracing (from original S053–S055)
- Prometheus metrics for HTTP/socket durations and move latency histogram; `/metrics` endpoint exposed.
- Basic tracing around move lifecycle with appropriate sampling/configuration.
- Tests verifying metrics emission and disabled/enabled configurations.

#### Logging & Admin (S140–S145)
- S140: Server logger transport scaffolding; sampling hooks guarded by env.
- S141: Client logging wrapper with sampling and context enrichment; batched client logs to server.
- S142: POST /logs/batch to accept client arrays.
- S143: Admin endpoint to change log level (with shared key); dynamic level propagation.
- S144: Propagate new log level to connected sockets via internal bus.
- S145: Logs export endpoint (JSON/CSV, time and level filters).

#### Lobby & Spectating (V1 usability)
- Public lobby usable by anyone; all active rooms visible (≥1 connected member).
- Server payload for lobby items includes: `gameId`, players present (X/O booleans), `observerCount`, `status`, `lastActiveAt`.
- Broadcast lobby updates on create/join/leave/reset via a lightweight event (e.g., `lobby:update`), with manual Refresh fallback.
- Observers join without occupying player slots; observer view is read-only.
- Keep all rooms public in V1; no private flag yet.

#### Client UX & Debug
- Options panel: Opponent and Begins selection with persistence and clear to placeholder; Alternating default.
- New Game / Reset buttons under board; badges for game room and AI-first indicator.
- Debug menu: Send Test Log, Toggle Debug Panel, Reset Defaults.
- Lobby view listing active rooms (filter to those with ≥1 active member), join flow, observer read-only state.
- Room IDs generated from mountain names with short suffix for uniqueness (per original S098a).
- Accessibility: ARIA roles for board/controls, visible focus outlines, full keyboard navigation.
- No Game notice action wired to create a game (offline/online aware).
- Clear Lobby entry point in header; list includes: Room, Players (X/O occupancy), Observers, Status, Last Active, Actions.
- Actions: Watch (always as observer), Join (if slot open), Copy Link.
- Filters/search: Active (default), Completed (optional), text search by room id; sort by Last Active desc.
- Empty/loading/error states; mobile-friendly single-column layout; lobby disabled offline with banner.

#### Testing & CI stability
- Unit/integration tests for contracts, handlers, repository, schemas, migrations, cache, keys, retention, logger endpoints.
- Client tests for UI, thunks, local rules, logger wrapper, options behavior.
- E2E: Stabilized scripts, strict ports, reuse disabled, kill lingering processes.
- Commit hooks: typecheck, lint, and run tests; enforce conventional commits.
- Start/stop scripts with port cleanup verified; graceful shutdown under SIGTERM.
- Lobby tests: contract for lobby payload, observer read-only invariants; integration join-as-observer; E2E Watch flow; snapshot states (loading/empty/populated); performance cap list (top N + Load more).

### Product Notes for V1
- Strategy values accepted: `ai0`–`ai3`. In V1, all map to `ai0` (random) at decision time.
- UI choice:
  - Option A: Display only Basic (recommended for clarity in V1).
  - Option B: Display all levels with note “Same as Basic in V1” (keeps UX stable for V2).
- Begins: Default to Alternating; create new rooms when necessary so alternation works online.

### Checklist (remaining discrete steps to reach V1 release)
- [x] [s001] Ensure orchestrator routes `ai1`–`ai3` to `ai0` in V1 (flag default true).
- [x] [s002] Verify default Begins is Alternating and clears to placeholder correctly.
- [x] [s003] Verify client storage migrations for strategy and startMode on fresh load.
- [x] [s004] Re-run full test suite (server + client) and E2E sanity after any UX tweaks.
- [x] [s005] Add clear Lobby entry point in header/navigation.
- [x] [s006] Extend `list_games` payload: players occupancy, observerCount, status, lastActiveAt. (server currently returns `games: string[]`; extend in V1.1)
- [x] [s007] Emit `lobby:update` (or reuse existing) on create/join/leave/reset. (manual refresh exists)
- [x] [s008] Implement Lobby list UI: columns, filters/search, sort by Last Active; actions Watch/Join/Copy Link. (basic Join implemented)
- [x] [s009] Enforce observer read-only; unit/integration tests for join-as-observer.
- [x] [s010] Add E2E Watch flow: open lobby → watch → board renders, inputs disabled.
- [x] [s011] Cap lobby list to N items; add Load more; hide completed by default (toggle to show).
- [ ] [s012] Mobile and accessibility polish for lobby; empty/loading/error states; disable lobby offline with banner.
- [ ] [s013] Prepare production MongoDB (Atlas) and run baseline migration (`migrate:up`).
- [ ] [s014] Verify `ensureIndexes()` idempotence in production startup logs.
- [ ] [s015] (Optional) Provision Redis (Upstash) and set `REDIS_URL`, or disable usage.
- [ ] [s016] Set server env vars: `MONGO_URI`, `MONGO_DB`, `ADMIN_KEY`, `CORS_ORIGIN`, `LOG_TO_MONGO`, `LOG_SAMPLE_RATE`.
- [ ] [s017] Set client env var: `VITE_SERVER_URL` (absolute, prod server URL).
  - [ ] Localhost: set `VITE_SERVER_URL=http://localhost:3001` for preview/static hosting
- [ ] [s018] Deploy server; validate `/healthz`, `/readyz`, `/metrics` (if enabled).
- [ ] [s019] Deploy client; confirm SPA loads and connects to server domain.
- [x] [s020] Validate admin controls:
  - [x] `POST /admin/log-level` with admin key changes level and broadcasts to clients.
  - [x] `/admin/logs/export` streams JSON and CSV with filters.
- [ ] [s021] Set up/confirm log retention job (or cron) and retention window.
- [ ] [s022] Lock down security: rotate and store `ADMIN_KEY`, restrict `CORS_ORIGIN`, set conservative `LOG_LEVEL`.
- [ ] [s023] Run smoke E2E against production URLs (quick play: human/AI First, Alternating).
- [ ] [s024] Prepare outsourcing release package: brief, credentials, QA script, acceptance criteria.
- [ ] [s025] Create `v1.0.0` tag, changelog, and deployment notes (URLs, build SHAs).
- [ ] [s026] Post-release monitoring: error rates, room TTL behavior, log volume/sampling.
- [ ] [s027] Collect UX feedback; document priorities for V2 advanced AI.

### Pre-Launch

- Tests and readiness
  - [ ] [s029] All tests green (server and client) on CI; local E2E sanity pass.
  - [ ] [s030] Migrations validated: `migrate-mongo status` clean; `ensureIndexes()` idempotent.
  - [ ] [s031] ENV audited and documented.
  - [ ] [s051] Enforce HTTPS/WSS in production (reverse proxy/platfom config, redirects).
  - [ ] [s052] Cross-browser/device sanity (Chrome, Safari, Firefox; mobile viewport checks).
  - [ ] [s053] Performance/load sanity (basic Artillery or k6 run with thresholds).

- Infrastructure (suggested low‑ops stack)
  - [ ] [s032] Server/API: Render, Fly.io, Railway, or Heroku (Node 20+); `PORT`, health/ready endpoints.
  - [ ] [s033] Client: Vercel/Netlify for static SPA (Vite); base URL points to server.
  - [ ] [s034] MongoDB: Atlas free/shared tier; create `tictactoe` database.
  - [ ] [s035] Redis: Upstash/Redis optional for V1 (can defer); document plan.
  - [ ] [s036] Domains: route apex/subdomain to client; set `SERVER_BASE_URL` in client.

- Configuration (env)
  - [ ] [s037] Server: `MONGO_URI`, `MONGO_DB`, `ADMIN_KEY`, `CORS_ORIGIN`, `LOG_TO_MONGO`, `LOG_SAMPLE_RATE` (and `REDIS_URL` if used).
  - [ ] [s038] Client: `VITE_SERVER_URL` (absolute), sampling knobs if exposed.

- Data & indexes
  - [ ] [s039] Run migrations: `npm --workspace server run migrate:up` (or rely on `ensureIndexes()` if locked down).
  - [ ] [s040] Confirm TTL/indexes on `sessions`, composite on `moves`, time indexes on `logs`.
  - [ ] [s041] Optionally seed demo logs and a demo game for QA.

- Observability & admin
  - [ ] [s042] Validate `POST /admin/log-level` with admin key; broadcast received by clients.
  - [ ] [s043] Validate `/admin/logs/export` JSON/CSV with filters: `from`, `to`, `level`, `gameId`, `sessionId`, `source`, `contains`.
  - [ ] [s044] Document log retention job (cron) and retention window per env.
  - [ ] [s054] Document API events and error catalog in `docs/`.

- Security & access
  - [ ] [s045] Rotate/store `ADMIN_KEY` in platform secrets.
  - [ ] [s046] Restrict `CORS_ORIGIN` to client domain; verify headers/CSP.
  - [ ] [s047] Set conservative log level and sampling in production.
  - [ ] [s055] Generate SBOM and scan images (Syft/Trivy) in CI.
  - [ ] [s056] Enable secret scanning and dependency audits in CI.
  - [ ] [s057] Confirm secret management/rotation policy documented (platform/SSM), beyond `.env`.

- Outsourcing package (Upwork/Freelancer/Fiverr)
  - [ ] [s048] Project brief, prod URLs, temporary admin key (secure sharing), expected test cases, acceptance criteria.
  - [ ] [s049] Deliverables list (report, screenshots, logs, a11y notes).
  - [ ] [s050] Access instructions (read-only, reset/creation instructions), timeline & SLA.
  - [ ] [s058] Add CONTRIBUTING.md and architecture diagram.
  - [ ] [s059] Housekeeping: update `docs/checklist.md` and `docs/notes.md`.

### Launch

- Deploy
  - [ ] [s060] Deploy server; verify `/healthz`, `/readyz`, `/metrics` (if enabled).
  - [ ] [s061] Deploy client; confirm SPA loads and connects to server domain.

- Rollout & QA
  - [ ] [s062] Tag `v1.0.0` (Git tag + changelog), attach commit SHA and build artifact URLs.
  - [ ] [s063] Publish QA script and bug template to outsourcing platform.
  - [ ] [s064] Run smoke E2E against production URLs (human/AI First, Alternating).

- Monitoring & handoff
  - [ ] [s065] Enable dashboards/alerts; watch error rates, room TTL behavior, log volume/sampling.
  - [ ] [s066] Share admin key rotation cadence and runbooks with operators/testers.

#### Post-release
- Monitor error rates and client/server log volumes; adjust `LOG_SAMPLE_RATE`.
- Review room TTL metrics and prune settings; confirm no orphaned rooms persist.
- Gather feedback on UX defaults (Alternating/Basic), finalize V2 AI priorities.

#### Release readiness (alignment with original checklist)
- Target SLOs (latency/availability) met; smoke/perf checks satisfactory.
- Basic load sanity (e.g., dozens of concurrent connections) stable.
- Security: CSP/CORS/headers enforced; admin key rotated; privacy notice present.
- Accessibility checks passed for core flows.
- Backups/migrations verified; CI/CD proven green end‑to‑end.

### V2 Preview (for planning)
- Replace `ai1`–`ai3` implementations with real engines; keep normalized contract.
- Add metrics for decision depth/nodes, wins vs optimal bot, and golden tests.
- Gradual rollout behind `ADVANCED_AI_ENABLED` and per-level flags.


 


