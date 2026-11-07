const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = path.resolve(__dirname, '../app');
const panel = fs.readFileSync(path.join(app, 'panel.html'), 'utf8');
const css = fs.readFileSync(path.join(app, 'assets/khatyar-emerald-system.css'), 'utf8');
const bundle = fs.readFileSync(path.join(app, 'assets/panel.bundle.js'), 'utf8');

assert.match(panel, /khatyar-emerald-system\.css\?v=/);
assert.match(panel, /brand-khatyar\.png/);
assert.match(css, /--brand:\s*#075b4d/);
for (const selector of [
  '.side', '.navsec', '.navitem', '.page-content .panel',
  '.page-content .filters', '.page-content .tabbtn',
  '.page-content .table-wrap', '.modal-bg', '.modal'
]) {
  assert.ok(css.includes(selector), 'Theme must cover ' + selector);
}

const sectionBlock = bundle.match(/const PANEL_MENU_SECTIONS = \[([\s\S]*?)\n\];/);
assert.ok(sectionBlock, 'Menu group registry is available');
const sectionRows = [...sectionBlock[1].matchAll(/\["([^"]+)",\s*\[([^\]]*)\]\]/g)];
assert.equal(sectionRows.length, 10, 'All 10 admin menu groups remain present');
const views = sectionRows.flatMap(([, , keys]) => [...keys.matchAll(/"([^"]+)"/g)].map(x => x[1]));
assert.equal(views.length, 60, 'All 60 admin menu pages remain present');
assert.equal(new Set(views).size, 60, 'Menu keys stay unique');

console.log('Khatyar emerald theme is linked and covers 60 pages in 10 sections.');
