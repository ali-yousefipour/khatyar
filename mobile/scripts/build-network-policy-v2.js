#!/usr/bin/env node
'use strict';

// KhatYar dependency/build policy:
// 1) local npm cache (offline)
// 2) Runflare npm mirror
// 3) Pardisco npm mirror
// 4) npmmirror
// 5) npmjs.org
// Myket is Maven-only and is configured by myket.init.gradle.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cache = process.env.NPM_CONFIG_CACHE || path.join(process.env.LOCALAPPDATA || root, 'npm-cache');
fs.mkdirSync(cache, { recursive: true });
const registries = [
  process.env.KHATYAR_NPM_MIRROR_1 || 'https://mirror-npm.runflare.com/',
  process.env.KHATYAR_NPM_MIRROR_2 || 'https://mirrors.pardisco.co/npm/',
  process.env.KHATYAR_NPM_MIRROR_3 || 'https://registry.npmmirror.com/',
  process.env.KHATYAR_NPM_EXTERNAL || 'https://registry.npmjs.org/'
];
const common = ['--no-audit','--no-fund','--legacy-peer-deps','--include=dev'];
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(args, registry, offline, label) {
  console.log(`\n=== ${label} ===`);
  console.log(`registry=${registry}`);
  console.log(`cache=${cache}`);
  const env = {
    ...process.env,
    NPM_CONFIG_CACHE: cache,
    NPM_CONFIG_REGISTRY: registry,
    NPM_CONFIG_OFFLINE: offline ? 'true' : 'false',
    NPM_CONFIG_PREFER_OFFLINE: 'true',
    NPM_CONFIG_FETCH_TIMEOUT: process.env.KHATYAR_NPM_FETCH_TIMEOUT || '600000',
    NPM_CONFIG_FETCH_RETRIES: process.env.KHATYAR_NPM_FETCH_RETRIES || '2',
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT: '5000',
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT: '30000',
    NPM_CONFIG_AUDIT: 'false',
    NPM_CONFIG_FUND: 'false'
  };
  const r = spawnSync(npm, args, { cwd: root, env, stdio: 'inherit', shell: false });
  return r.status === 0;
}

const ci = ['ci', ...common];
let ok = run([...ci, '--offline'], registries[0], true, '1/5 local npm cache');
if (!ok) {
  for (let i = 0; i < registries.length; i++) {
    ok = run([...ci, '--prefer-offline', '--registry', registries[i]], registries[i], false, `${i < 3 ? i + 2 : 5}/5 registry fallback`);
    if (ok) break;
  }
}
if (!ok) process.exit(1);

// The cache is now complete. Force the actual PowerShell build to use only
// the populated cache, preventing a later registry 404 from breaking the build.
const ps1 = path.join(root, 'build-release.ps1');
const r = spawnSync('powershell.exe', ['-NoProfile','-ExecutionPolicy','Bypass','-File',ps1], {
  cwd: root,
  env: {
    ...process.env,
    NPM_CONFIG_CACHE: cache,
    NPM_CONFIG_OFFLINE: 'true',
    NPM_CONFIG_PREFER_OFFLINE: 'true',
    NPM_CONFIG_AUDIT: 'false',
    NPM_CONFIG_FUND: 'false',
    KHATYAR_BUILD_NETWORK_POLICY: 'local-cache -> Runflare -> Pardisco -> npmmirror -> npmjs -> offline'
  },
  stdio: 'inherit'
});

if (r.status !== 0) process.exit(r.status === null ? 1 : r.status);

// Release APK naming: khatyar-<software-version>.apk
// The version is read from the resolved Expo app config so environment-based
// ANDROID_VERSION_NAME overrides are respected exactly as they are in the build.
try {
  const appConfigFactory = require(path.join(root, 'app.config.js'));
  const resolvedConfig = typeof appConfigFactory === 'function'
    ? appConfigFactory({ config: {} })
    : appConfigFactory;
  const version = String(resolvedConfig?.version || process.env.ANDROID_VERSION_NAME || '').trim();
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`Invalid Android software version: ${version || '(empty)'}`);
  }

  const apkDir = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release');
  const source = path.join(apkDir, 'app-release.apk');
  const target = path.join(apkDir, `khatyar-${version}.apk`);
  if (!fs.existsSync(source)) throw new Error(`Release APK was not found: ${source}`);
  if (path.resolve(source) !== path.resolve(target)) {
    if (fs.existsSync(target)) fs.rmSync(target, { force: true });
    fs.renameSync(source, target);
  }
  console.log(`\n[khatyar-release] APK: ${target}`);
} catch (error) {
  console.error(`\n[khatyar-release] APK rename failed: ${error.message}`);
  process.exit(1);
}
