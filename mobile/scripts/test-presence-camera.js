const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../src');
function load(name, context) {
  const source = fs.readFileSync(path.join(root, name), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
  return vm.createContext({ ...context, source });
}

async function testCompression() {
  let dimensions = { width: 4000, height: 8000 };
  let calls = [];
  let failures = 0;
  const context = load('img.js', {
    Image: { getSize: (uri, success) => success(dimensions.width, dimensions.height) },
    ImageManipulator: { SaveFormat: { JPEG: 'jpeg' }, manipulateAsync: async (uri, actions, options) => {
      calls.push({ actions, options });
      if (failures-- > 0) throw new Error('memory');
      return { uri: 'compressed.jpg', base64: 'jpeg-data' };
    } },
  });
  vm.runInContext(context.source, context);
  vm.runInContext('setImageConfig({image_quality:70,image_max_width:1024,image_max_height:1200})', context);
  assert.equal(await vm.runInContext('compressToDataUri("photo.jpg")', context), 'data:image/jpeg;base64,jpeg-data');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].actions)), [{ resize: { width: 600, height: 1200 } }]);
  assert.equal(calls[0].options.compress, 0.7);
  dimensions = { width: 100, height: 200 };
  calls = [];
  await vm.runInContext('compressToDataUri("small.jpg")', context);
  assert.equal(calls[0].actions.length, 0);
  dimensions = { width: 8000, height: 4000 };
  calls = [];
  failures = 1;
  await vm.runInContext('compressToDataUri("large.jpg")', context);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].actions[0].resize.width, 800);
  assert.equal(calls[1].options.compress, 0.5);
  failures = 2;
  assert.equal(await vm.runInContext('compressToDataUri("broken.jpg")', context), null);
  console.log('PASS configured width/height, aspect ratio, no upscaling, quality, retry and failure');
}

function testCameraOwnership() {
  let current;
  let clock = 0;
  const timers = new Set();
  const listeners = new Set();
  const context = load('cameraSession.js', {
    Date: { now: () => clock },
    AppState: { currentState: 'active', addEventListener: (name, handler) => {
      listeners.add(handler); return { remove: () => listeners.delete(handler) };
    } },
    setInterval: handler => { timers.add(handler); return handler; },
    clearInterval: handler => timers.delete(handler),
    useRef: value => {
      const index = current.index++;
      return current.values[index] ?? (current.values[index] = { current: value });
    },
    useState: initial => {
      const instance = current;
      const index = instance.index++;
      if (!(index in instance.values)) instance.values[index] = initial;
      return [instance.values[index], value => {
        instance.values[index] = typeof value === 'function' ? value(instance.values[index]) : value;
      }];
    },
    useEffect: (effect, dependencies) => {
      const instance = current;
      const index = instance.index++;
      const previous = instance.effects[index];
      if (!previous || dependencies.some((value, offset) => value !== previous.dependencies[offset])) {
        previous?.cleanup?.();
        instance.effects[index] = { dependencies, cleanup: effect() };
      }
    },
  });
  vm.runInContext(context.source, context);
  const first = { values: [], effects: [] }, second = { values: [], effects: [] };
  function render(instance, enabled = true) {
    current = instance; current.index = 0;
    context.enabled = enabled;
    return vm.runInContext('useCameraSession(enabled)', context);
  }
  render(first); render(second);
  assert.equal(render(first).cameraActive, true);
  assert.equal(render(second).cameraActive, false);
  render(first, false);
  timers.forEach(handler => handler());
  assert.equal(render(second).cameraActive, false);
  clock = 351;
  timers.forEach(handler => handler());
  assert.equal(render(second).cameraActive, false, 'rear lens must wait for native release');
  clock = 801;
  timers.forEach(handler => handler());
  assert.equal(render(second).cameraActive, true);
  listeners.forEach(handler => handler('background'));
  assert.equal(render(second).cameraActive, false);
  listeners.forEach(handler => handler('active'));
  clock = 1602;
  render(second); timers.forEach(handler => handler());
  assert.equal(render(second).cameraActive, true);
  first.effects.forEach(effect => effect?.cleanup?.());
  second.effects.forEach(effect => effect?.cleanup?.());
  assert.equal(timers.size, 0);
  assert.equal(listeners.size, 0);
  console.log('PASS camera exclusion, release delay, background/resume and cleanup');
}

function testRearPreviewRecovery() {
  const source = fs.readFileSync(path.join(root, 'VehiclesPhotoCapture.js'), 'utf8');
  assert.match(source, /onPress=\{recoverPreview\}/, 'manual recovery must remain available for black preview');
  assert.match(source, /setCameraReady\(false\);[\s\S]*?restartCamera\(\)/, 'recovery must reset readiness and remount the native camera');
  assert.match(source, /onMountError=/, 'native camera mount failures must be handled');
  console.log('PASS rear camera black-preview manual recovery and native remount');
}

testCompression().then(() => { testCameraOwnership(); testRearPreviewRecovery(); }).catch(error => { console.error(error); process.exitCode = 1; });
