const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const dashboard = fs.readFileSync(path.resolve(__dirname, '../src/screens/DashboardScreen.js'), 'utf8');
const tiles = fs.readFileSync(path.resolve(__dirname, '../src/components/DashboardTiles.js'), 'utf8');
const drawer = fs.readFileSync(path.resolve(__dirname, '../src/DrawerMenuScreen.js'), 'utf8');

const cards = dashboard.match(/const MENU = \[([\s\S]*?)\];/)?.[1] || '';
const mapping = dashboard.match(/const MENU_ICONS = \{([\s\S]*?)\};/)?.[1] || '';
const cardRoutes = [...cards.matchAll(/\br:\s*'([^']+)'/g)].map(m => m[1]);
const iconRoutes = [...mapping.matchAll(/"([^"]+)":\s*"[^"]+"/g)].map(m => m[1]);
assert.equal(cardRoutes.length, 37, 'Do not inadvertently remove dashboard features');
assert.equal(new Set(cardRoutes).size, 37, 'Each dashboard route should be unique');
for (const route of cardRoutes) assert.ok(iconRoutes.includes(route), `Missing vector icon for ${route}`);
assert.doesNotMatch(cards, /icon3d:|glyph:/, 'All menu tiles must use one scalable vector icon family');
assert.match(dashboard, /CATEGORY_LABELS\[categoryOf\(m\.r\)\]/, 'Category should be legible on each card');
assert.match(dashboard, /label=\{m\.t\}/, 'Every tool must receive its actual label');
assert.match(tiles, /accessibilityLabel=\{label\}/, 'Every tool must expose its label');
assert.match(dashboard, /menuTab: \{ minHeight: 48/, 'Category chips should have >=48dp touch targets');
assert.match(dashboard, /allowed\.includes\(m\.r\)/, 'New visual components must still respect role access');

const itemRoutes = [...(drawer.match(/const ITEMS = \[([\s\S]*?)\];/)?.[1] || '').matchAll(/\['([^']+)'/g)].map(m => m[1]);
const sections = drawer.match(/const MENU_SECTIONS = \[([\s\S]*?)\];/)?.[1] || '';
for (const route of [...itemRoutes, 'SendQueue']) assert.ok(sections.includes(`'${route}'`), `Drawer section omitted ${route}`);
assert.match(drawer, /roleAppAccess\.includes\(route\)/, 'Drawer must continue to filter unauthorized links');
assert.match(drawer, /paddingTop:insets\.top\+14/, 'Drawer header should honor the status bar safe area');
assert.match(drawer, /roleAccessError/, 'Drawer needs a recoverable network-error state');
console.log('PASS dashboard/menu redesign: 37 icons, accessible cards, role-scoped grouped drawer');
