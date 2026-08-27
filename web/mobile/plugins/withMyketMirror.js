const { withProjectBuildGradle, withSettingsGradle } = require('expo/config-plugins');

const MYKET_URL = 'https://maven.myket.ir/';
const MARKER = 'KHATYAR_MYKET_MIRROR';

function findBlock(source, name, startAt = 0) {
  const re = new RegExp(`\\b${name}\\s*\\{`, 'g');
  re.lastIndex = startAt;
  const match = re.exec(source);
  if (!match) return null;
  const open = source.indexOf('{', match.index);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return { start: match.index, open, end: i + 1 };
    }
  }
  return null;
}

function repoBlock(indent = '    ', kotlinStyle = false) {
  const urlLine = kotlinStyle
    ? `${indent}  url = uri("${MYKET_URL}")`
    : `${indent}  url = uri("${MYKET_URL}")`;
  return `${indent}// ${MARKER}: local cache first, then Myket mirror; official repositories remain as fallback.\n` +
    `${indent}mavenLocal()\n` +
    `${indent}maven {\n${indent}  name = 'MyketMirror'\n${urlLine}\n` +
    `${indent}  metadataSources { gradleMetadata(); mavenPom(); artifact() }\n${indent}}\n`;
}

function ensureRepositoriesInside(source, parentName, kotlinStyle = false) {
  const parent = findBlock(source, parentName);
  if (!parent) return source;
  const existing = findBlock(source, 'repositories', parent.open + 1);
  if (existing && existing.start < parent.end) {
    const body = source.slice(existing.open + 1, existing.end - 1);
    if (body.includes(MARKER) || body.includes('maven.myket.ir')) return source;
    const insertion = `\n${repoBlock('    ', kotlinStyle)}`;
    return source.slice(0, existing.open + 1) + insertion + source.slice(existing.open + 1);
  }

  const block = `\n  repositories {\n${repoBlock('    ', kotlinStyle)}` +
    `    google()\n    mavenCentral()\n` +
    (parentName === 'pluginManagement' ? `    gradlePluginPortal()\n` : '') +
    `  }\n`;
  return source.slice(0, parent.open + 1) + block + source.slice(parent.open + 1);
}

module.exports = function withMyketMirror(config) {
  config = withSettingsGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    contents = ensureRepositoriesInside(contents, 'pluginManagement', true);
    const lineRe = /^rootProject\.name\s*=.*$/m;
    if (lineRe.test(contents)) {
      contents = contents.replace(lineRe, "rootProject.name = 'taxi-control'");
    }
    cfg.modResults.contents = contents;
    return cfg;
  });

  config = withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    let contents = cfg.modResults.contents;
    contents = ensureRepositoriesInside(contents, 'buildscript', false);
    contents = ensureRepositoriesInside(contents, 'allprojects', false);
    cfg.modResults.contents = contents;
    return cfg;
  });

  return config;
};
