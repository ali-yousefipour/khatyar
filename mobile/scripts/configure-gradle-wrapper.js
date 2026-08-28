#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const MIN_VALID_ZIP_SIZE = 1024 * 1024;
// React Native 0.86 uses AGP 8.12.0. Android's compatibility matrix for
// AGP 8.12 requires Gradle 8.13 and JDK 17. Keep this version centralized so
// every clean Expo prebuild receives the same wrapper.
const REQUIRED_GRADLE_VERSION = '8.13';

function fail(message) {
  console.error(`[gradle-wrapper] ${message}`);
  process.exit(1);
}

function isUsableZip(filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;
  const stat = fs.statSync(filePath);
  if (stat.size < MIN_VALID_ZIP_SIZE) return false;
  const fd = fs.openSync(filePath, 'r');
  try {
    const signature = Buffer.alloc(4);
    fs.readSync(fd, signature, 0, 4, 0);
    return signature[0] === 0x50 && signature[1] === 0x4b;
  } finally {
    fs.closeSync(fd);
  }
}

const propertiesPath = process.argv[2];
const cacheDirectory = process.argv[3] || process.env.KHATYAR_GRADLE_CACHE || 'F:\\gradle-cache';
if (!propertiesPath) fail('Path to gradle-wrapper.properties is required.');
if (!fs.existsSync(propertiesPath)) fail(`File not found: ${propertiesPath}`);

let contents = fs.readFileSync(propertiesPath, 'utf8');
const originalUrlMatch = contents.match(/^distributionUrl=([^\r\n]+)$/m);
if (!originalUrlMatch) fail(`distributionUrl was not found in ${propertiesPath}`);

const distributionFile = `gradle-${REQUIRED_GRADLE_VERSION}-bin.zip`;
const myketDistributionUrl = `https://maven.myket.ir/gradle/distributions/${distributionFile}`;
const runflareDistributionUrl = `https://repo.runflare.com/gradle/distributions/${distributionFile}`;
const localFile = path.resolve(path.join(cacheDirectory, distributionFile));

let distributionUrl;
let source;
if (isUsableZip(localFile)) {
  distributionUrl = pathToFileURL(localFile).href;
  source = `local:${localFile}`;
} else {
  distributionUrl = myketDistributionUrl;
  source = `myket:${myketDistributionUrl}`;
  console.warn(`[gradle-wrapper] No valid local Gradle ZIP: ${localFile}`);
  console.warn(`[gradle-wrapper] Primary remote source: ${myketDistributionUrl}`);
  console.warn(`[gradle-wrapper] Secondary manual fallback: ${runflareDistributionUrl}`);
}

distributionUrl = distributionUrl.replace(/:/g, '\\:');
contents = contents.replace(/^distributionUrl=[^\r\n]+$/m, `distributionUrl=${distributionUrl}`);
contents = /^distributionBase=/m.test(contents)
  ? contents.replace(/^distributionBase=.*$/m, 'distributionBase=GRADLE_USER_HOME')
  : `distributionBase=GRADLE_USER_HOME\r\n${contents}`;
contents = /^distributionPath=/m.test(contents)
  ? contents.replace(/^distributionPath=.*$/m, 'distributionPath=wrapper/dists')
  : `distributionPath=wrapper/dists\r\n${contents}`;
contents = /^zipStoreBase=/m.test(contents)
  ? contents.replace(/^zipStoreBase=.*$/m, 'zipStoreBase=GRADLE_USER_HOME')
  : `${contents.replace(/[\r\n]+$/, '')}\r\nzipStoreBase=GRADLE_USER_HOME\r\n`;
contents = /^zipStorePath=/m.test(contents)
  ? contents.replace(/^zipStorePath=.*$/m, 'zipStorePath=wrapper/dists')
  : `${contents.replace(/[\r\n]+$/, '')}\r\nzipStorePath=wrapper/dists\r\n`;
contents = /^networkTimeout=/m.test(contents)
  ? contents.replace(/^networkTimeout=\d+$/m, 'networkTimeout=600000')
  : `${contents.replace(/[\r\n]+$/, '')}\r\nnetworkTimeout=600000\r\n`;
contents = /^validateDistributionUrl=/m.test(contents)
  ? contents.replace(/^validateDistributionUrl=.*$/m, 'validateDistributionUrl=true')
  : `${contents.replace(/[\r\n]+$/, '')}\r\nvalidateDistributionUrl=true\r\n`;

fs.writeFileSync(propertiesPath, contents, 'utf8');
console.log(`[gradle-wrapper] required-version=${REQUIRED_GRADLE_VERSION}`);
console.log(`[gradle-wrapper] version-file=${distributionFile}`);
console.log(`[gradle-wrapper] local-candidate=${localFile}`);
console.log(`[gradle-wrapper] source=${source}`);
console.log(`[gradle-wrapper] properties=${propertiesPath}`);
