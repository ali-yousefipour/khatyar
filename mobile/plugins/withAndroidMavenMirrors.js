const { withProjectBuildGradle, withDangerousMod } = require('@expo/config-plugins');

const MARKER = 'KHATYAR_ANDROID_MAVEN_MIRRORS';
const REPOS = [
  { name: 'MyketMaven', url: 'https://maven.myket.ir/', allowGradleMetadata: true },
  { name: 'RunflareGoogle', url: 'https://mirror-maven.runflare.com/android/maven2/', allowGradleMetadata: false },
  { name: 'RunflareMaven', url: 'https://mirror-maven.runflare.com/maven2/', allowGradleMetadata: false },
  { name: 'RunflareGradlePlugins', url: 'https://mirror-maven.runflare.com/gradle-plugins/', allowGradleMetadata: false },
];

function addRunflareContentGroovy(lines, indent) {
  lines.push(`${indent}content {`);
  lines.push(`${indent}    excludeGroupByRegex('expo\\\\.modules(\\\\..*)?')`);
  lines.push(`${indent}    excludeGroup('host.exp.exponent')`);
  lines.push(`${indent}    excludeGroupByRegex('com\\\\.facebook\\\\.react(\\\\..*)?')`);
  lines.push(`${indent}    excludeGroupByRegex('com\\\\.facebook\\\\.fbjni(\\\\..*)?')`);
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

function ensureProjectRepositories(source, parentName, language) {
  const parent = findBlock(source, parentName);
  if (!parent) return source;
  const repositories = findBlock(source, 'repositories', parent.open + 1);
  if (repositories && repositories.start < parent.end) return injectRepositories(source, repositories, language);
  return source;
}

function ensureTopLevelRepositories(source, language) {
  const match = /^repositories\s*\{/m.exec(source);
  if (match) {
    const block = findBlock(source, 'repositories', match.index);
    if (block && block.start === match.index) return injectRepositories(source, block, language);
  }
  const snippet = language === 'kotlin' ? repoSnippetKotlin('  ') : repoSnippetGroovy('  ');
  return `// ${MARKER}: local -> Myket -> filtered Runflare -> official repositories.\nrepositories {\n${snippet}  google()\n  mavenCentral()\n}\n\n${source}`;
}

function patchExpoAutolinkingIncludedBuild(projectRoot) {
  const packageJson = require.resolve('expo-modules-autolinking/package.json', { paths: [projectRoot] });
  const packageRoot = require('path').dirname(packageJson);
  const includedRoot = require('path').join(packageRoot, 'expo-gradle-plugin');
  const fs = require('fs');
  const path = require('path');
  if (!fs.existsSync(includedRoot)) {
    throw new Error('expo-modules-autolinking/expo-gradle-plugin was not found after Expo prebuild.');
  }

  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!['.gradle', 'build'].includes(entry.name)) walk(full);
      } else if (/^(settings|build)\.gradle(?:\.kts)?$/i.test(entry.name)) {
        files.push(full);
      }
    }
  };
  walk(includedRoot);

  let patched = 0;
  for (const file of files) {
    const language = file.endsWith('.kts') ? 'kotlin' : 'groovy';
    const source = fs.readFileSync(file, 'utf8');
    if (source.includes(MARKER)) { patched += 1; continue; }

    let next = source;
    const settingsBlock = findBlock(next, 'pluginManagement');
    if (settingsBlock) {
      const repos = findBlock(next, 'repositories', settingsBlock.open + 1);
      if (repos && repos.start < settingsBlock.end) {
        next = injectRepositories(next, repos, language);
      }
    }
    const dependencyBlock = findBlock(next, 'dependencyResolutionManagement');
    if (dependencyBlock) {
      const repos = findBlock(next, 'repositories', dependencyBlock.open + 1);
      if (repos && repos.start < dependencyBlock.end) {
        next = injectRepositories(next, repos, language);
      }
    }
    next = ensureTopLevelRepositories(next, language);
    if (next !== source) {
      fs.writeFileSync(file, next, 'utf8');
      patched += 1;
    }
  }

  if (patched === 0) {
    throw new Error('Could not patch the generated expo-modules-autolinking included build with the KhatYar Maven mirror policy.');
  }
  console.log(`[withAndroidMavenMirrors] patched ${patched} real expo-modules-autolinking included-build file(s).`);
}

module.exports = function withAndroidMavenMirrors(config) {
  config = withProjectBuildGradle(config, (cfg) => {
    const language = cfg.modResults.language === 'kotlin' ? 'kotlin' : 'groovy';
    let contents = cfg.modResults.contents;
    contents = ensureProjectRepositories(contents, 'buildscript', language);
    contents = ensureProjectRepositories(contents, 'allprojects', language);
    contents = ensureTopLevelRepositories(contents, language);
    cfg.modResults.contents = contents;
    return cfg;
  });

  config = withDangerousMod(config, ['android', async (cfg) => {
    patchExpoAutolinkingIncludedBuild(cfg.modRequest.projectRoot);
    return cfg;
  }]);

  console.log('[withAndroidMavenMirrors] main Android project mirror policy applied; real Expo included-build mirror policy applied.');
  return config;
};
