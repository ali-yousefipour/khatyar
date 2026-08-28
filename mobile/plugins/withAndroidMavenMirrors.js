const { withProjectBuildGradle, withSettingsGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'KHATYAR_ANDROID_PUBLIC_MAVEN_MIRRORS';
const REPOS = [
  { name: 'AliyunGoogleMirror', url: 'https://maven.aliyun.com/repository/google' },
  { name: 'AliyunPublicMirror', url: 'https://maven.aliyun.com/repository/public' },
  { name: 'AliyunGradlePluginMirror', url: 'https://maven.aliyun.com/repository/gradle-plugin' },
  { name: 'HuaweiGoogleMirror', url: 'https://repo.huaweicloud.com/repository/maven-google/' },
  { name: 'HuaweiPublicMirror', url: 'https://repo.huaweicloud.com/repository/maven/' },
];

function repoSnippet(indent) {
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

function injectRepositories(source, block) {
  const body = source.slice(block.open + 1, block.end - 1);
  if (body.includes(MARKER)) return source;
  const insertion = `\n    // ${MARKER}: public mirrors first; official repositories remain as fallback.\n${repoSnippet('    ')}`;
  return source.slice(0, block.open + 1) + insertion + source.slice(block.open + 1);
}

function ensureRepositories(source, parentName) {
  const parent = findBlock(source, parentName);
  if (!parent) return source;
  const repositories = findBlock(source, 'repositories', parent.open + 1);
  if (repositories && repositories.start < parent.end) return injectRepositories(source, repositories);
  const block = `\n  repositories {\n    // ${MARKER}: public mirrors first; official repositories remain as fallback.\n${repoSnippet('    ')}    google()\n    mavenCentral()\n${parentName === 'pluginManagement' ? '    gradlePluginPortal()\n' : ''}  }\n`;
  return source.slice(0, parent.open + 1) + block + source.slice(parent.open + 1);
}

function ensureTopLevelRepositories(source) {
  if (source.includes(MARKER)) return source;
  const match = /^repositories\s*\{/m.exec(source);
  if (match) {
    const block = findBlock(source, 'repositories', match.index);
    if (block && block.start === match.index) return injectRepositories(source, block);
  }
  const insertion = `// ${MARKER}: public mirrors first; official repositories remain as fallback.\nrepositories {\n${repoSnippet('  ')}  google()\n  mavenCentral()\n}\n\n`;
  return insertion + source;
}

function patchGradleFile(file) {
  let source = fs.readFileSync(file, 'utf8');
  if (source.includes(MARKER)) return false;
  const name = path.basename(file).toLowerCase();
  if (name.startsWith('settings.gradle')) {
    source = ensureRepositories(source, 'pluginManagement');
  } else {
    source = ensureRepositories(source, 'buildscript');
    source = ensureRepositories(source, 'allprojects');
    source = ensureTopLevelRepositories(source);
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
    cfg.modResults.contents = ensureRepositories(cfg.modResults.contents, 'pluginManagement');
    return cfg;
  });

  config = withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    let contents = cfg.modResults.contents;
    contents = ensureRepositories(contents, 'buildscript');
    contents = ensureRepositories(contents, 'allprojects');
    contents = ensureTopLevelRepositories(contents);
    cfg.modResults.contents = contents;
    return cfg;
  });

  config = withDangerousMod(config, ['android', async (cfg) => {
    const rootDir = cfg.modRequest.projectRoot;
    const mainAndroid = cfg.modRequest.platformProjectRoot;
    const expoAndroid = resolveAndroidDir('expo-modules-autolinking', rootDir);
    const rnAndroid = resolveAndroidDir('@react-native/gradle-plugin', rootDir);
    const changed = [
      patchTree(expoAndroid && path.join(expoAndroid, 'expo-gradle-plugin')),
      patchTree(rnAndroid),
      patchTree(path.join(mainAndroid, 'expo-gradle-plugin')),
      patchTree(path.join(mainAndroid, 'gradle-plugin')),
    ].reduce((sum, value) => sum + value, 0);
    console.log(`[withAndroidMavenMirrors] patched ${changed} generated Gradle file(s) with public Maven mirrors.`);
    return cfg;
  }]);

  return config;
};
