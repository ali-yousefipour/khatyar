import React, { useState, useEffect, useRef } from 'react';
import { AppState, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from './api';
import { notify } from './notify';
import { useAuth } from './auth';
import PresenceCheckModal from './PresenceCheckModal';
import { startPresenceAlarm, stopPresenceAlarm } from './presenceAlarm';
import * as Notifications from 'expo-notifications';
import { tehranGregorianParts } from './jdate';

function tehranNow() {
  const p = tehranGregorianParts(new Date());
  if (!p) {
    const d = new Date();
    return { day: d.toISOString().slice(0, 10), minutes: d.getHours() * 60 + d.getMinutes() };
  }
  return {
    day: `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`,
    minutes: p.hour * 60 + p.minute,
  };
}

function slotToMinutes(s) { const m = /^(\d{2}):(\d{2})$/.exec(s); return m ? (+m[1]) * 60 + (+m[2]) : -1; }

function nextSlotDelayMs(nowMinutes, slotMinutes) {
  let delta = slotMinutes - nowMinutes;
  if (delta <= 0) delta += 24 * 60;
  return delta * 60 * 1000;
}

async function ensurePresenceChannel() {
  try {
    await Notifications.setNotificationChannelAsync('presence_alarm', {
      name: 'هشدار صحت‌سنجی حضور',
      description: 'هشدارهای الزامی صحت‌سنجی حضور',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'presence_validation_alert.mp3',
      vibrationPattern: [0, 700, 300, 700, 300, 1000],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      enableVibrate: true,
      enableLights: true,
    });
  } catch (_e) {}
}

async function scheduleNextPresenceSlots(cfg) {
  if (!cfg?.enabled || !cfg?.required || !(cfg.slots || []).length) return;
  await ensurePresenceChannel();
  const now = tehranNow();
  const win = Number(cfg.window_minutes || 1);

  for (const sl of cfg.slots) {
    const sm = slotToMinutes(sl);
    if (sm < 0) continue;
    // اگر پنجره فعلی باز است، check() همان لحظه هشدار را می‌فرستد.
    // برای هر نوبت بعدی یک اعلان واقعی Android زمان‌بندی می‌کنیم تا حتی در
    // صورت بسته/پس‌زمینه/خاموش بودن صفحه نیز سیستم‌عامل هشدار را اجرا کند.
    const delay = nextSlotDelayMs(now.minutes, sm);
    const targetDayOffset = now.minutes < sm ? 0 : 1;
    const target = new Date(Date.now() + delay);
    const targetDayKey = `${now.day}:${targetDayOffset}:${sl}`;
    const storageKey = `presence_scheduled:${targetDayKey}`;
    if (await AsyncStorage.getItem(storageKey)) continue;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'صحت‌سنجی حضور',
          body: `لطفاً ظرف ${win} دقیقه سلفی و عکس خودروهای خط را ارسال کنید.`,
          sound: 'presence_validation_alert.mp3',
          priority: Notifications.AndroidNotificationPriority.MAX,
          channelId: 'presence_alarm',
          data: { type: 'presence_check', slot: sl, window_minutes: win, scheduled: true },
        },
        trigger: target,
      });
      await AsyncStorage.setItem(storageKey, '1');
    } catch (_e) {}
  }
}

export default function PresenceGate() {
  const { user } = useAuth();
  const [due, setDue] = useState(null);
  const cfgRef = useRef(null);
  const pollRef = useRef(null);
  const dueRef = useRef(null);

  useEffect(() => { dueRef.current = due; }, [due]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const check = async () => {
      try {
        const cfg = await request('/my/presence-config', { auth: true, noStore: true });
        if (!alive) return;
        cfgRef.current = cfg;
        await scheduleNextPresenceSlots(cfg);
        if (!cfg.enabled || !cfg.required || !(cfg.slots || []).length) { setDue(null); return; }
        if (dueRef.current) return;
        const now = tehranNow();
        const win = Number(cfg.window_minutes || 1);
        for (const sl of cfg.slots) {
          const sm = slotToMinutes(sl);
          if (sm < 0) continue;
          if (now.minutes >= sm && now.minutes < sm + win) {
            const key = `presence_done:${now.day}:${sl}`;
            const done = await AsyncStorage.getItem(key);
            if (!done) {
              const notifKey = `presence_notified:${now.day}:${sl}`;
              const already = await AsyncStorage.getItem(notifKey);
              if (!already) {
                await AsyncStorage.setItem(notifKey, '1');
                await notify('صحت‌سنجی حضور', `لطفاً ظرف ${win} دقیقه سلفی و عکس خودروهای خط را ارسال کنید.`, { type: 'presence_check', slot: sl, window_minutes: win, immediate: true });
              }
              setDue({ slot: sl, windowMinutes: win, day: now.day, key });
              return;
            }
          }
        }
      } catch (e) {}
    };
    check();
    pollRef.current = setInterval(check, 20000);
    return () => { alive = false; clearInterval(pollRef.current); };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const openFromNotification = async (data = {}) => {
      if (!data || data.type !== 'presence_check') return;
      const immediate = data.immediate === true || data.immediate === 'true' || data.immediate === 1 || data.immediate === '1';
      const cfg = cfgRef.current || {};
      const now = tehranNow();
      const sl = data.slot || ((cfg.slots || [])[0]) || `${String(Math.floor(now.minutes / 60)).padStart(2, '0')}:${String(now.minutes % 60).padStart(2, '0')}`;
      const key = immediate
        ? `presence_immediate_done:${now.day}:${data.request_id || Date.now()}`
        : `presence_done:${now.day}:${sl}`;
      if (!immediate) {
        const done = await AsyncStorage.getItem(key);
        if (done) return;
      }
      setDue({ slot: sl, windowMinutes: Number(data.window_minutes || cfg.window_minutes || 1), day: now.day, key, immediate });
    };

    const r1 = Notifications.addNotificationReceivedListener(n => openFromNotification(n?.request?.content?.data || {}).catch(()=>{}));
    const r2 = Notifications.addNotificationResponseReceivedListener(r => openFromNotification(r?.notification?.request?.content?.data || {}).catch(()=>{}));

    // اگر کاربر با لمس هشدار از حالت قفل/بسته بودن برنامه وارد شد،
    // آخرین پاسخ ناتیفیکیشن را هم بررسی می‌کنیم تا صفحه حضور از دست نرود.
    Notifications.getLastNotificationResponseAsync()
      .then(r => openFromNotification(r?.notification?.request?.content?.data || {}))
      .catch(() => {});

    const r3 = AppState.addEventListener('change', st => {
      if (st === 'active' && !dueRef.current) {
        // بلافاصله پس از بازگشت از lockscreen وضعیت حضور را دوباره بررسی می‌کنیم.
        request('/my/presence-config', { auth: true, noStore: true }).then(async cfg => {
          cfgRef.current = cfg;
          await scheduleNextPresenceSlots(cfg);
          const now = tehranNow();
          const win = Number(cfg.window_minutes || 1);
          for (const sl of (cfg.slots || [])) {
            const sm = slotToMinutes(sl);
            if (sm >= 0 && now.minutes >= sm && now.minutes < sm + win) {
              const key = `presence_done:${now.day}:${sl}`;
              if (!(await AsyncStorage.getItem(key))) {
                setDue({ slot: sl, windowMinutes: win, day: now.day, key });
                break;
              }
            }
          }
        }).catch(() => {});
      }
    });
    return () => { try { r1.remove(); } catch(e) {} try { r2.remove(); } catch(e) {} try { r3.remove(); } catch(e) {} };
  }, [user]);

  useEffect(() => {
    const alarmOn = cfgRef.current ? cfgRef.current.alarm !== false : true;
    if (due && alarmOn) { startPresenceAlarm().catch(() => {}); }
    else { stopPresenceAlarm().catch(() => {}); }
    return () => { stopPresenceAlarm().catch(() => {}); };
  }, [due]);

  if (!due) return null;

  const finish = async () => {
    try { await stopPresenceAlarm(); } catch (e) {}
    try { await AsyncStorage.setItem(due.key, '1'); } catch (e) {}
    setDue(null);
  };

  // این لایه عمداً داخل React Native Modal قرار نمی‌گیرد؛ در Android، Modal
  // تو در تو ممکن است ارتفاع محدود ایجاد کند و مرحله تأیید خودرو را نصفه نمایش دهد.
  return (
    <View style={styles.fullscreenOverlay} pointerEvents="box-none">
      <View style={styles.fullscreenContent}>
        <PresenceCheckModal
          slot={due.slot}
          windowMinutes={due.windowMinutes}
          onDone={finish}
          onExpire={finish}
          onStart={() => stopPresenceAlarm().catch(() => {})}
        />
      </View>
    </View>
  );
}

const styles = {
  fullscreenOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100000,
    elevation: 100000,
    backgroundColor: '#000',
  },
  fullscreenContent: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
};
