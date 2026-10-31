const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = fs.readFileSync(path.join(__dirname, '../app/app.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../app/assets/android-web-ux.css'), 'utf8');
const sw = fs.readFileSync(path.join(__dirname, '../app/sw.js'), 'utf8');

assert.match(app, /assets\/android-web-ux\.css\?v=20261031\.android-parity1/,
  'Android-aligned styles must be loaded by the canonical web entry point');
assert.match(sw, /android-web-ux\.css\?v=20261031\.android-parity1/,
  'Android-aligned styles must be available offline');
assert.doesNotMatch(app, /user-scalable=no|maximum-scale=1/,
  'Browser users must be able to zoom');
assert.match(app, /Array\.isArray\(APP_ALLOWED\)/,
  'Missing role permissions must not expose every Android route');
assert.match(app, /\.filter\(\(\[route\]\)=>appAllowed\(route\)\)/,
  'Navigation tabs must respect role permissions');
assert.match(app, /aria-current="page"/,
  'Selected navigation tabs must be announced');
assert.match(app, /class="web-loading" role="status" aria-live="polite"/,
  'Web-screen loading must be announced without trapping focus');
for (const selector of ['.hdr', '.hero', '.card', '.item', '.kpi', '.btn', '.inp', '.native-actions .act', '.drawer .panel', '.radio-talk-button']) {
  assert.ok(css.includes(selector), `Shared Android design missing ${selector}`);
}
assert.match(css, /prefers-reduced-motion:reduce/, 'Respect system reduced-motion preference');
assert.match(css, /:focus-visible/, 'Show visible keyboard focus');
assert.match(css, /safe-area-inset-bottom/, 'Keep controls clear of mobile gesture navigation');
console.log('PASS Android web UX: common components, role-scoped navigation, accessible feedback, offline cache');
