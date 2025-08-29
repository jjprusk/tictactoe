'use strict';

const url = process.env.MONGO_URI || 'mongodb://localhost:27017/tictactoe';

function getDbNameFromUrl(mongoUrl) {
  try {
    const parsed = new URL(mongoUrl);
    const path = parsed.pathname || '';
    const name = path.startsWith('/') ? path.slice(1) : path;
    return name || 'tictactoe';
  } catch (_e) {
    return 'tictactoe';
  }
}

module.exports = {
  mongodb: {
    url,
    databaseName: process.env.MONGO_DB || getDbNameFromUrl(url),
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.js',
  useFileHash: false,
};
