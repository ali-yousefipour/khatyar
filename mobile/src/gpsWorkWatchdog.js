import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppConfig } from './appconfig';
import * as Location from 'expo-location';
import { cachedValue, postOrQueue, request } from './api';
import { playSound } from './soundFx';

const WATCH_INTERVAL_MS = 30 * 60 * 1000;
const LAST_CHECK_KEY = 'gps_work_watchdog_last_check_v1';

async function canRunWatchdog() {
  try {
    const timer = await request('/my/work-timer', { noStore: true, timeoutMs: 7000 });
    return { required: !!timer?.gps_work_required, open: !!timer?.open };
  } catch {
    // در قطعی اینترنت، نگهبان نباید به‌دلیل نبود پاسخ سرور از کار بیفتد.
    // تنظیم GPS از کش app-config و جلسهٔ حضور از کش محلی/کش checkin خوانده می‌شود.
    try {
      const cfg = await getAppConfig(false);
      let open = false;
      try {
        const local = await AsyncStorage.getItem('attendance_local_open_v1');
        open = !!local && !!JSON.parse(local)?.check_in;
      } catch {}
      if (!open) {
        try { open = !!(await cachedValue('/my/checkin-config'))?.open; } catch {}
      }
      return { required: !!cfg?.gps_work_required, open };
    } catch {
      return { required: false, open: false };
    }
  }
}

export async function runGpsWorkWatchdog({ force = false, source = 'foreground_watchdog' } = {}) {
  const state = await canRunWatchdog();
  if (!state.required || !state.open) return { checked: false, reason: 'inactive' };

  const now = Date.now();
  if (!force) {
    try {
      const last = Number(await AsyncStorage.getItem(LAST_CHECK_KEY) || 0);
      if (last && now - last < WATCH_INTERVAL_MS) return { checked: false, reason: 'interval' };
    } catch {}
  }

  let enabled = true;
  try { enabled = await Location.hasServicesEnabledAsync(); } catch {}
  const at = new Date().toISOString();

  try { await AsyncStorage.setItem(LAST_CHECK_KEY, String(now)); } catch {}

  if (!enabled) {
    await postOrQueue('/activity/telemetry', {
      kind: 'gps_off',
      at,
      meta: {
        source,
        interval_minutes: 30,
        penalty_minutes: 30,
        independent_of_location_tracking: true,
      },
    }).catch(() => {});

    try { await playSound('gpsOff', { volume: 1 }); } catch {}
    return { checked: true, gpsEnabled: false, penaltyMinutes: 30 };
  }

  await postOrQueue('/activity/telemetry', {
    kind: 'gps_on',
    at,
    meta: { source, interval_minutes: 30, independent_of_location_tracking: true },
  }).catch(() => {});

  return { checked: true, gpsEnabled: true, penaltyMinutes: 0 };
}

// CI release trigger: offline-safe attendance watchdog validation; no location-ping interval is added.
export const GPS_WORK_WATCHDOG_INTERVAL_MS = WATCH_INTERVAL_MS;
