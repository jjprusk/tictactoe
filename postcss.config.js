// Redirect to client-specific PostCSS config (CommonJS) to avoid requiring tailwind in server workspace
module.exports = require('./client/postcss.config.cjs');
