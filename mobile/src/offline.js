import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

const KEY = 'offline_queue_v2';
let flushPromise = null;

function uuid() {
  return 'q_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

function normalizeQueue(value) {
  const source = Array.isArray(value) ? value : [];
  let changed = !Array.isArray(value);
  const normalized = source
    .filter((x) => x && typeof x === 'object' && x.path)
    .map((item) => {
      if (typeof item.client_uuid === 'string' && item.client_uuid.trim()) return item;
      changed = true;
      return { ...item, client_uuid: uuid() };
    });
  return { normalized, changed };
}

export async function enqueue(item = {}) {
  if (!item?.path) return null;
  const queue = await pending();
  const clientUuid = typeof item.client_uuid === 'string' && item.client_uuid.trim() ? item.client_uuid : uuid();
  // یک عملیات با همان شناسه نباید دوبار وارد صف شود.
  const exists = queue.some((x) => String(x.client_uuid || '') === String(clientUuid));
  if (exists) return clientUuid;
  queue.push({
    ...item,
    client_uuid: clientUuid,
    type: item.type || item.path || 'unknown',
    queued_at: Number(item.queued_at || Date.now()),
  });
  await AsyncStorage.setItem(KEY, JSON.stringify(queue));
  return clientUuid;
}

export async function pending() {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const { normalized, changed } = normalizeQueue(parsed);
    if (changed) await AsyncStorage.setItem(KEY, JSON.stringify(normalized));
    return normalized;
  } catch (_) {
    await AsyncStorage.removeItem(KEY);
    return [];
  }
}

export async function clearQueue() { await AsyncStorage.removeItem(KEY); }

export async function removeSynced(ids = []) {
  const idSet = new Set((ids || []).map(String));
  const queue = await pending();
  const remaining = queue.filter((item) => !idSet.has(String(item.client_uuid || '')));
  await AsyncStorage.setItem(KEY, JSON.stringify(remaining));
  return queue.length - remaining.length;
}

function isRetryableResponse(result) {
  if (!result) return false;
  const status = Number(result?.status || result?.http_status || 0);
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

// صف را به‌ترتیب ثبت تخلیه می‌کنیم. هر مورد فقط بعد از موفقیت حذف می‌شود؛
// بنابراین قطع اینترنت وسط ارسال باعث از بین رفتن اطلاعات قبلی صف نمی‌شود.
export async function flush(send) {
  if (flushPromise) return flushPromise;
  flushPromise = (async () => {
    let net;
    try { net = await Network.getNetworkStateAsync(); } catch (_) { net = { isInternetReachable: true }; }
    if (net.isInternetReachable !== true) return 0;

    const queue = await pending();
    if (!queue.length) return 0;

    let synced = 0;
    for (const item of queue) {
      try {
        const res = await send(item);
        if (res?.queued) break;
        if (res?.ok === false && isRetryableResponse(res)) break;
        await removeSynced([item.client_uuid]);
        synced += 1;
      } catch (_) {
        // اولین خطای شبکه/موقت، ترتیب صف را حفظ می‌کنیم و بقیه را برای نوبت بعد نگه می‌داریم.
        break;
      }
    }
    return synced;
  })();
  try { return await flushPromise; } finally { flushPromise = null; }
}
