const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const screen = name => fs.readFileSync(path.resolve(__dirname, '../src/screens', name), 'utf8');
const stations = screen('MyStationsScreen.js');
const leaderboard = screen('LeaderboardScreen.js');
const help = screen('HelpScreen.js');
const about = screen('AboutAppScreen.js');
const subscription = screen('SubscriptionScreen.js');

assert.match(stations, /generation\.current/);
assert.match(stations, /current !== generation\.current/);
assert.match(stations, /!loading && !error && !denied && data\.map/);
assert.match(stations, /HistoricalMediaImage/);
assert.match(stations, /useWindowDimensions/);
assert.match(leaderboard, /setData\(null\);setBadges\(null\)/);
assert.match(leaderboard, /accessibilityRole="tab"/);
assert.match(leaderboard, /MaterialCommunityIcons/);
assert.doesNotMatch(leaderboard, /🥇|🥈|🥉|🏅/);
assert.match(help, /accessibilityState=\{\{ expanded: open \}\}/);
assert.match(help, /MaterialCommunityIcons/);
assert.doesNotMatch(help, /icon: '[\u{1F300}-\u{1FAFF}]/u);
assert.match(about, /useWindowDimensions/);
assert.match(about, /accessibilityRole="button"/);
assert.match(subscription, /generation\.current/);
assert.match(subscription, /accessibilityState=\{\{disabled:loading\}\}/);
assert.match(subscription, /pendingBox/);
console.log('PASS under-reviewed screens: stale-response guards, recoverability, icons, accessibility and responsive layout');
