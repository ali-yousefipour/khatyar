import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from './api';

const keyFor = userId => `dashboard-app-items-v1:${String(userId || '')}`;
const pending = new Map();
const memo = new Map();

// A role change or a new authenticated session must not reuse old route grants.
// In-flight reads cannot re-populate the cache after invalidation.
const epochs = new Map();
const cacheWrites = new Map();
const invalidating = new Map();
async function serializeCacheMutation(key, task) {
  const previous = cacheWrites.get(key) || Promise.resolve();
  const current = previous.catch(() => {}).then(task);
  cacheWrites.set(key, current);
  try { return await current; }
  finally { if (cacheWrites.get(key) === current) cacheWrites.delete(key); }
}
export async function invalidateAppItems(userId) {
  if (!userId) return;
  const key = keyFor(userId);
  epochs.set(key, (epochs.get(key) || 0) + 1);
  memo.delete(key);
  pending.delete(key);
  invalidating.set(key, (invalidating.get(key) || 0) + 1);
  try { await serializeCacheMutation(key, () => AsyncStorage.removeItem(key)); }
  finally {
    const count = (invalidating.get(key) || 1) - 1;
    if (count) invalidating.set(key, count);
    else invalidating.delete(key);
  }
}

// Never share a user's permitted routes with a different signed-in account.
export async function readAppItems(userId) {
  if (!userId) return null;
  const key = keyFor(userId);
  const epoch = epochs.get(key) || 0;
  if (invalidating.has(key)) return null;
  if (memo.has(key)) return memo.get(key).slice();
  try {
    const raw = await AsyncStorage.getItem(key);
    if (invalidating.has(key) || epoch !== (epochs.get(key) || 0)) return null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(x => typeof x === 'string')) return null;
    const items = [...new Set(parsed)];
    memo.set(key, items);
    return items.slice();
  } catch (_) { return null; }
}

export async function refreshAppItems(userId) {
  if (!userId) throw new Error('حساب کاربری مشخص نیست.');
  const key = keyFor(userId);
  if (pending.has(key)) return pending.get(key);
  const epoch = epochs.get(key) || 0;
  const task = (async () => {
    const result = await request('/my/app-items', { noStore: true, forceNetwork: true, queueIfOffline: false, timeoutMs: 10000 });
    if (!Array.isArray(result?.items)) throw new Error('فهرست مجوزهای سمت معتبر نیست.');
    const items = [...new Set(result.items.filter(x => typeof x === 'string'))];
    const assertCurrent = () => {
      if (epoch !== (epochs.get(key) || 0))
        throw new Error('مجوزهای قدیمی به دلیل تغییر نشست کنار گذاشته شدند.');
    };
    assertCurrent();
    await serializeCacheMutation(key, async () => {
      assertCurrent();
      await AsyncStorage.setItem(key, JSON.stringify(items));
      assertCurrent();
    });
    assertCurrent();
    memo.set(key, items);
    return items.slice();
  })();
  pending.set(key, task);
  try { return await task; } finally { if (pending.get(key) === task) pending.delete(key); }
}
