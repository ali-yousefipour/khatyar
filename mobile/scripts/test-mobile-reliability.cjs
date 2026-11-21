const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const permissionsSource = read('mobile/src/appItemPermissions.js');
const auth = read('mobile/src/auth.js');
const api = read('mobile/src/api.js');
const checkinScreen = read('mobile/src/screens/CheckInScreen.js');
const offline = read('mobile/src/offline.js');

async function testPermissionRevocation() {
  const storage = new Map();
  let resolveRequest;
  let calls = 0;
  const asyncStorage = {
    getItem: async key => storage.get(key) || null,
    setItem: async (key, value) => { storage.set(key, value); },
    removeItem: async key => { storage.delete(key); },
  };
  const source = permissionsSource
    .replace(/^import .*;\s*$/gm, '')
    .replace(/export /g, '');
  const context = {
    AsyncStorage: asyncStorage,
    request: async () => {
      calls++;
      if (calls === 1) return new Promise(resolve => { resolveRequest = resolve; });
      return { items: ['Dashboard'] };
    },
  };
  vm.createContext(context);
  vm.runInContext(source + '\nthis.api = {readAppItems, refreshAppItems, invalidateAppItems};', context);
  const { readAppItems, refreshAppItems, invalidateAppItems } = context.api;
  const first = refreshAppItems(42);
  await Promise.resolve();
  assert.equal(typeof resolveRequest, 'function');
  await invalidateAppItems(42);
  resolveRequest({items: ['Admin']});
  await assert.rejects(first, /مجوزهای قدیمی/);
  assert.equal(await readAppItems(42), null, 'revoked routes must not be cached');
  assert.deepEqual(Array.from(await refreshAppItems(42)), ['Dashboard']);
  assert.deepEqual(Array.from(await readAppItems(42)), ['Dashboard']);
}


async function testConcurrentPermissionCacheWrites() {
  const storage = new Map();
  let releaseFirstWrite;
  let writeCount = 0;
  let fetchCount = 0;
  const ctx = {
    AsyncStorage: {
      getItem: async key => storage.get(key) || null,
      setItem: async (key, value) => {
        if (++writeCount === 1) await new Promise(resolve => { releaseFirstWrite = resolve; });
        storage.set(key, value);
      },
      removeItem: async key => { storage.delete(key); },
    },
    request: async () => ({ items: [++fetchCount === 1 ? 'OldRole' : 'NewRole'] }),
  };
  vm.createContext(ctx);
  vm.runInContext(permissionsSource.replace(/^import .*;\s*$/gm, '').replace(/export /g, '') +
    '\nthis.api={readAppItems,refreshAppItems,invalidateAppItems};', ctx);
  const first = ctx.api.refreshAppItems(14);
  for (let i = 0; i < 10 && !releaseFirstWrite; i++) await Promise.resolve();
  assert.equal(typeof releaseFirstWrite, 'function');
  const invalidation = ctx.api.invalidateAppItems(14);
  const second = ctx.api.refreshAppItems(14);
  releaseFirstWrite();
  await assert.rejects(first, /مجوزهای قدیمی/);
  await invalidation;
  assert.deepEqual(Array.from(await second), ['NewRole']);
  assert.deepEqual(Array.from(await ctx.api.readAppItems(14)), ['NewRole']);
}


async function testOfflineReplayConcurrency() {
  const queueStore = new Map();
  const user = {id: 23};
  const storage = {
    getItem: async key => queueStore.get(key) || null,
    setItem: async (key, value) => {queueStore.set(key, value);},
    removeItem: async key => {queueStore.delete(key);},
  };
  const ctx = {
    AsyncStorage: storage,
    Network: {getNetworkStateAsync: async () => ({isConnected:true, isInternetReachable:true})},
    FileSystem: {documentDirectory:null},
    readVerifiedUser: async () => user,
  };
  vm.createContext(ctx);
  vm.runInContext(offline.replace(/^import .*;\s*$/gm, '').replace(/export /g, '') +
    '\nthis.queue={enqueue,pending,retryOne,flush};', ctx);
  await ctx.queue.enqueue({path:'/my/requests', client_uuid:'test-replay-23', body:{type:'manual'}});
  let finishManual;
  let sends = 0;
  const manual = ctx.queue.retryOne('test-replay-23', async () => {
    sends++;
    return new Promise(resolve => {finishManual = resolve;});
  });
  for(let i=0;i<30&&!finishManual;i++) await Promise.resolve();
  assert.equal(typeof finishManual, 'function', 'manual replay must begin');
  const automatic = ctx.queue.flush(async () => {sends++; return {ok:true};});
  finishManual({ok:true});
  await manual;
  await automatic;
  assert.equal(sends, 1, 'automatic flush must skip an active manual retry');
  assert.equal((await ctx.queue.pending()).length, 0, 'successful retry must leave no queued item');

  await ctx.queue.enqueue({path:'/my/requests', client_uuid:'test-replay-24', body:{type:'manual'}});
  let finishAutomatic;
  const ongoingFlush = ctx.queue.flush(async () => {
    sends++;
    return new Promise(resolve => {finishAutomatic = resolve;});
  }, {force:true});
  for(let i=0;i<30&&!finishAutomatic;i++) await Promise.resolve();
  assert.equal(typeof finishAutomatic, 'function', 'automatic replay must begin');
  const delayedManual = ctx.queue.retryOne('test-replay-24', async () => {
    sends++;
    return {ok:true};
  });
  const duplicateRejected = assert.rejects(delayedManual, /قبلاً ارسال شده است/);
  finishAutomatic({ok:true});
  await ongoingFlush;
  await duplicateRejected;
  assert.equal(sends, 2, 'manual retry must not resubmit an automatically delivered item');
}

(async () => {
  await testPermissionRevocation();
  await testOfflineReplayConcurrency();
  await testConcurrentPermissionCacheWrites();
  assert.match(auth, /const me=await request\('\/auth\/me',\{noStore:true,timeoutMs:8000\}\)/);
  assert.match(auth, /await invalidateAppItems\(user\.id\)/);
  assert.match(permissionsSource, /invalidating\.has\(key\) \|\| epoch !==/);
  assert.match(auth, /resetAccountCaches\(d\.user\?\.id\)/);
  assert.match(auth, /invalidateAppItems\(normalized\.id\)/);
  assert.match(auth, /queueIfOffline:false,forceNetwork:true,timeoutMs:7000/);
  assert.match(offline, /if\(!owner\?\.id\)throw new Error/);
  assert.match(offline, /!item\.owner_user_id \|\| String\(item\.owner_user_id\)!==String\(owner\.id\)/);
  assert.match(offline, /if\(retryLocks\.has\(key\)\)return retryLocks\.get\(key\)/);
  assert.match(offline, /if\(flushPromise\)await flushPromise/);
  assert.match(offline, /if\(retryLocks\.has\(String\(item\.client_uuid\)\)\)continue/);
  assert.match(api, /body:sendBody,auth,retry:false,noStore,timeoutMs,queueIfOffline,forceNetwork/);
  assert.match(api, /if\(receivedHttpResponse\)throw firstError/);

  assert.match(api, /const id=String\(fields\?\.client_uuid\|\|/,'multipart queue must use original UUID');
  assert.match(api, /Only requests known offline BEFORE the first send enter the queue/);
  assert.match(api, /Number\(item.owner_user_id\)===Number\(userId\)/,'offline checkout must be user scoped');
  assert.match(checkinScreen, /hasPendingAttendanceCheckout\(user\?\.id\)/, 'check-in screen must pass current user to pending checkout verification');
  assert.match(api, /readEpoch!==userCacheEpoch\|\|isAttendanceRead\(path\)/,'asynchronous cache fallback must re-check session');
  assert.match(api, /Date.now\(\)-Number\(j.t\)<=CACHE_MAX_AGE_MS/,'offline cache must expire');
  assert.match(auth, /e\?\.status===403 && \/خروج از حساب کاربری/,'logout must respect explicit administrator policy');

  console.log('Mobile reliability regression checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
