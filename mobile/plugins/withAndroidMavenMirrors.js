const { withProjectBuildGradle, withSettingsGradle, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'KHATYAR_ANDROID_MAVEN_MIRRORS';
const REPOS = [
  { name: 'AliyunGoogleMirror', url: 'https://maven.aliyun.com/repository/google' },
  { name: 'AliyunPublicMirror', url: 'https://maven.aliyun.com/repository/public' },
  { name: 'AliyunGradlePluginMirror', url: 'https://maven.aliyun.com/repository/gradle-plugin' },
  { name: 'HuaweiGoogleMirror', url: 'https://repo.huaweicloud.com/repository/maven-google/' },
  { name: 'HuaweiPublicMirror', url: 'https://repo.huaweicloud.com/repository/maven/' },
];

function repoSnippet(indent, kotlinStyle) {
  const lines = [`${indent}mavenLocal()`];
  for (const repo of REPOS) {
    lines.push(`${indent}maven {`);
    lines.push(`${indent}    name = "${repo.name}"`);
    lines.push(`${indent}    url = uri("${repo.url}")`);
    lines.push(`${indent}    metadataSources { gradleMetadata(); mavenPom(); artifact() }`);
    lines.push(`${indent}}`);
  }
  return lines.join('\n') + '\n';
}

function findBlock(source, name, startAt = 0) {
  const match = new RegExp(`\\b${name}\\s*\\{`, 'g');
  match.lastIndex = startAt;
  const hit = match.exec(source);
  if (!hit) return null;
  const open = source.indexOf('{', hit.index);
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
      if (depth === 0) return { start: hit.index, open, end: i + 1 };
    }
  }
  return null;
}

function injectIntoRepositories(source, repositoriesBlock, kotlinStyle) {
  const body = source.slice(repositoriesBlock.open + 1, repositoriesBlock.end - 1);
  if (body.includes(MARKER)) return source;
  const prefix = `\n    // ${MARKER}: generic public mirrors first, official repositories remain as fallback.\n`;
  return source.slice(0, repositoriesBlock.open + 1) + prefix + repoSnippet('    ', kotlinStyle) + source.slice(repositoriesBlock.open + 1);
}

function ensureRepositories(source, parentName, kotlinStyle) {
  const parent = findBlock(source, parentName);
  if (!parent) return source;
  const existing = findBlock(source, 'repositories', parent.open + 1);
  if (existing && existing.start < parent.end) return injectIntoRepositories(source, existing, kotlinStyle);

  const block = `\n  repositories {\n    // ${MARKER}: generic public mirrors first, official repositories remain as fallback.\n${repoSnippet('    ', kotlinStyle)}    google()\n    mavenCentral()\n${parentName === 'pluginManagement' ? '    gradlePluginPortal()\n' : ''}  }\n`;
  return source.slice(0, parent.open + 1) + block + source.slice(parent.open + 1);
}

function patchGradleFile(file) {
  let source = fs.readFileSync(file, 'utf8');
  if (source.includes(MARKER)) return false;
  const kotlinStyle = file.toLowerCase().endsWith('.kts');
  const name = path.basename(file).toLowerCase();
  if (name.startsWith('settings.gradle')) {
    source = ensureRepositories(source, 'pluginManagement', kotlinStyle);
    if (!findBlock(source, 'pluginManagement')) {
      source = `pluginManagement {\n    // ${MARKER}: generic public mirrors first, official repositories remain as fallback.\n${repoSnippet('    ', kotlinStyle)}    google()\n    mavenCentral()\n    gradlePluginPortal()\n}\n\n` + source;
    }
  } else {
    source = ensureRepositories(source, 'buildscript', kotlinStyle);
    source = ensureRepositories(source, 'allprojects', kotlinStyle);
    source = ensureRepositories(source, 'repositories', kotlinStyle);
  }
  fs.writeFileSync(file, source.replace(/\r\n/g, '\n'), 'utf8');
  return true;
}

function patchTree(dir) {
  if (!dir || !fs.existsSync(dir)) return 0;
  const stack = [dir];
  let changed = 0;
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!['.gradle', 'build'].includes(entry.name)) stack.push(full);
      } else if (/^(settings|build)\.gradle(?:\.kts)?$/i.test(entry.name)) {
        if (patchGradleFile(full)) changed += 1;
      }
    }
  }
  return changed;
}

function resolveAndroidDir(packageName, rootDir) {
  try {
    const pkg = require.resolve(`${packageName}/package.json`, { paths: [rootDir] });
    return path.join(path.dirname(pkg), 'android');
  } catch (_) {
    return null;
  }
}

module.exports = function withAndroidMavenMirrors(config) {
  config = withSettingsGradle(config, (cfg) => {
    cfg.modResults.contents = ensureRepositories(cfg.modResults.contents, 'pluginManagement', true);
    return cfg;
  });

  config = withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    let contents = cfg.modResults.contents;
    contents = ensureRepositories(contents, 'buildscript', false);
    contents = ensureRepositories(contents, 'allprojects', false);
    cfg.modResults.contents = contents;
    return cfg;
  });

  config = withDangerousMod(config, ['android', async (cfg) => {
    const rootDir = cfg.modRequest.projectRoot;
    const expoAndroid = resolveAndroidDir('expo-modules-autolinking', rootDir);
    const rnAndroid = resolveAndroidDir('@react-native/gradle-plugin', rootDir);
    const mainAndroid = cfg.modRequest.platformProjectRoot;
    const changed = [
      patchTree(expoAndroid && path.join(expoAndroid, 'expo-gradle-plugin')),
      patchTree(rnAndroid),
      patchTree(path.join(mainAndroid, 'expo-gradle-plugin')),
      patchTree(path.join(mainAndroid, 'gradle-plugin')),
    ].reduce((a, b) => a + b, 0);
    console.log(`[withAndroidMavenMirrors] patched ${changed} generated Gradle file(s).`);
    return cfg;
  }]);

  return config;
};
