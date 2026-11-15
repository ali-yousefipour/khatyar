import * as Location from 'expo-location';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { request, flushQueuedRequests } from './api';

// بارگذاری امن NetInfo؛ اگر ماژول بومی نبود، اپ کرش نمی‌کند و فقط رصد اینترنت غیرفعال می‌شود
let NetInfo = null;
try { NetInfo = require('@react-native-community/netinfo').default || require('@react-native-community/netinfo'); } catch (e) { NetInfo = null; }

const TKEY = 'telemetry_queue';
let lastOnline = null;
let gpsTimer = null;
let appStateSub = null;
let netUnsubscribe = null;
let internetTimer = null;
let lastInternetOffCheckpoint = 0;

// ارسال رویداد با زمان دقیق رخداد. اگر آفلاین بود، در صف ذخیره و بعداً با همان زمان ارسال می‌شود.
export function sendTelemetry(kind, meta) {
  const at = new Date().toISOString();
  request('/activity/telemetry', { method: 'POST', body: { kind, meta, at } })
    .catch(() => queueTelemetry({ kind, meta, at }));
}

async function queueTelemetry(ev) {
  try {
    const raw = await AsyncStorage.getItem(TKEY);
    const q = raw ? JSON.parse(raw) : [];
    q.push(ev);
    await AsyncStorage.setItem(TKEY, JSON.stringify(q.slice(-500)));
  } catch (e) {}
}

// ارسال رویدادهای ذخیره‌شدهٔ آفلاین در اولین اتصال
export async function flushTelemetry() {
  try {
    const raw = await AsyncStorage.getItem(TKEY);
    const q = raw ? JSON.parse(raw) : [];
    if (!q.length) return;
    const remain = [];
    for (const ev of q) {
      try { await request('/activity/telemetry', { method: 'POST', body: ev }); }
      catch { remain.push(ev); }
    }
    await AsyncStorage.setItem(TKEY, JSON.stringify(remain));
  } catch (e) {}
}

// رصد وضعیت اینترنت و ارسال online/offline هنگام تغییر
export function startTelemetry(opts = {}) {
  // Restart-safe: login/session transitions must not accumulate listeners.
  stopTelemetry();
  const gpsCheckMs = Math.max(15000, (opts.gpsCheckSeconds || 60) * 1000);
  const checkpointMs = 30 * 60 * 1000;
  try {
    if (NetInfo && typeof NetInfo.addEventListener === 'function') {
      netUnsubscribe = NetInfo.addEventListener((state) => {
        // Unknown network state is not evidence of Internet shutdown.
        if (state.isConnected !== true && state.isConnected !== false) return;
        // A connected Wi-Fi network without Internet is still offline.
        const on = state.isConnected === true && state.isInternetReachable !== false;
        if (on !== lastOnline) {
          lastOnline = on;
          sendTelemetry(on ? 'online' : 'offline');
          if (!on) {
            lastInternetOffCheckpoint = Date.now();
            sendTelemetry('internet_off', { transition: true });
          } else {
            sendTelemetry('internet_on', { transition: true });
            lastInternetOffCheckpoint = 0;
            flushTelemetry();
            // request() stores failed writes in its own persistent offline
            // queue. Replay that queue as well, preserving original at times.
            flushQueuedRequests({ force: true }).catch(() => {});
          }
        }
      });
    }
  } catch (e) {}

  internetTimer = setInterval(() => {
    if (lastOnline === false && Date.now() - lastInternetOffCheckpoint >= checkpointMs) {
      lastInternetOffCheckpoint = Date.now();
      sendTelemetry('internet_off', { checkpoint: true });
    }
  }, 60000);

  // پیش‌زمینه/پس‌زمینه شدن اپ (برای محاسبهٔ زمان فعالِ واقعی داخل برنامه)
  try {
    appStateSub = AppState.addEventListener('change', (st) => {
      if (st === 'active') { sendTelemetry('app_foreground'); flushTelemetry(); }
      else if (st === 'background' || st === 'inactive') { sendTelemetry('app_background'); }
    });
  } catch (e) {}
  sendTelemetry('app_foreground'); // شروع: اپ در پیش‌زمینه است

  // وضعیت GPS با فاصلهٔ تنظیم‌شده (روشن/خاموش بودن سرویس موقعیت)
  let lastGps = null;
  let lastGpsOffCheckpoint = 0;
  const checkGps = async () => {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (enabled !== lastGps) {
        lastGps = enabled;
        lastGpsOffCheckpoint = enabled ? 0 : Date.now();
        sendTelemetry(enabled ? 'gps_on' : 'gps_off', { transition: true });
      } else if (!enabled && Date.now() - lastGpsOffCheckpoint >= checkpointMs) {
        lastGpsOffCheckpoint = Date.now();
        sendTelemetry('gps_off', { checkpoint: true });
      }
      sendTelemetry('heartbeat');
    } catch (e) {}
  };
  checkGps().catch(() => {});
  gpsTimer = setInterval(checkGps, gpsCheckMs);
}

export function stopTelemetry() {
  if (gpsTimer) { clearInterval(gpsTimer); gpsTimer = null; }
  if (internetTimer) { clearInterval(internetTimer); internetTimer = null; }
  try { netUnsubscribe?.(); } catch (_) {}
  netUnsubscribe = null;
  lastOnline = null;
  lastInternetOffCheckpoint = 0;
  try { if (appStateSub) { appStateSub.remove(); appStateSub = null; } } catch (e) {}
}
