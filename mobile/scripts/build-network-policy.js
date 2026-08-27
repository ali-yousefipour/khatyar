#!/usr/bin/env node
'use strict';

/**
 * KhatYar Android build network policy.
 *
 * Dependency resolution order:
 *   1) existing node_modules / npm cache on the build machine
 *   2) Iranian npm mirrors (configurable and health-checked)
 *   3) external npm registry as the last fallback
 *
 * The script is a wrapper around build-release.ps1 so the environment prepared
 * here is inherited by npm, Expo and all child processes.
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

// If node_modules is already complete, do not touch the network at all.
if (canReadNodeModules()) {
  console.log('[network-policy] Existing node_modules detected; no dependency download will be attempted.');
} else {
  // First attempt is strictly offline and therefore uses only the local npm cache.
  const offline = run('npm.cmd', ['ci', '--offline', '--no-audit', '--no-fund', '--legacy-peer-deps', '--include=dev'], npmEnv('https://registry.npmjs.org/', true), 'local npm cache / offline install');
  if (offline.status !== 0) {
    let installed = false;
    for (const mirror of iranMirrors) {
      const result = run('npm.cmd', ['ci', '--no-audit', '--no-fund', '--legacy-peer-deps', '--include=dev', '--prefer-offline'], npmEnv(mirror, false), `Iranian npm mirror: ${mirror}`);
      if (result.status === 0) {
        installed = true;
        break;
      }
    }
    if (!installed) {
      const result = run('npm.cmd', ['ci', '--no-audit', '--no-fund', '--legacy-peer-deps', '--include=dev', '--prefer-offline'], npmEnv(externalRegistry, false), `external npm fallback: ${externalRegistry}`);
      if (result.status !== 0) process.exit(result.status || 1);
    }
  }
}

const ps1 = path.join(root, 'build-release.ps1');
const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1], {
  cwd: root,
  env: {
    ...process.env,
    NPM_CONFIG_CACHE: npmCache,
    NPM_CONFIG_FETCH_TIMEOUT: timeout,
    NPM_CONFIG_FETCH_RETRIES: retries,
    NPM_CONFIG_FETCH_RETRY_FACTOR: '2',
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT: '20000',
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT: '120000',
    NPM_CONFIG_PREFER_OFFLINE: 'true',
    KHATYAR_BUILD_NETWORK_POLICY: 'local-cache -> Iranian mirrors -> external fallback'
  },
  stdio: 'inherit'
});
process.exit(result.status || 0);
