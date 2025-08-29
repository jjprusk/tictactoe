// © 2025 Joe Pruskowski
import { describe, it, expect, beforeEach } from 'vitest';
import { __setClientForTest } from './mongo';
import { saveGameStart, saveMove, saveGameOutcome } from './repository';
import type { MongoClient } from 'mongodb';

function buildFakeMongo() {
  const calls: { gamesInsert?: any; movesInsert?: any; gameUpdate?: any } = {};
  const collections = new Map<string, any>();
  const mkCollection = (name: string) => {
    const coll = {
      insertOne: async (doc: any) => {
        if (name === 'games') calls.gamesInsert = doc;
        if (name === 'moves') calls.movesInsert = doc;
        return { acknowledged: true, insertedId: doc?._id ?? `${name}-id` };
      },
      updateOne: async (filter: any, update: any) => {
        if (name === 'games') calls.gameUpdate = { filter, update };
        return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
      },
    };
    return coll;
  };
  const db = (dbName?: string) => ({
    __dbName: dbName,
    collection: (name: string) => {
      if (!collections.has(name)) collections.set(name, mkCollection(name));
      return collections.get(name);
    },
  });
  const client: Partial<MongoClient> = {
    db: db as any,
  };
  return { client: client as MongoClient, calls };
}

describe('repository unit (fake mongo)', () => {
  beforeEach(() => {
    __setClientForTest(null);
  });

  it('saveGameStart validates input and throws on invalid gameId', async () => {
    const { client } = buildFakeMongo();
    __setClientForTest(client);
    await expect(
      saveGameStart({ gameId: '', startingPlayer: 'X', strategy: 'ai0' }, 'unit_db')
    ).rejects.toBeTruthy();
  });

  it('saveMove validates idx and position', async () => {
    const { client } = buildFakeMongo();
    __setClientForTest(client);
    await expect(
      saveMove({ gameId: 'g', idx: -1, position: 0, player: 'X' }, 'unit_db')
    ).rejects.toBeTruthy();
    await expect(
      saveMove({ gameId: 'g', idx: 0, position: 9, player: 'X' }, 'unit_db')
    ).rejects.toBeTruthy();
  });

  it('saveMove inserts into moves with createdAt default', async () => {
    const { client, calls } = buildFakeMongo();
    __setClientForTest(client);
    const doc = await saveMove({ gameId: 'g', idx: 1, position: 4, player: 'O' }, 'unit_db');
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(calls.movesInsert).toBeTruthy();
    expect(calls.movesInsert.gameId).toBe('g');
    expect(calls.movesInsert.idx).toBe(1);
    expect(calls.movesInsert.position).toBe(4);
    expect(calls.movesInsert.player).toBe('O');
  });

  it('saveGameOutcome updates status only when no winner/draw provided', async () => {
    const { client, calls } = buildFakeMongo();
    __setClientForTest(client);
    await saveGameOutcome({ gameId: 'gid' }, 'unit_db');
    expect(calls.gameUpdate?.filter).toEqual({ _id: 'gid' });
    expect(calls.gameUpdate?.update.$set.status).toBe('completed');
    expect(new Date(calls.gameUpdate?.update.$set.updatedAt).getTime()).toBeGreaterThan(0);
    expect(calls.gameUpdate?.update.$set.winner).toBeUndefined();
    expect(calls.gameUpdate?.update.$set.draw).toBeUndefined();
  });
});
