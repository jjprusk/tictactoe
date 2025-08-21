// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import {
  PlayerSchema,
  BoardSchema,
  StrategySchema,
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
  AdminListGamesRequestSchema,
  AdminListGamesAckSchema,
  AdminCloseGameRequestSchema,
  AdminCloseGameAckSchema,
} from './contracts';

describe('socket contracts', () => {
  it('validates player and board schemas', () => {
    expect(PlayerSchema.parse('X')).toBe('X');
    expect(PlayerSchema.parse('O')).toBe('O');
    expect(() => PlayerSchema.parse('Z')).toThrow();
    expect(BoardSchema.parse([null, null, null, null, null, null, null, null, null]).length).toBe(9);
  });

  it('create_game request/ack schemas', () => {
    expect(StrategySchema.parse('random')).toBe('random');
    expect(CreateGameRequestSchema.parse({})).toEqual({});
    const ok = CreateGameAckSchema.parse({ ok: true, gameId: 'g1', player: 'X', sessionToken: 's1' });
    expect(ok.ok).toBe(true);
    const err = CreateGameAckSchema.parse({ ok: false, error: 'nope' });
    expect(err.ok).toBe(false);
  });

  it('join_game request/ack schemas', () => {
    expect(JoinGameRequestSchema.parse({ gameId: 'g', sessionToken: 's' })).toEqual({ gameId: 'g', sessionToken: 's' });
    const ok = JoinGameAckSchema.parse({ ok: true, role: 'player', player: 'O', sessionToken: 's2' });
    if ('role' in ok) {
      expect(ok.role).toBe('player');
    } else {
      throw new Error('expected ok ack with role');
    }
    const err = JoinGameAckSchema.parse({ ok: false, error: 'nope' });
    expect(err.ok).toBe(false);
  });

  it('leave_game request/ack schemas', () => {
    expect(LeaveGameRequestSchema.parse({ gameId: 'g' })).toEqual({ gameId: 'g' });
    const ok = LeaveGameAckSchema.parse({ ok: true });
    expect(ok.ok).toBe(true);
  });

  it('make_move request/ack schemas', () => {
    const req = MakeMoveRequestSchema.parse({ gameId: 'g', position: 4, player: 'X', nonce: 'n1' });
    expect(req.position).toBe(4);
    const ok = MakeMoveAckSchema.parse({ ok: true });
    expect(ok.ok).toBe(true);
  });

  it('game_state payload schema', () => {
    const payload = GameStatePayloadSchema.parse({
      gameId: 'g',
      board: [null, null, null, null, 'X', null, null, null, null],
      currentPlayer: 'O',
      lastMove: 4,
    });
    expect(payload.currentPlayer).toBe('O');
  });

  it('error payload schema', () => {
    const e = ErrorPayloadSchema.parse({ code: 'invalid', message: 'bad' });
    expect(e.code).toBe('invalid');
  });

  it('admin schemas', () => {
    expect(ElevateAdminRequestSchema.parse({ adminKey: 'k' })).toEqual({ adminKey: 'k' });
    const elevParsed = ElevateAdminAckSchema.safeParse({ ok: true, role: 'admin' });
    expect(elevParsed.success).toBe(true);
    if (elevParsed.success && 'role' in elevParsed.data) {
      expect((elevParsed.data as any).role).toBe('admin');
    }

    expect(AdminListGamesRequestSchema.parse({})).toEqual({});
    const listParsed = AdminListGamesAckSchema.safeParse({ ok: true, games: ['everest'] });
    expect(listParsed.success).toBe(true);
    if (listParsed.success && 'games' in listParsed.data) {
      expect((listParsed.data as any).games).toContain('everest');
    }

    expect(AdminCloseGameRequestSchema.parse({ gameId: 'g' })).toEqual({ gameId: 'g' });
    const closeOk = AdminCloseGameAckSchema.parse({ ok: true });
    expect(closeOk.ok).toBe(true);
  });
});


