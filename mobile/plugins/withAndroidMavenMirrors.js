const { withProjectBuildGradle, withSettingsGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// KhatYar dependency-resolution policy:
// 1) local Maven repository
// 2) Myket Maven mirror
// 3) Runflare mirrors for groups that are safe to query
// 4) official repositories
//
// Runflare is intentionally excluded for Expo/React Native coordinates because
// the service has returned HTTP 500 for valid Expo POMs/artifacts. Repository
// declaration order is not sufficient protection against a 5xx response.
const MARKER = 'KHATYAR_ANDROID_MAVEN_MIRRORS';
const REPOS = [
  { name: 'MyketMaven', url: 'https://maven.myket.ir/', allowGradleMetadata: true },
  { name: 'RunflareGoogle', url: 'https://mirror-maven.runflare.com/android/maven2/', allowGradleMetadata: false },
  { name: 'RunflareMaven', url: 'https://mirror-maven.runflare.com/maven2/', allowGradleMetadata: false },
  { name: 'RunflareGradlePlugins', url: 'https://mirror-maven.runflare.com/gradle-plugins/', allowGradleMetadata: false },
];

function addRunflareContentGroovy(lines, indent) {
  lines.push(`${indent}content {`);
  lines.push(`${indent}    excludeGroupByRegex "expo\\\\.modules(\\\\..*)?"`);
  lines.push(`${indent}    excludeGroup "host.exp.exponent"`);
  lines.push(`${indent}    excludeGroupByRegex "com\\\\.facebook\\\\.react(\\\\..*)?"`);
  lines.push(`${indent}    excludeGroupByRegex "com\\\\.facebook\\\\.fbjni(\\\\..*)?"`);
  lines.push(`${indent}}`);
}

function addRunflareContentKotlin(lines, indent) {
  lines.push(`${indent}content {`);
  lines.push(`${indent}    excludeGroupByRegex("expo\\\\.modules(\\\\..*)?")`);
  lines.push(`${indent}    excludeGroup("host.exp.exponent")`);
  lines.push(`${indent}    excludeGroupByRegex("com\\\\.facebook\\\\.react(\\\\..*)?")`);
  lines.push(`${indent}    excludeGroupByRegex("com\\\\.facebook\\\\.fbjni(\\\\..*)?")`);
  lines.push(`${indent}}`);
}

function repoSnippetGroovy(indent) {
  const lines = [`${indent}mavenLocal()`];
  for (const repo of REPOS) {
    lines.push(`${indent}maven {`);
    lines.push(`${indent}    name = "${repo.name}"`);
    lines.push(`${indent}    url = uri("${repo.url}")`);
    if (repo.allowGradleMetadata) {
      lines.push(`${indent}    metadataSources { gradleMetadata(); mavenPom(); artifact() }`);
    } else {
      lines.push(`${indent}    metadataSources { mavenPom(); artifact() }`);
      addRunflareContentGroovy(lines, `${indent}    `);
    }
    lines.push(`${indent}}`);
  }
  return lines.join('\n') + '\n';
}

function repoSnippetKotlin(indent) {
  const lines = [`${indent}mavenLocal()`];
  for (const repo of REPOS) {
    lines.push(`${indent}maven {`);
    lines.push(`${indent}    name = "${repo.name}"`);
    lines.push(`${indent}    url = uri("${repo.url}")`);
    lines.push(`${indent}    metadataSources {`);
    if (repo.allowGradleMetadata) lines.push(`${indent}        gradleMetadata()`);
    lines.push(`${indent}        mavenPom()`);
    lines.push(`${indent}        artifact()`);
    lines.push(`${indent}    }`);
    if (!repo.allowGradleMetadata) addRunflareContentKotlin(lines, `${indent}    `);
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

function injectRepositories(source, block, language) {
  const body = source.slice(block.open + 1, block.end - 1);
  if (body.includes(MARKER)) return source;
  const indent = '    ';
  const snippet = language === 'kotlin' ? repoSnippetKotlin(indent) : repoSnippetGroovy(indent);
  const insertion = `\n    // ${MARKER}: local -> Myket -> filtered Runflare -> official repositories.\n${snippet}`;
  return source.slice(0, block.open + 1) + insertion + source.slice(block.open + 1);
}

function ensureRepositories(source, parentName, language) {
  const parent = findBlock(source, parentName);
  if (!parent) return source;
  const repositories = findBlock(source, 'repositories', parent.open + 1);
  if (repositories && repositories.start < parent.end) return injectRepositories(source, repositories, language);
  const snippet = language === 'kotlin' ? repoSnippetKotlin('    ') : repoSnippetGroovy('    ');
  const block = `\n  repositories {\n    // ${MARKER}: local -> Myket -> filtered Runflare -> official repositories.\n${snippet}    google()\n    mavenCentral()\n${parentName === 'pluginManagement' ? '    gradlePluginPortal()\n' : ''}  }\n`;
  return source.slice(0, parent.open + 1) + block + source.slice(parent.open + 1);
}

function ensureTopLevelRepositories(source, language) {
  if (source.includes(MARKER)) return source;
  const match = /^repositories\s*\{/m.exec(source);
  if (match) {
    const block = findBlock(source, 'repositories', match.index);
    if (block && block.start === match.index) return injectRepositories(source, block, language);
  }
  const snippet = language === 'kotlin' ? repoSnippetKotlin('  ') : repoSnippetGroovy('  ');
  const insertion = `// ${MARKER}: local -> Myket -> filtered Runflare -> official repositories.\nrepositories {\n${snippet}  google()\n  mavenCentral()\n}\n\n`;
  return insertion + source;
}

function ensureDependencyResolutionManagement(source, language) {
  const parent = findBlock(source, 'dependencyResolutionManagement');
  if (!parent) return source;
  const repositories = findBlock(source, 'repositories', parent.open + 1);
  if (repositories && repositories.start < parent.end) return injectRepositories(source, repositories, language);
  const snippet = language === 'kotlin' ? repoSnippetKotlin('    ') : repoSnippetGroovy('    ');
  const block = `\n  repositories {\n    // ${MARKER}: local -> Myket -> filtered Runflare -> official repositories.\n${snippet}    google()\n    mavenCentral()\n  }\n`;
  return source.slice(0, parent.open + 1) + block + source.slice(parent.open + 1);
}

function patchGradleFile(file) {
  let source = fs.readFileSync(file, 'utf8');
  if (source.includes(MARKER)) return false;
  const name = path.basename(file).toLowerCase();
  const language = name.endsWith('.kts') ? 'kotlin' : 'groovy';

  if (name.startsWith('settings.gradle')) {
    source = ensureRepositories(source, 'pluginManagement', language);
    source = ensureDependencyResolutionManagement(source, language);
  } else {
    source = ensureRepositories(source, 'buildscript', language);
    source = ensureRepositories(source, 'allprojects', language);
    source = ensureTopLevelRepositories(source, language);
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
    let contents = cfg.modResults.contents;
    const language = cfg.modResults.language === 'kotlin' ? 'kotlin' : 'groovy';
    contents = ensureRepositories(contents, 'pluginManagement', language);
    contents = ensureDependencyResolutionManagement(contents, language);
    cfg.modResults.contents = contents;
    return cfg;
  });

  config = withProjectBuildGradle(config, (cfg) => {
    const language = cfg.modResults.language === 'kotlin' ? 'kotlin' : 'groovy';
    let contents = cfg.modResults.contents;
    contents = ensureRepositories(contents, 'buildscript', language);
    contents = ensureRepositories(contents, 'allprojects', language);
    contents = ensureTopLevelRepositories(contents, language);
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
    console.log(`[withAndroidMavenMirrors] patched ${changed} generated Gradle file(s): local -> Myket -> filtered Runflare(POM/artifact) -> official.`);
    return cfg;
  }]);

  return config;
};
