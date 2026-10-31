const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'tools/panel_source.jsx'), 'utf8');
const bundle = fs.readFileSync(path.join(root, 'app/assets/panel.bundle.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app/assets/panel.bundle.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'app/panel.html'), 'utf8');

assert.match(source, /const PANEL_BUILD_VERSION = "1\.5\.17";/);
assert.match(bundle, /const PANEL_BUILD_VERSION = "1\.5\.17";/);
assert.match(source, /className="navsec-body" aria-hidden=\{!open\}/);
assert.match(source, /tabIndex=\{open\?0:-1\}/);
assert.match(bundle, /className: "navsec-body", "aria-hidden": !open/);
assert.match(bundle, /tabIndex: open \? 0 : -1/);
assert.match(css, /:focus-visible/);
assert.match(css, /prefers-reduced-motion:reduce/);
assert.match(css, /\.page-content \.table-wrap\{max-width:100%;overflow-x:auto/);
assert.match(html, /panel\.bundle\.css\?v=20261031\.remaining-ui-polish1/);

console.log('PASS admin UI: collapsed navigation inaccessible to keyboard, version synchronization, focus, responsive tables, reduced motion and cache refresh');
