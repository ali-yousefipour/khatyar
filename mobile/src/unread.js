import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import { request } from './api';
import { faNum } from './num';

let timer = null;
let listeners = new Set();
let current = { messages: 0, reports: 0, total: 0 };
let loading = false;
let appStateSub = null;

function emit(next) {
  current = { messages: Number(next?.messages || 0), reports: Number(next?.reports || 0), total: Number(next?.total ?? (Number(next?.messages || 0) + Number(next?.reports || 0))) };
  listeners.forEach(fn => { try { fn(current); } catch (_) {} });
}

async function updateLauncherBadge(total) {
  try {
    if (Platform.OS === 'android' || Platform.OS === 'ios') await Notifications.setBadgeCountAsync(Math.max(0, Number(total || 0)));
  } catch (_) {}
}

export async function refreshUnreadCounts() {
  if (loading) return current;
  loading = true;
  try {
    const d = await request('/my/unread-counts', { noStore: true });
    emit(d || {});
    await updateLauncherBadge(d?.total || 0);
  } catch (_) {}
  finally { loading = false; }
  return current;
}

export function getUnreadCounts() { return current; }

export function subscribeUnreadCounts(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  try { fn(current); } catch (_) {}
  return () => listeners.delete(fn);
}

export function startUnreadPolling() {
  if (timer) return;
  refreshUnreadCounts();
  timer = setInterval(refreshUnreadCounts, 15000);
  appStateSub = AppState.addEventListener('change', state => { if (state === 'active') refreshUnreadCounts(); });
}

export function stopUnreadPolling() {
  if (!timer) return;
  clearInterval(timer);
  try { appStateSub?.remove?.(); } catch (_) {}
  appStateSub = null;
  timer = null;
}

export function unreadLabel(n) { return Number(n || 0) > 99 ? '+۹۹' : faNum(Number(n || 0)); }
