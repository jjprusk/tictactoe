'use strict';

/**
 * Baseline migration: ensure collections exist and create core indexes.
 * This mirrors ensureIndexes() behavior to make schema state explicit.
 */

module.exports = {
  async up(db /*, client */) {
    // Create collections if not existing by creating an index on them
    await db.collection('games').createIndex({ status: 1, updatedAt: -1 });
    await db.collection('games').createIndex({ createdAt: 1 });
    await db.collection('games').createIndex({ updatedAt: -1 });

    await db.collection('moves').createIndex({ gameId: 1, idx: 1 }, { unique: true });
    await db.collection('moves').createIndex({ gameId: 1, createdAt: 1 });

    await db.collection('sessions').createIndex({ gameId: 1, updatedAt: -1 });
    await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    await db.collection('models').createIndex({ version: 1 }, { unique: true });
    await db.collection('models').createIndex({ tags: 1, createdAt: -1 });

    await db.collection('logs').createIndex({ gameId: 1, createdAt: 1 });
    await db.collection('logs').createIndex({ sessionId: 1, createdAt: 1 });
    await db.collection('logs').createIndex({ level: 1, createdAt: 1 });
  },

  async down(db /*, client */) {
    // Rollback: drop the baseline indexes. Keep collections intact.
    await db.collection('games').dropIndexes().catch(() => {});
    await db.collection('moves').dropIndexes().catch(() => {});
    await db.collection('sessions').dropIndexes().catch(() => {});
    await db.collection('models').dropIndexes().catch(() => {});
    await db.collection('logs').dropIndexes().catch(() => {});
  },
};
