// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import {
  keyGameState,
  keyGameNonces,
  keyGameNonce,
  keyGameLock,
  keyRoomMembers,
  keyRoomPlayers,
  keyRoomLastActive,
  keySession,
  keySessionLock,
  keySocketRate,
} from './keys';

describe('db/keys redis key builders', () => {
  it('builds game-scoped keys', () => {
    expect(keyGameState('g1')).toBe('game:g1:state');
    expect(keyGameNonces('g1')).toBe('game:g1:nonces');
    expect(keyGameNonce('g1', 'n1')).toBe('nonce:g1:n1');
    expect(keyGameLock('g1')).toBe('lock:game:g1');
  });

  it('builds room-scoped keys', () => {
    expect(keyRoomMembers('g2')).toBe('room:g2:members');
    expect(keyRoomPlayers('g2')).toBe('room:g2:players');
    expect(keyRoomLastActive('g2')).toBe('room:g2:lastActive');
  });

  it('builds session and rate keys', () => {
    expect(keySession('tok')).toBe('session:tok');
    expect(keySessionLock('tok')).toBe('lock:session:tok');
    expect(keySocketRate('sid')).toBe('rate:sid');
  });

  it('validates non-empty inputs', () => {
    expect(() => keyGameState('' as any)).toThrow(/gameId/);
    expect(() => keyGameNonce('g', '' as any)).toThrow(/nonce/);
    expect(() => keySession('' as any)).toThrow(/sessionToken/);
    expect(() => keySocketRate('' as any)).toThrow(/socketId/);
  });
});
