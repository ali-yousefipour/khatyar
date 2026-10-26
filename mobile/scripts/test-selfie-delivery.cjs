const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/CovertSelfie.js'), 'utf8');
const start = source.indexOf('  const handleDone = useCallback(');
const end = source.indexOf('\n  }, []);', start) + '\n  }, []);'.length;
assert.ok(start > 0 && end > start, 'CovertSelfie.js must define handleDone using useCallback');
// Fail with an actionable contract error rather than an opaque assertion during the success scenario.
assert.ok(source.includes('if (!result?.ok || !(Number(result.id) > 0) || result.queued)'),
  'Selfie delivery contract mismatch: successful server persistence must be verified before clearing a pending request. Restore the consent-based upload flow; do not bypass this test.');
assert.ok(!source.includes("'/fulfill'"),
  'Selfie delivery contract mismatch: polling must not acknowledge a request before upload succeeds.');
async function run(mode) {
  const events = [];
  const context = {
    generationRef: { current: 1 }, commandRef: { current: { kind: 'request', id: 7 } }, busyRef: { current: true }, uploadingRef: { current: false },
    useCallback: callback => callback,
    setShooting: value => events.push(['shooting', value]),
    setSending: value => events.push(['sending', value]),
    setPending: value => events.push(['pending', value]),
    setError: value => events.push(['error', value]),
    compressToDataUri: async () => mode === 'compression-error' ? null : 'data:image/jpeg;base64,compressed',
    Location: { getLastKnownPositionAsync: async () => null },
    require: () => ({ deleteAsync: async () => events.push(['deleted']) }),
    request: async (url, options) => {
      events.push(['request', url, options]);
      assert.equal(context.busyRef.current, true, 'capture remains locked during upload');
      assert.equal(options.queueIfOffline, false, 'offline queue is not a durable server acknowledgment');
      assert.equal(options.body.request_id, 7);
      if (mode === 'network-error') throw new Error('offline');
      return mode === 'queued' ? { ok: true, queued: true, id: 'q_1' } : { ok: true, id: 12 };
    },
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end) + '\nrunCapture=handleDone;', context);
  await context.runCapture(mode === 'camera-error' ? null : { uri: 'file:///photo.jpg' });
  assert.equal(events.some(event => event[0] === 'pending' && event[1] === null), mode === 'success',
    `Pending request state mismatch in ${mode}: clear only after durable server acknowledgment`);
  assert.equal(events.some(event => event[0] === 'error'), mode !== 'success');
  assert.equal(context.busyRef.current, false);
  assert.equal(events.filter(event => event[0] === 'request').length, ['success', 'queued', 'network-error'].includes(mode) ? 1 : 0);
}
(async () => {
  for (const mode of ['success', 'camera-error', 'compression-error', 'network-error', 'queued']) await run(mode);
  // A dismissed request must never upload a late camera callback.
  assert.ok(source.includes('if (generation !== generationRef.current || !command)'));
  assert.ok(source.includes('// A cancelled permission dialog must not leave the camera locked.'));
  const stale = {
    generationRef: { current: 2 }, commandRef: { current: null },
    busyRef: { current: false }, uploadingRef: { current: false },
    useCallback: fn => fn,
    setShooting: () => { throw Error('stale camera callback changed the active capture UI'); },
    setSending: () => { throw Error('stale camera callback started an upload'); },
    compressToDataUri: () => { throw Error('stale capture compressed'); },
    request: () => { throw Error('stale capture uploaded'); },
    require: () => ({ deleteAsync: async () => {} }),
  };
  vm.createContext(stale);
  vm.runInContext(source.slice(start, end) + '\nrunCapture=handleDone;', stale);
  await stale.runCapture({ uri: 'file:///stale-photo.jpg' });
  assert.ok(source.includes("request('/my/covert-selfie-request', { noStore: true })"));
  assert.ok(source.includes("request('/my/selfie-commands', { noStore: true })"));
  assert.ok(!source.includes("'/fulfill'"));
  assert.ok(!source.includes('onCovertTrigger'), 'selfie delivery cannot depend on a screenshot listener');
  assert.ok(source.includes('setTimeout(() => finish(null), 30000)'));
  assert.ok(source.includes('finishedRef.current = true'));
  assert.ok(!source.includes('top: -9999'), 'camera preview must remain visible');
  console.log('PASS Android selfie: durable success, camera/compression/network failures, queued-response rejection, polling, visible preview and capture timeout');
})().catch(error => { console.error(error); process.exitCode = 1; });
