#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const MIN_VALID_ZIP_SIZE = 1024 * 1024;

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
const originalUrl = originalUrlMatch[1];

// نکتهٔ کلیدی: نسخهٔ Gradle را هرگز هارد-کد نمی‌کنیم. خودِ expo prebuild
// (بر اساس نسخهٔ AGP نصب‌شده برای این پروژه) نسخهٔ درست را در همین فایل
// نوشته؛ ما فقط می‌خوانیمش. هارد-کد کردن یک نسخهٔ ثابت (مثلاً برای AGP
// قدیمی‌تر) دقیقاً همان چیزی بود که باعث خطای کامپایل پلاگین‌های داخلی
// Expo می‌شد چون گریدل خیلی قدیمی‌تر از چیزی بود که AGP فعلی نیاز دارد.
const versionMatch = originalUrl.match(/gradle-([0-9]+(?:\.[0-9]+){1,2})-(bin|all)\.zip/);
if (!versionMatch) {
  fail(`Could not parse a Gradle version out of the distributionUrl expo generated: ${originalUrl}`);
}
const REQUIRED_GRADLE_VERSION = versionMatch[1];
const REQUIRED_DISTRIBUTION_FILE = `gradle-${REQUIRED_GRADLE_VERSION}-bin.zip`;
const MYKET_DISTRIBUTION_URL = `https://maven.myket.ir/gradle/distributions/${REQUIRED_DISTRIBUTION_FILE}`;

const localFile = path.resolve(path.join(cacheDirectory, REQUIRED_DISTRIBUTION_FILE));
let distributionUrl;
let source;

if (isUsableZip(localFile)) {
  distributionUrl = pathToFileURL(localFile).href;
  source = `local:${localFile}`;
} else {
  // اگر نسخهٔ درست روی میرور Myket موجود نبود (مثلاً چون نسخهٔ خیلی جدیدی
  // است و هنوز mirror نشده)، به آدرس رسمی اصلی که خودِ Expo نوشته برمی‌گردیم
  // — امن‌تر از این‌که نسخهٔ اشتباه را force کنیم.
  distributionUrl = originalUrl;
  source = `official-fallback:${originalUrl}`;
  if (fs.existsSync(localFile)) {
    console.warn(`[gradle-wrapper] Local file is invalid or incomplete and will be ignored: ${localFile}`);
  }
  console.warn(`[gradle-wrapper] No local cache for ${REQUIRED_DISTRIBUTION_FILE}; consider downloading it to ${cacheDirectory}`);
  console.warn(`[gradle-wrapper] Myket mirror candidate (unverified): ${MYKET_DISTRIBUTION_URL}`);
}

// gradle-wrapper.properties یک فایل Java Properties است: کاراکتر ':' در مقدار
// باید به‌صورت '\:' اسکیپ شود، وگرنه Gradle ممکن است URL را غلط پارس کند.
// originalUrl از قبل (توسط خودِ Gradle/Expo) درست اسکیپ شده و دست‌نخورده می‌ماند؛
// فقط وقتی خودمان URL جدید می‌سازیم (لوکال/میرور) این اسکیپ را اعمال می‌کنیم.
if (source !== `official-fallback:${originalUrl}`) {
  distributionUrl = distributionUrl.replace(/:/g, '\\:');
}

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
console.log(`[gradle-wrapper] version-file=${REQUIRED_DISTRIBUTION_FILE}`);
console.log(`[gradle-wrapper] local-candidate=${localFile}`);
console.log(`[gradle-wrapper] source=${source}`);
console.log(`[gradle-wrapper] properties=${propertiesPath}`);

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
console.log(`[gradle-wrapper] version-file=${REQUIRED_DISTRIBUTION_FILE}`);
console.log(`[gradle-wrapper] local-candidate=${localFile}`);
console.log(`[gradle-wrapper] source=${source}`);
console.log(`[gradle-wrapper] properties=${propertiesPath}`);
