'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const parser = require('@babel/parser');
const read = p => fs.readFileSync(path.resolve(__dirname, '../src/components', p), 'utf8');

const vehicle = read('VehicleIdentityFields.js');
const signature = read('SignaturePad.js');
const school = fs.readFileSync(path.resolve(__dirname, '../src/screens/SchoolServiceScreen.js'), 'utf8');
assert.ok(parser.parse(school, {sourceType:'module',plugins:['jsx']}).program.body.length, 'school inspection JSX must parse');
assert.match(school,/const submitInFlight=React\.useRef\(false\)/,'inspection submission needs a synchronous lock');
assert.match(school,/const submit=async\(\)=>\{if\(submitInFlight\.current\|\|saving\)return;/,'rapid duplicate inspection taps must be rejected');
assert.match(school,/submitInFlight\.current=true;setSaving\(true\);try\{/,'lock must be acquired before async work');
assert.match(school,/finally\{submitInFlight\.current=false;setSaving\(false\)\}/,'failed submissions must unlock');
assert.match(school,/queueIfOffline:true/,'school inspection offline queue contract must remain intact');
assert.match(school,/visible=\{reviewOpen\} transparent animationType="slide" onRequestClose=\{\(\)=>\{if\(!saving\)setReviewOpen\(false\)\}\}/,'hardware Back cannot abandon pending submission');
assert.match(school,/<ScrollView style=\{s\.reviewScroll\} contentContainerStyle=\{s\.reviewContent\}>/,'large review text must scroll');
assert.match(school,/await loadRecent\(\);setReviewOpen\(false\);/,'only successful save path closes review and resets form');

for (const [name, source] of [['VehicleIdentityFields', vehicle], ['SignaturePad', signature]]) {
  assert.ok(parser.parse(source, {sourceType:'module',plugins:['jsx']}).program.body.length, name + ' JSX must parse');
}
assert.match(vehicle, /<ModalKeyboardView style=\{st\.backdrop\}>/, 'vehicle year search must avoid Android keyboard');
assert.match(vehicle, /useSafeAreaInsets\(\)/, 'vehicle selectors need gesture navigation bottom padding');
assert.match(vehicle, /accessibilityLabel="جستجوی سال ساخت"/, 'vehicle year search must expose its purpose');
assert.match(vehicle, /accessibilityState=\{\{selected:Number\(value\)===y\}\}/, 'selected vehicle year must be announced');
assert.match(vehicle, /accessibilityState=\{\{selected:data\.plate_letter===letter\}\}/, 'selected Iranian plate letter must be announced');

const functions = signature.match(/  async function capture\(\) \{[\s\S]*?\n  \}\n\n  function clear\(\) \{[\s\S]*?\n  \}/);
assert.ok(functions, 'signature capture and clear methods should be available for isolated regression');
assert.match(signature, /onPanResponderGrant: \(e\) => \{\s*captureGeneration\.current \+= 1/, 'new signature strokes must invalidate in-flight capture');
assert.match(signature, /mounted\.current = true;[\s\S]*?return \(\) => \{ mounted\.current = false; captureGeneration\.current \+= 1; \}/, 'capture cleanup must handle React strict effect replay');
assert.match(signature, /accessibilityLabel="پاک کردن امضا"/, 'clear action must be accessible');

async function checkSignatureRace() {
  const pending = [];
  const emitted = [];
  const context = {
    captureGeneration: {current: 1},
    mounted: {current: true},
    shotRef: {current: {}},
    currentRef: {current: [1]},
    onChangeRef: {current: value => emitted.push(value)},
    setStrokes: () => {},
    captureRef: () => new Promise(resolve => pending.push(resolve)),
  };
  vm.createContext(context);
  vm.runInContext(functions[0] + '\nthis.api = {capture,clear};', context);

  const stale = context.api.capture();
  context.api.clear();
  pending.shift()('old-bytes');
  await stale;
  assert.deepEqual(emitted, [''], 'a clear must never be followed by an obsolete signature image');

  context.captureGeneration.current += 1;
  const fresh = context.api.capture();
  pending.shift()('new-bytes');
  await fresh;
  assert.deepEqual(emitted, ['', 'data:image/png;base64,new-bytes'], 'current capture must still be delivered');

  const afterUnmount = context.api.capture();
  context.mounted.current = false;
  context.captureGeneration.current += 1;
  pending.shift()('unmounted');
  await afterUnmount;
  assert.equal(emitted.length, 2, 'unmounted capture must not update the parent');
}
checkSignatureRace().then(() => console.log('PASS shared vehicle dialogs and signature capture race')).catch(e => {console.error(e);process.exitCode = 1;});
