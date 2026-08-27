#!/usr/bin/env node
'use strict';

/**
 * KhatYar Android build network policy.
 *
 * Dependency resolution order:
 *   1) existing node_modules / npm cache on the build machine
 *   2) Iranian npm mirrors
 *   3) external npm registry as the last fallback
 *
 * The selected registry is inherited by build-release.ps1, so its internal
 * npm-ci step follows the same policy instead of silently returning to npmjs.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const npmCache = process.env.NPM_CONFIG_CACHE || path.join(root, '.build-cache', 'npm');
fs.mkdirSync(npmCache, { recursive: true });

const iranMirrors = [
  process.env.KHATYAR_NPM_MIRROR_1 || 'https://repo-portal.ito.gov.ir/repo/npm/',
  process.env.KHATYAR_NPM_MIRROR_2 || 'https://runflare.com/mirrors/npm-mirror/'
].filter(Boolean);

const externalRegistry = process.env.KHATYAR_NPM_EXTERNAL || 'https://registry.npmjs.org/';
const timeout = process.env.KHATYAR_NPM_FETCH_TIMEOUT || '600000';
const retries = process.env.KHATYAR_NPM_FETCH_RETRIES || '4';
let selectedRegistry = process.env.NPM_CONFIG_REGISTRY || externalRegistry;

function canReadNodeModules() {
  return fs.existsSync(path.join(root, 'node_modules', 'expo')) &&
    fs.existsSync(path.join(root, 'node_modules', '.package-lock.json'));
}

function npmEnv(registry, offline) {
  return {
    ...process.env,
    NPM_CONFIG_CACHE: npmCache,
    NPM_CONFIG_FETCH_TIMEOUT: timeout,
    NPM_CONFIG_FETCH_RETRIES: retries,
    NPM_CONFIG_FETCH_RETRY_FACTOR: '2',
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT: '20000',
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT: '120000',
    NPM_CONFIG_AUDIT: 'false',
    NPM_CONFIG_FUND: 'false',
    NPM_CONFIG_REGISTRY: registry,
    ...(offline ? { NPM_CONFIG_OFFLINE: 'true' } : { NPM_CONFIG_OFFLINE: 'false' })
  };
}

function run(command, args, env, label) {
  console.log(`[network-policy] ${label}`);
  console.log(`[network-policy] registry=${env.NPM_CONFIG_REGISTRY} cache=${env.NPM_CONFIG_CACHE} offline=${env.NPM_CONFIG_OFFLINE}`);
  return spawnSync(command, args, { cwd: root, env, stdio: 'inherit', shell: false });
}

// If node_modules is already complete, keep the local installation and avoid
// selecting an external registry. build-release.ps1 will still use the local
// npm cache first via --prefer-offline.
if (canReadNodeModules()) {
  selectedRegistry = process.env.NPM_CONFIG_REGISTRY || iranMirrors[0];
  console.log('[network-policy] Existing node_modules detected; dependency bootstrap skipped.');
} else {
  // First attempt is strictly offline and therefore uses only the local npm cache.
  const offline = run('npm.cmd', ['ci', '--offline', '--no-audit', '--no-fund', '--legacy-peer-deps', '--include=dev'], npmEnv('https://registry.npmjs.org/', true), 'local npm cache / offline install');
  if (offline.status === 0) {
    selectedRegistry = process.env.NPM_CONFIG_REGISTRY || iranMirrors[0];
  } else {
    let installed = false;
    for (const mirror of iranMirrors) {
      const result = run('npm.cmd', ['ci', '--no-audit', '--no-fund', '--legacy-peer-deps', '--include=dev', '--prefer-offline'], npmEnv(mirror, false), `Iranian npm mirror: ${mirror}`);
      if (result.status === 0) {
        installed = true;
        selectedRegistry = mirror;
        break;
      }
    }
    if (!installed) {
      const result = run('npm.cmd', ['ci', '--no-audit', '--no-fund', '--legacy-peer-deps', '--include=dev', '--prefer-offline'], npmEnv(externalRegistry, false), `external npm fallback: ${externalRegistry}`);
      if (result.status !== 0) process.exit(result.status || 1);
      selectedRegistry = externalRegistry;
    }
  }
}

const ps1 = path.join(root, 'build-release.ps1');
const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1], {
  cwd: root,
  env: {
    ...process.env,
    NPM_CONFIG_CACHE: npmCache,
    NPM_CONFIG_REGISTRY: selectedRegistry,
    NPM_CONFIG_FETCH_TIMEOUT: timeout,
    NPM_CONFIG_FETCH_RETRIES: retries,
    NPM_CONFIG_FETCH_RETRY_FACTOR: '2',
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT: '20000',
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT: '120000',
    NPM_CONFIG_PREFER_OFFLINE: 'true',
    KHATYAR_BUILD_NETWORK_POLICY: 'local-cache -> Iranian mirrors -> external fallback',
    KHATYAR_BUILD_NPM_REGISTRY: selectedRegistry
  },
  stdio: 'inherit'
});
process.exit(result.status || 0);
