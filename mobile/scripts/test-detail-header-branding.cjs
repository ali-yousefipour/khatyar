const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const header = fs.readFileSync(path.resolve(__dirname, '../src/components/DetailPageHeader.js'), 'utf8');
const app = fs.readFileSync(path.resolve(__dirname, '../App.js'), 'utf8');
assert.match(header, /require\('\.\.\/\.\.\/assets\/icon\.png'\)/, 'Use the actual app icon, not a recreated logo');
assert.match(header, /accessibilityLabel="باز کردن منو"/, 'Drawer control needs its accessible name');
assert.match(header, /accessibilityLabel="بازگشت"/, 'Back control needs its accessible name');
assert.match(header, /width:48, height:48/, 'Buttons must meet Android touch size requirements');
assert.match(header, /goldRule/, 'Keep the gold brand accent from approved mockups');
assert.match(header, /backgroundColor:'#075d4b'/, 'Use the emerald header color');
assert.match(app, /<MaterialCommunityIcons name="menu" size=\{25\} color="#fff"/, 'Global menu icon should use the consistent vector icon');
assert.doesNotMatch(app, />☰<\/Text>/, 'Do not fall back to a font-dependent hamburger character');
console.log('PASS shared detail header branding and accessibility');
