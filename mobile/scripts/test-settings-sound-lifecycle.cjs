const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const settings = fs.readFileSync(path.join(root, 'src/screens/SettingsScreen.js'), 'utf8');
const groups = [...settings.matchAll(/keys: \[([^\]]+)\]/g)].flatMap(match => [...match[1].matchAll(/'([^']+)'/g)].map(item => item[1]));
const items = [...settings.matchAll(/^  \['([^']+)',/gm)].map(match => match[1]);
assert.equal(groups.length, items.length, 'every setting belongs to a section');
assert.equal(new Set(groups).size, items.length, 'no setting appears twice');
assert.deepEqual(groups.filter(key => !items.includes(key)), [], 'section routes exist');

const code = fs.readFileSync(path.join(root, 'src/soundFx.js'), 'utf8')
  .replace(/^export /gm, '');
let timerId = 0;
const timers = new Map();
const players = [];
const audio = {
  setAudioModeAsync: async () => {},
  createAudioPlayer: () => {
    const player = {play() {}, pause() {}, remove() { player.removed = true; }, addListener(_name, callback) { player.callback = callback; return { remove() {} }; }};
    players.push(player);
    return player;
  },
};
const context = {
  require: name => name === 'expo-audio' ? audio : name,
  setTimeout: fn => { const id = ++timerId; timers.set(id, fn); return id; },
  clearTimeout: id => timers.delete(id),
};
vm.createContext(context);
vm.runInContext(`${code}\nthis.api = { playSound, stopSound };`, context);

(async () => {
  const short = await context.api.playSound('notificationNew');
  assert.equal(timers.size, 1, 'one-shot sound gets a cleanup timer');
  const warning = await context.api.playSound('presenceAlert', { loop: true });
  assert.equal(timers.size, 1, 'looping alarm must not cancel the one-shot cleanup timer');
  await context.api.stopSound(warning);
  assert.equal(timers.size, 1, 'stopping looping alarm must not cancel unrelated cleanup');
  [...timers.values()][0]();
  assert.equal(short.removed, true, 'one-shot player is eventually released');
  console.log('PASS settings section inventory and sound lifecycle');
})().catch(error => { console.error(error); process.exitCode = 1; });
