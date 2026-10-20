'use strict';

// Validate all first-party sources before Gradle; Metro stops at the first error.
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '..');
const extensions = /\.(?:js|jsx|ts|tsx|cjs|mjs)$/i;
const ignored = new Set(['node_modules', 'android', '.expo', 'build', 'dist', '.git']);
const files = [];
function visit(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(item.name)) continue;
    const absolute = path.join(dir, item.name);
    if (item.isDirectory()) visit(absolute);
    else if (item.isFile() && extensions.test(item.name)) files.push(absolute);
  }
}
visit(root);
let failed = 0;
for (const filename of files.sort()) {
  const relative = path.relative(root, filename).replace(/\\/g, '/');
  try {
    babel.transformSync(fs.readFileSync(filename, 'utf8'), {
      filename, babelrc: false, configFile: false,
      presets: [require.resolve('babel-preset-expo')],
      ast: false, code: false,
    });
  } catch (error) {
    failed++;
    const loc = error.loc;
    console.error('::error file=mobile/' + relative + (loc ? ',line=' + loc.line + ',col=' + (loc.column + 1) : '') + '::' + String(error.message).split('\n')[0]);
    console.error('[source-check] ' + relative + ': ' + error.message);
  }
}
console.log('[source-check] Checked ' + files.length + ' source files; errors: ' + failed);
if (failed) process.exitCode = 1;
