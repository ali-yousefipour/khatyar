'use strict';

const path = require('path');

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

  console.log('[babel-check] Babel/Expo transformer is ready.');
} catch (error) {
  fail('Babel dependency/configuration validation failed.', error);
}
