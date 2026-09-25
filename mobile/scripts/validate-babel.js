'use strict';

const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '..');

function fail(message, error) {
  console.error(`[babel-check] ${message}`);
  if (error) {
    console.error(error && error.stack ? error.stack : String(error));
  }
  process.exit(1);
}

try {
  const required = [
    '@babel/core',
    'babel-preset-expo',
    'react-native-worklets',
  ];

  for (const name of required) {
    const resolved = require.resolve(name, { paths: [process.cwd()] });
    console.log(`[babel-check] ${name} -> ${resolved}`);
  }

  const babel = require('@babel/core');
  const filename = path.join(process.cwd(), 'App.js');
  const partial = babel.loadPartialConfig({ filename });
  if (!partial) {
    fail('Babel configuration could not be loaded.');
  }

  const result = babel.transformSync(
    "const sample = () => 'ok'; export default sample;",
    {
      filename,
      babelrc: false,
      configFile: path.join(process.cwd(), 'babel.config.js'),
      sourceMaps: false,
    }
  );

  if (!result || !result.code) {
    fail('Babel transform returned no output.');
  }

  // Validate the actual application sources, not only a synthetic snippet.
  // This catches JSX/JavaScript syntax errors before Gradle reaches BundleHermesCTask.
  const sourceRoot = path.join(root, 'src');
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', 'android', 'ios', '.expo'].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\\.(js|jsx)$/.test(entry.name)) files.push(full);
    }
  }
  walk(sourceRoot);
  files.push(path.join(root, 'App.js'));
  let checked = 0;
  for (const file of files) {
    try {
      const out = babel.transformSync(fs.readFileSync(file, 'utf8'), {
        filename: file,
        babelrc: false,
        configFile: path.join(process.cwd(), 'babel.config.js'),
        sourceMaps: false,
      });
      if (!out || !out.code) fail(`Babel returned no output for ${path.relative(root, file)}.`);
      checked++;
    } catch (error) {
      fail(`Actual source validation failed: ${path.relative(root, file)}`, error);
    }
  }

  if (!result || !result.code) {
    fail('Babel transform returned no output.');
  }

  console.log(`[babel-check] Babel/Expo transformer is ready. Validated ${checked} application source files.`);
} catch (error) {
  fail('Babel dependency/configuration validation failed.', error);
}
