import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from './api';

const key = userId => `my-allowed-lines-v1:${userId}`;

export async function readAllowedLines(userId) {
  if (!userId) return null;
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    const rows = raw && JSON.parse(raw);
    return Array.isArray(rows) ? rows : null;
  } catch (_) { return null; }
}

export async function refreshAllowedLines(userId) {
  const result = await request('/my/lines', { noStore: true, timeoutMs: 10000, queueIfOffline: false });
  if (!Array.isArray(result)) throw new Error('پاسخ خطوط مجاز معتبر نیست.');
  if (userId) await AsyncStorage.setItem(key(userId), JSON.stringify(result)).catch(() => {});
  return result;
}
