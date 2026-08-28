#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const android = path.join(root, 'android');
const wrapperProperties = path.join(android, 'gradle', 'wrapper', 'gradle-wrapper.properties');
const configureWrapper = path.join(__dirname, 'configure-gradle-wrapper.js');
const REQUIRED_GRADLE = '8.13';
const REQUIRED_RN = '0.86.0';
const REQUIRED_REACT = '19.2.3';
const MAVEN_MARKER = 'KHATYAR_ANDROID_MAVEN_MIRRORS';

function fail(message) {
  console.error(`[android-prebuild] ERROR: ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  console.log(`[android-prebuild] ${command} ${args.join(' ')}`);
  let executable = command;
  let finalArgs = args;
  if (process.platform === 'win32' && /\.cmd$/i.test(command)) {
    executable = 'cmd.exe';
    finalArgs = ['/d', '/c', command, ...args];
  }
  const result = spawnSync(executable, finalArgs, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: process.env,
    ...options,
  });
  if (result.error) fail(`${command} could not be started: ${result.error.message}`);
  if (result.status === null || result.status !== 0) fail(`${command} exited with code ${result.status ?? 1}.`);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`Unable to read JSON file ${file}: ${error.message}`);
  }
}

function readUtf8(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    fail(`${path.relative(root, file)} contains an UTF-8 BOM.`);
  }
  const text = buffer.toString('utf8');
  if (text.includes('\ufffd')) fail(`${path.relative(root, file)} contains invalid UTF-8 replacement characters.`);
  return text;
}

function assertContains(text, file, pattern, description) {
  if (!pattern.test(text)) fail(`${path.relative(root, file)} is missing ${description}.`);
}

function resolvePackageAndroidDir(packageName) {
  try {
    const pkg = require.resolve(`${packageName}/package.json`, { paths: [root] });
    return path.join(path.dirname(pkg), 'android');
  } catch (_) {
    return null;
  }
}

const packageJson = readJson(path.join(root, 'package.json'));
const expo = String(packageJson.dependencies?.expo || '');
const reactNative = String(packageJson.dependencies?.['react-native'] || '');
const react = String(packageJson.dependencies?.react || '');

if (!/^~?57\./.test(expo)) fail(`Expo dependency is ${expo}; expected Expo SDK 57.`);
if (reactNative !== REQUIRED_RN) fail(`React Native is ${reactNative}; expected ${REQUIRED_RN}.`);
if (react !== REQUIRED_REACT) fail(`React is ${react}; expected ${REQUIRED_REACT}.`);

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
if (!fs.existsSync(path.join(root, 'node_modules'))) fail('node_modules is missing. Install dependencies before the Android prebuild.');

run(npm, ['exec', '--', 'expo', 'prebuild', '--platform', 'android', '--clean']);

if (!fs.existsSync(android)) fail('Expo prebuild did not create the android directory.');
if (!fs.existsSync(wrapperProperties)) fail('Expo prebuild did not create gradle-wrapper.properties.');
run(process.execPath, [configureWrapper, wrapperProperties]);

const settingsFile = fs.existsSync(path.join(android, 'settings.gradle'))
  ? path.join(android, 'settings.gradle')
  : path.join(android, 'settings.gradle.kts');
const buildFile = path.join(android, 'build.gradle');
const appBuildFile = path.join(android, 'app', 'build.gradle');
const gradleProperties = path.join(android, 'gradle.properties');

for (const file of [settingsFile, buildFile, appBuildFile, gradleProperties, wrapperProperties]) {
  if (!fs.existsSync(file)) fail(`Required generated file is missing: ${path.relative(root, file)}`);
}

const settings = readUtf8(settingsFile);
const build = readUtf8(buildFile);
const appBuild = readUtf8(appBuildFile);
const properties = readUtf8(gradleProperties);
const wrapper = readUtf8(wrapperProperties);

if (settings.startsWith('?')) fail(`${path.relative(root, settingsFile)} starts with an unexpected '?' character.`);
assertContains(settings, settingsFile, /id\(["']com\.facebook\.react\.settings["']\)/, 'React Native settings plugin');
assertContains(settings, settingsFile, /id\(["']expo-autolinking-settings["']\)/, 'Expo autolinking settings plugin');
assertContains(settings, settingsFile, /expoAutolinking\.useExpoModules\(\)/, 'Expo module autolinking');
assertContains(settings, settingsFile, /expoAutolinking\.useExpoVersionCatalog\(\)/, 'Expo version catalog');
assertContains(settings, settingsFile, /includeBuild\(expoAutolinking\.reactNativeGradlePlugin\)/, 'React Native Gradle plugin include');

assertContains(build, buildFile, /com\.android\.tools\.build:gradle/, 'Android Gradle Plugin classpath');
assertContains(build, buildFile, /com\.facebook\.react:react-native-gradle-plugin/, 'React Native Gradle Plugin classpath');
assertContains(build, buildFile, /org\.jetbrains\.kotlin:kotlin-gradle-plugin/, 'Kotlin Gradle Plugin classpath');

if (/com\.android\.tools\.build:gradle:\s*['"]?\s*['"]/.test(build)) fail('Android Gradle Plugin dependency has an empty version literal.');
if (/react-native-gradle-plugin:\s*['"]?\s*['"]/.test(build)) fail('React Native Gradle Plugin dependency has an empty version literal.');
if (/kotlin-gradle-plugin:\s*['"]?\s*['"]/.test(build)) fail('Kotlin Gradle Plugin dependency has an empty version literal.');

// Verify the generic Iranian mirror plugin patched the real generated Expo
// included build, not just the main Android project.
const expoAndroid = resolvePackageAndroidDir('expo-modules-autolinking');
const expoIncludedBuild = expoAndroid && path.join(expoAndroid, 'expo-gradle-plugin');
const expoIncludedFiles = [];
if (expoIncludedBuild && fs.existsSync(expoIncludedBuild)) {
  const stack = [expoIncludedBuild];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!['.gradle', 'build'].includes(entry.name)) stack.push(full);
      } else if (/^(settings|build)\.gradle(?:\.kts)?$/i.test(entry.name)) {
        expoIncludedFiles.push(full);
      }
    }
  }
}
const mirrorPatchedFiles = expoIncludedFiles
  .filter((file) => fs.readFileSync(file, 'utf8').includes(MAVEN_MARKER));
if (mirrorPatchedFiles.length === 0) {
  fail('The real expo-modules-autolinking included build was not patched with the local/Myket/Runflare Maven mirror policy.');
}

console.log(`[android-prebuild] Maven mirror validation: ${mirrorPatchedFiles.length} generated Expo included-build file(s) patched.`);
console.log('[android-prebuild] Generated Android project passed structural compatibility checks.');
console.log(`[android-prebuild] Expo SDK: ${expo}`);
console.log(`[android-prebuild] React Native: ${reactNative}`);
console.log(`[android-prebuild] React: ${react}`);
console.log(`[android-prebuild] Gradle wrapper: ${REQUIRED_GRADLE}`);
console.log('[android-prebuild] Standard Android release build: no Myket store/signing integration.');
console.log('[android-prebuild] Maven policy: local -> Myket -> Runflare -> official.');
console.log('[android-prebuild] Gradle wrapper policy: local F:\\gradle-cache -> Myket -> Runflare -> official.');
console.log('[android-prebuild] Expected Android toolchain: AGP 8.12.x / Gradle 8.13 / JDK 17 / compileSdk 36 / NDK 27.1.12297006.');
