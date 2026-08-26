const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function withGradle9Syntax(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    let src = cfg.modResults.contents;
    src = src.replace(/(^|\n)(\s*)url\s+(['\"])(https?:\/\/[^'\"]+)\3\s*(?=\n|\r?\n|$)/g, (m, nl, indent, q, url) => `${nl}${indent}url = uri(${q}${url}${q})`);
    cfg.modResults.contents = src;
    return cfg;
  });
};
