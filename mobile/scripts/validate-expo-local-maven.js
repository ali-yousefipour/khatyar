#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const packageJson = require(path.join(root, 'package.json'));
const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
const expoPackages = Object.keys(deps).filter((name) => name === 'expo' || name.startsWith('expo-') || name.startsWith('@expo/'));

const missingPackages = [];
const missingArtifacts = [];
let repositoryCount = 0;
let aarCount = 0;

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.aar')) aarCount += 1;
  }
}

for (const name of expoPackages) {
  let pkgPath;
  try {
    pkgPath = require.resolve(`${name}/package.json`, { paths: [root] });
  } catch {
    missingPackages.push(name);
    continue;
  }
  const repo = path.join(path.dirname(pkgPath), 'local-maven-repo');
  if (fs.existsSync(repo)) {
    repositoryCount += 1;
    const before = aarCount;
    walk(repo);
    if (aarCount === before) missingArtifacts.push(name);
  }
}

if (missingPackages.length) {
  console.error(`Missing installed Expo packages: ${missingPackages.join(', ')}`);
  process.exit(1);
}
if (missingArtifacts.length) {
  console.error(`Expo local Maven repositories contain no AAR: ${missingArtifacts.join(', ')}`);
  process.exit(1);
}
if (repositoryCount === 0 || aarCount === 0) {
  console.error('No Expo SDK 57 local Maven repositories/AAR artifacts were detected. Delete node_modules and run npm ci again.');
  process.exit(1);
}
console.log(`Expo local Maven validation OK: repositories=${repositoryCount}, aarFiles=${aarCount}`);
