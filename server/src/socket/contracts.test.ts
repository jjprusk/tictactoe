// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import {
  PlayerSchema,
  BoardSchema,
  CreateGameRequestSchema,
  CreateGameAckSchema,
  JoinGameRequestSchema,
  JoinGameAckSchema,
  LeaveGameRequestSchema,
  LeaveGameAckSchema,
  MakeMoveRequestSchema,
  MakeMoveAckSchema,
  GameStatePayloadSchema,
  ErrorPayloadSchema,
  ElevateAdminRequestSchema,
  ElevateAdminAckSchema,
  AdminListGamesAckSchema,
  AdminCloseGameAckSchema,
  AdminRoomInfoAckSchema,
  ListGamesRequestSchema,
  ListGamesAckSchema,
} from './contracts';

describe('socket contracts', () => {
  it('validates player and board schemas', () => {
    expect(PlayerSchema.parse('X')).toBe('X');
    expect(BoardSchema.parse(Array.from({ length: 9 }, () => null))).toHaveLength(9);
  });

  it('create_game request/ack schemas', () => {
    expect(CreateGameRequestSchema.parse({})).toEqual({});
    const ok = CreateGameAckSchema.parse({ ok: true, gameId: 'g1', player: 'X', currentPlayer: 'X' });
    expect(ok.ok).toBe(true);
    const err = CreateGameAckSchema.parse({ ok: false, error: 'nope' });
    expect(err.ok).toBe(false);
  });

  it('join_game request/ack schemas', () => {
    expect(JoinGameRequestSchema.parse({ gameId: 'g' })).toEqual({ gameId: 'g' });
    const ok = JoinGameAckSchema.parse({ ok: true, role: 'player', player: 'O' });
    expect(ok.ok).toBe(true);
  });

  it('leave_game request/ack schemas', () => {
    expect(LeaveGameRequestSchema.parse({ gameId: 'g' })).toEqual({ gameId: 'g' });
    const ok = LeaveGameAckSchema.parse({ ok: true });
    expect(ok.ok).toBe(true);
  });

  it('make_move request/ack schemas', () => {
    expect(MakeMoveRequestSchema.parse({ gameId: 'g', position: 0, player: 'X', nonce: 'n' })).toBeTruthy();
    const ok = MakeMoveAckSchema.parse({ ok: true });
    expect(ok.ok).toBe(true);
  });

  it('game_state payload schema', () => {
    const s = GameStatePayloadSchema.parse({ gameId: 'g', board: Array.from({ length: 9 }, () => null), currentPlayer: 'X' });
    expect(s.currentPlayer).toBe('X');
  });

  it('error payload schema', () => {
    const e = ErrorPayloadSchema.parse({ code: 'x', message: 'y' });
    expect(e.code).toBe('x');
  });

  it('admin schemas', () => {
    const e1 = ElevateAdminRequestSchema.parse({ adminKey: 'k' });
    expect(e1.adminKey).toBe('k');
    const a1 = ElevateAdminAckSchema.parse({ ok: true, role: 'admin' });
    expect(a1.ok).toBe(true);
    const l = AdminListGamesAckSchema.parse({ ok: true, games: [] });
    if (l.ok) expect(l.games).toEqual([]);
    const c = AdminCloseGameAckSchema.parse({ ok: true });
    expect(c.ok).toBe(true);
    const ri = AdminRoomInfoAckSchema.parse({ ok: true, gameId: 'g', playerCount: 0, observerCount: 0, players: [] });
    expect(ri.ok).toBe(true);
  });

  it('public list_games schemas', () => {
    const r = ListGamesRequestSchema.parse({});
    expect(r).toEqual({});
    const a = ListGamesAckSchema.parse({ ok: true, games: [] });
    expect(a.ok).toBe(true);
  });
});


