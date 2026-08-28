const expoTransformer = require('@expo/metro-config/babel-transformer');

/**
 * Temporary source-safety guard for the generated/merged App.js.
 *
 * The current main branch can contain a RadioProvider opening tag without its
 * matching closing tag. Metro/Babel rejects the file before any application
 * code can run. Repair only this exact structural case in the transformer so
 * the release build remains reproducible even when a generated App.js is
 * stale. No other JavaScript source is changed here.
 */
function repairRadioProvider(filename, src) {
  if (!filename || !/[/\\]App\.js$/i.test(filename)) return src;
  const hasOpen = /<RadioProvider\b/.test(src);
  const hasClose = /<\/RadioProvider\s*>/.test(src);
  if (!hasOpen || hasClose) return src;

  const authClose = /<\/AuthProvider\s*>/;
  if (!authClose.test(src)) return src;

  return src.replace(authClose, '</RadioProvider></AuthProvider>');
}

module.exports = {
  getCacheKey: expoTransformer.getCacheKey,
  async transform({ src, filename, options }) {
    const repaired = repairRadioProvider(filename, src);
    return expoTransformer.transform({ src: repaired, filename, options });
  },
};
