#!/usr/bin/env node
'use strict';

/**
 * KhatYar Android build network policy.
 *
 * Dependency resolution order:
 *   1) local npm cache / existing local dependency state
 *   2) Iranian npm mirrors
 *   3) international npm registry as the final fallback
 *
 * npm itself has one active registry per process, so the fallback chain is
 * implemented by separate npm-ci attempts. A successful attempt selects the
 * registry that build-release.ps1 inherits for its deterministic npm-ci step.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const defaultCache = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, 'npm-cache')
  : path.join(root, '.build-cache', 'npm');
const npmCache = process.env.NPM_CONFIG_CACHE || defaultCache;
fs.mkdirSync(npmCache, { recursive: true });

// Runflare is intentionally not part of the KhatYar fallback chain.
// Mirror URLs can be overridden without changing source code.
const iranMirrors = [
  process.env.KHATYAR_NPM_MIRROR_1 || 'https://repo-portal.ito.gov.ir/repo/npm/',
  process.env.KHATYAR_NPM_MIRROR_2 || 'https://mirror2.chabokan.net/npm/',
  process.env.KHATYAR_NPM_MIRROR_3 || 'https://mirrors.pardisco.co/npm/'
].filter(Boolean);

const externalRegistry = process.env.KHATYAR_NPM_EXTERNAL || 'https://registry.npmjs.org/';
const timeout = process.env.KHATYAR_NPM_FETCH_TIMEOUT || '600000';
const retries = process.env.KHATYAR_NPM_FETCH_RETRIES || '3';

function npmEnv(registry, offline) {
  return {
    ...process.env,
    NPM_CONFIG_CACHE: npmCache,
    NPM_CONFIG_FETCH_TIMEOUT: timeout,
    NPM_CONFIG_FETCH_RETRIES: retries,
    NPM_CONFIG_FETCH_RETRY_FACTOR: '2',
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT: '10000',
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT: '60000',
    NPM_CONFIG_AUDIT: 'false',
    NPM_CONFIG_FUND: 'false',
    NPM_CONFIG_PREFER_OFFLINE: 'true',
    NPM_CONFIG_REGISTRY: registry,
    NPM_CONFIG_OFFLINE: offline ? 'true' : 'false'
  };
}

function run(args, env, label) {
  console.log(`[network-policy] ${label}`);
  console.log(`[network-policy] registry=${env.NPM_CONFIG_REGISTRY} cache=${env.NPM_CONFIG_CACHE} offline=${env.NPM_CONFIG_OFFLINE}`);
  const result = spawnSync('npm.cmd', args, { cwd: root, env, stdio: 'inherit', shell: false });
  return result.status === null ? 1 : result.status;
}

const installArgs = ['ci', '--no-audit', '--no-fund', '--legacy-peer-deps', '--include=dev'];
let selectedRegistry = iranMirrors[0] || externalRegistry;
let installed = false;

// Strict local-cache attempt. npm --offline guarantees no network access.
if (run([...installArgs, '--offline'], npmEnv(selectedRegistry, true), '1/3 local npm cache (offline)') === 0) {
  installed = true;
}

// Iranian mirrors are attempted only if the local cache is insufficient.
if (!installed) {
  for (const mirror of iranMirrors) {
    const status = run([...installArgs, '--prefer-offline'], npmEnv(mirror, false), `2/3 Iranian npm mirror: ${mirror}`);
    if (status === 0) {
      installed = true;
      selectedRegistry = mirror;
      break;
    }
  }
}

// International registry is strictly last.
if (!installed) {
  const status = run([...installArgs, '--prefer-offline'], npmEnv(externalRegistry, false), `3/3 international fallback: ${externalRegistry}`);
  if (status !== 0) process.exit(status || 1);
  selectedRegistry = externalRegistry;
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
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT: '10000',
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT: '60000',
    NPM_CONFIG_PREFER_OFFLINE: 'true',
    NPM_CONFIG_AUDIT: 'false',
    NPM_CONFIG_FUND: 'false',
    KHATYAR_BUILD_NETWORK_POLICY: 'local-cache -> Iranian mirrors -> international fallback',
    KHATYAR_BUILD_NPM_REGISTRY: selectedRegistry
  },
  stdio: 'inherit'
});
process.exit(result.status || 0);
