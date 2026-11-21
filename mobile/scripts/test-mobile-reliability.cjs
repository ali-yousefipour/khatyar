const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const permissionsSource = read('mobile/src/appItemPermissions.js');
const auth = read('mobile/src/auth.js');
const api = read('mobile/src/api.js');
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
  vm.runInContext(permissionsSource.replace(/^import .*;\\s*$/gm, '').replace(/export /g, '') +
    '\\nthis.api={readAppItems,refreshAppItems,invalidateAppItems};', ctx);
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

(async () => {
  await testPermissionRevocation();
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
  console.log('Mobile reliability regression checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
