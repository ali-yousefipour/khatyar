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
    .filter((x) => x && typeof x === 'object')
    .map((item) => {
      if (typeof item.client_uuid === 'string' && item.client_uuid.trim()) return item;
      changed = true;
      return { ...item, client_uuid: uuid() };
    });
  return { normalized, changed };
}

// هر عملیات آفلاین در صف ذخیره می‌شود.
export async function enqueue(item = {}) {
  const queue = await pending();
  queue.push({
    ...item,
    client_uuid:
      typeof item.client_uuid === 'string' && item.client_uuid.trim()
        ? item.client_uuid
        : uuid(),
    type: item.type || item.path || 'unknown',
    queued_at: Date.now(),
  });
  await AsyncStorage.setItem(KEY, JSON.stringify(queue));
}

// صف‌های قدیمی فاقد client_uuid در اولین خواندن ترمیم می‌شوند.
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

export async function clearQueue() {
  await AsyncStorage.removeItem(KEY);
}

export async function removeSynced(ids = []) {
  const idSet = new Set((ids || []).map(String));
  const queue = await pending();
  const remaining = queue.filter(
    (item) => !idSet.has(String(item.client_uuid || '')),
  );
  await AsyncStorage.setItem(KEY, JSON.stringify(remaining));
  return queue.length - remaining.length;
}

// ارسال صف به endpoint تجمیعی سرور؛ اجرای هم‌زمان قفل می‌شود تا یک صف چندبار ارسال نشود.
export async function flush(send) {
  if (flushPromise) return flushPromise;

  flushPromise = (async () => {
    let net;
    try {
      net = await Network.getNetworkStateAsync();
    } catch (_) {
      // اگر تشخیص وضعیت شبکه خطا بدهد، فرض می‌کنیم آنلاین هستیم تا اجرای
      // flush به‌طور کامل متوقف نشود و صف برای همیشه معلق نماند.
      net = { isInternetReachable: true };
    }
    if (net.isInternetReachable !== true) return 0;

    const queue = await pending();
    if (!queue.length) return 0;

    try {
      const res = await send({
        path: '/mobile/offline-sync',
        body: { items: queue },
        batch: true,
      });

      if (res && (res.ok || Number.isFinite(Number(res.received)))) {
        if (Array.isArray(res.synced_ids)) {
          return await removeSynced(res.synced_ids);
        }

        await AsyncStorage.setItem(KEY, JSON.stringify([]));
        return queue.length;
      }
    } catch (_) {
      // در صورت ناسازگاری endpoint تجمیعی، fallback تک‌به‌تک اجرا می‌شود.
    }

    const remaining = [];
    for (const item of queue) {
      try {
        await send(item);
      } catch (_) {
        remaining.push(item);
      }
    }

    await AsyncStorage.setItem(KEY, JSON.stringify(remaining));
    return queue.length - remaining.length;
  })();

  try {
    return await flushPromise;
  } finally {
    flushPromise = null;
  }
}
