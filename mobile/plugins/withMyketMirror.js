const { withProjectBuildGradle, withSettingsGradle, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

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

function repoSnippet(indent = '    ', kotlinStyle = false) {
  if (kotlinStyle) {
    return `${indent}mavenLocal()\n` +
      `${indent}maven {\n` +
      `${indent}    name = "MyketMirror"\n` +
      `${indent}    url = uri("${MYKET_URL}")\n` +
      `${indent}    metadataSources { gradleMetadata(); mavenPom(); artifact() }\n` +
      `${indent}}\n`;
  }
  return `${indent}mavenLocal()\n` +
    `${indent}maven {\n` +
    `${indent}    name = 'MyketMirror'\n` +
    `${indent}    url = uri("${MYKET_URL}")\n` +
    `${indent}    metadataSources { gradleMetadata(); mavenPom(); artifact() }\n` +
    `${indent}}\n`;
}

function ensureRepositoriesInside(source, parentName, kotlinStyle = false) {
  const parent = findBlock(source, parentName);
  if (!parent) return source;
  const existing = findBlock(source, 'repositories', parent.open + 1);
  if (existing && existing.start < parent.end) {
    const body = source.slice(existing.open + 1, existing.end - 1);
    if (body.includes(MARKER) || body.includes('maven.myket.ir')) return source;
    const insertion = `\n${markerLine(4)}${repoSnippet('    ', kotlinStyle)}${'    '}`;
    return source.slice(0, existing.open + 1) + insertion + source.slice(existing.open + 1);
  }

  const block = `\n  repositories {\n${markerLine(4)}${repoSnippet('    ', kotlinStyle)}` +
    `    google()\n    mavenCentral()\n` +
    (parentName === 'pluginManagement' ? `    gradlePluginPortal()\n` : '') +
    `  }\n`;
  return source.slice(0, parent.open + 1) + block + source.slice(parent.open + 1);
}

function markerLine(indent = 4) {
  return `${' '.repeat(indent)}// ${MARKER}: local cache first, then Myket mirror; official repositories remain as fallback.\n`;
}

function patchFile(file) {
  let source = fs.readFileSync(file, 'utf8');
  if (source.includes(MARKER)) return false;

  const kotlinStyle = file.toLowerCase().endsWith('.kts');
  const repositories = findBlock(source, 'repositories');
  if (repositories) {
    const insertionIndent = kotlinStyle ? '    ' : '    ';
    const insertion = `\n${markerLine(2)}${repoSnippet(insertionIndent, kotlinStyle)}`;
    source = source.slice(0, repositories.open + 1) + insertion + source.slice(repositories.open + 1);
  } else {
    source = `${markerLine(0)}repositories {\n${repoSnippet('    ', kotlinStyle)}    google()\n    mavenCentral()\n}\n\n${source}`;
  }

  fs.writeFileSync(file, source.replace(/\r\n/g, '\n'), 'utf8');
  return true;
}

function patchTree(dir) {
  if (!fs.existsSync(dir)) return 0;
  const files = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/^build\.gradle(?:\.kts)?$/i.test(entry.name) || /^settings\.gradle(?:\.kts)?$/i.test(entry.name)) {
        files.push(full);
      }
    }
  }
  let changed = 0;
  for (const file of files) if (patchFile(file)) changed += 1;
  return changed;
}

function resolvePackageAndroidDir(packageName, rootDir) {
  try {
    const pkgJson = require.resolve(`${packageName}/package.json`, { paths: [rootDir] });
    return path.join(path.dirname(pkgJson), 'android');
  } catch (_) {
    return null;
  }
}

module.exports = function withMyketMirror(config) {
  config = withSettingsGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    contents = ensureRepositoriesInside(contents, 'pluginManagement', true);
    const lineRe = /^rootProject\.name\s*=.*$/m;
    if (lineRe.test(contents)) contents = contents.replace(lineRe, "rootProject.name = 'taxi-control'");
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

  config = withDangerousMod(config, ['android', async (cfg) => {
    const projectRoot = cfg.modRequest.projectRoot;

    // Expo SDK 57 includes the autolinking Gradle build directly from the
    // expo-modules-autolinking package. Patch that actual source tree rather
    // than assuming Expo copied it under android/.
    const expoAutolinkingAndroid = resolvePackageAndroidDir('expo-modules-autolinking', projectRoot);
    patchTree(expoAutolinkingAndroid ? path.join(expoAutolinkingAndroid, 'expo-gradle-plugin') : '');

    // React Native's Gradle plugin is also an included build in SDK 57.
    const reactNativeGradlePlugin = resolvePackageAndroidDir('@react-native/gradle-plugin', projectRoot);
    if (reactNativeGradlePlugin) patchTree(reactNativeGradlePlugin);

    // Keep compatibility with any generated/cached included-build copies.
    patchTree(path.join(cfg.modRequest.platformProjectRoot, 'expo-gradle-plugin'));
    patchTree(path.join(cfg.modRequest.platformProjectRoot, 'gradle-plugin'));
    return cfg;
  }]);

  return config;
};