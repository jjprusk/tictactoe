# TicTacToe AI

A web-based TicTacToe game with a backend-only neural AI that learns from gameplay. The frontend is a lightweight React UI communicating with the server via Socket.IO. See `docs/request.md` for requirements and `docs/implementation_plan.md` for the ordered implementation steps.

## Repository Layout
- `server/`: Node.js server (Express + Socket.IO), AI orchestration, persistence, observability
- `client/`: React + TypeScript frontend (mobile-first, real-time UX)
- `docs/`: Specifications, plans, and notes

## Getting Started
1) Prerequisites
- Node.js v20+
- Git

2) Clone
```bash
git clone https://github.com/jjprusk/tictactoe.git
cd tictactoe
```

3) Next Steps
- Follow the steps in `docs/implementation_plan.md` (check off items as you go)
- All new markdown docs go in `docs/` (this README is the root overview)

## Contributing
- Use Conventional Commits
- Prefer small, incremental PRs aligned with `docs/implementation_plan.md`

## License
MIT — see `LICENSE`.
