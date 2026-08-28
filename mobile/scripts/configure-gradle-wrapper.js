#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { pathToFileURL } = require('url');

const MIN_VALID_ZIP_SIZE = 1024 * 1024;
const REQUIRED_GRADLE_VERSION = '8.13';
const DISTRIBUTION_FILE = `gradle-${REQUIRED_GRADLE_VERSION}-bin.zip`;

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

function download(url, destination, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects.'));
    const request = https.get(url, { timeout: 120000, headers: { 'User-Agent': 'KhatYar-Gradle-Wrapper' } }, (response) => {
      const status = response.statusCode || 0;
      if (status >= 300 && status < 400 && response.headers.location) {
        response.resume();
        return download(new URL(response.headers.location, url).toString(), destination, redirects + 1)
          .then(resolve, reject);
      }
      if (status !== 200) {
        response.resume();
        return reject(new Error(`HTTP ${status}`));
      }
      const temp = `${destination}.download-${process.pid}`;
      const out = fs.createWriteStream(temp);
      response.pipe(out);
      out.on('finish', () => out.close(() => {
        try {
          if (!isUsableZip(temp)) throw new Error('Downloaded file is not a valid Gradle ZIP.');
          fs.renameSync(temp, destination);
          resolve();
        } catch (error) {
          try { fs.unlinkSync(temp); } catch (_) {}
          reject(error);
        }
      }));
      out.on('error', (error) => {
        try { fs.unlinkSync(temp); } catch (_) {}
        reject(error);
      });
    });
    request.on('timeout', () => request.destroy(new Error('Download timeout.')));
    request.on('error', reject);
  });
}

async function ensureLocalDistribution(localFile) {
  if (isUsableZip(localFile)) return 'local';
  fs.mkdirSync(path.dirname(localFile), { recursive: true });

  const sources = [
    ['myket', `https://maven.myket.ir/gradle/distributions/${DISTRIBUTION_FILE}`],
    ['runflare', `https://mirror-maven.runflare.com/distributions/${DISTRIBUTION_FILE}`],
    ['official', `https://services.gradle.org/distributions/${DISTRIBUTION_FILE}`],
  ];

  const failures = [];
  for (const [name, url] of sources) {
    const temp = `${localFile}.candidate`;
    try {
      console.log(`[gradle-wrapper] downloading ${DISTRIBUTION_FILE} from ${name}: ${url}`);
      await download(url, temp);
      if (isUsableZip(temp)) {
        fs.renameSync(temp, localFile);
        console.log(`[gradle-wrapper] cached distribution from ${name}: ${localFile}`);
        return name;
      }
    } catch (error) {
      failures.push(`${name}: ${error.message}`);
      try { fs.unlinkSync(temp); } catch (_) {}
      console.warn(`[gradle-wrapper] ${name} failed: ${error.message}`);
    }
  }
  throw new Error(`Unable to obtain ${DISTRIBUTION_FILE}. ${failures.join(' | ')}`);
}

const propertiesPath = process.argv[2];
const cacheDirectory = process.argv[3] || process.env.KHATYAR_GRADLE_CACHE || 'F:\\gradle-cache';
if (!propertiesPath) fail('Path to gradle-wrapper.properties is required.');
if (!fs.existsSync(propertiesPath)) fail(`File not found: ${propertiesPath}`);

let contents = fs.readFileSync(propertiesPath, 'utf8');
const originalUrlMatch = contents.match(/^distributionUrl=([^\r\n]+)$/m);
if (!originalUrlMatch) fail(`distributionUrl was not found in ${propertiesPath}`);

const localFile = path.resolve(path.join(cacheDirectory, DISTRIBUTION_FILE));

ensureLocalDistribution(localFile).then((source) => {
  let distributionUrl = pathToFileURL(localFile).href.replace(/:/g, '\\:');
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
  console.log(`[gradle-wrapper] version-file=${DISTRIBUTION_FILE}`);
  console.log(`[gradle-wrapper] cache=${localFile}`);
  console.log(`[gradle-wrapper] source=${source}`);
  console.log(`[gradle-wrapper] properties=${propertiesPath}`);
}).catch((error) => fail(error.message));
