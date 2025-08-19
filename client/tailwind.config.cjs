// Tailwind config for client workspace.
// Import the root theme and override content globs to be client-relative.
const rootCfg = require('../tailwind.config.js');

module.exports = {
  ...rootCfg,
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
};


