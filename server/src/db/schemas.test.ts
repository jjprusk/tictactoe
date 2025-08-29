// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import {
  GameDocSchema,
  MoveDocSchema,
  SessionDocSchema,
  ModelDocSchema,
  LogDocSchema,
} from './schemas';

describe('db schemas', () => {
  it('validates a minimal game doc', () => {
    const g = GameDocSchema.parse({
      _id: 'g1',
      createdAt: new Date(),
      updatedAt: new Date(),
      startingPlayer: 'X',
      strategy: 'ai0',
    });
    expect(g._id).toBe('g1');
    expect(g.status).toBe('active');
  });

  it('validates a move doc', () => {
    const m = MoveDocSchema.parse({
      gameId: 'g1',
      idx: 0,
      position: 4,
      player: 'X',
      createdAt: new Date(),
    });
    expect(m.idx).toBe(0);
  });

  it('validates a session doc', () => {
    const s = SessionDocSchema.parse({
      _id: 's_tok',
      gameId: 'g1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(s._id).toBe('s_tok');
  });

  it('validates a model doc', () => {
    const d = ModelDocSchema.parse({ _id: 'm1', version: '1.0.0', createdAt: new Date(), tags: [] });
    expect(d.version).toBe('1.0.0');
  });

  it('validates a log doc', () => {
    const l = LogDocSchema.parse({ level: 'info', message: 'x', createdAt: new Date(), origin: 'server' });
    expect(l.level).toBe('info');
  });
});


