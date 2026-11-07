const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../tools/panel_source.jsx'), 'utf8');
const css = fs.readFileSync(path.resolve(__dirname, '../app/assets/khatyar-emerald-system.css'), 'utf8');
const html = fs.readFileSync(path.resolve(__dirname, '../app/panel.html'), 'utf8');

assert.match(source, /const I8=\(name\)=>\{/);
assert.match(source, /<svg className="kh-nav-svg"/);
assert.doesNotMatch(source, /icons3d\/\$\{name\}\.png/);
assert.match(source, /\{I8\(MENU_ICONS\[k\]\)\}/);
assert.match(source, /\{I8\('logout-door'\)\}/);
const iconMap = source.match(/const MENU_ICONS=\{([\s\S]*?)\n  \};/);
assert.ok(iconMap, 'All panel menu views must retain an icon mapping');
assert.equal((iconMap[1].match(/:\s*'[^']+'/g) || []).length, 60, 'All sixty panel views have semantic icons');
assert.match(css, /\.layout \.navitem \.kh-nav-svg/);
assert.match(css, /prefers-reduced-motion:reduce/);
assert.match(html, /panel\.bundle\.js\?v=20261107\.2001/);
console.log('Panel navigation uses coherent SVG icons across all sixty views.');
