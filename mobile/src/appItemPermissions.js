import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from './api';

const keyFor = userId => `dashboard-app-items-v1:${String(userId || '')}`;
const pending = new Map();
const memo = new Map();

// Never share a user's permitted routes with a different signed-in account.
export async function readAppItems(userId) {
  if (!userId) return null;
  const key = keyFor(userId);
  if (memo.has(key)) return memo.get(key).slice();
  try {
    const raw = await AsyncStorage.getItem(key);
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
  const task = (async () => {
    const result = await request('/my/app-items', { noStore: true, forceNetwork: true, queueIfOffline: false, timeoutMs: 10000 });
    if (!Array.isArray(result?.items)) throw new Error('فهرست مجوزهای سمت معتبر نیست.');
    const items = [...new Set(result.items.filter(x => typeof x === 'string'))];
    memo.set(key, items);
    await AsyncStorage.setItem(key, JSON.stringify(items)).catch(() => {});
    return items.slice();
  })();
  pending.set(key, task);
  try { return await task; } finally { pending.delete(key); }
}
