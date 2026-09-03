import React, { useState, useEffect, useRef } from 'react';
import { AppState, Modal } from 'react-native';
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

export default function PresenceGate() {
  const { user } = useAuth();
  const [due, setDue] = useState(null);
  const cfgRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const check = async () => {
      try {
        const cfg = await request('/my/presence-config', { auth: true, noStore: true });
        if (!alive) return;
        cfgRef.current = cfg;
        if (!cfg.enabled || !cfg.required || !(cfg.slots || []).length) { setDue(null); return; }
        if (due) return;
        const now = tehranNow();
        const win = cfg.window_minutes || 1;
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
                notify('صحت‌سنجی حضور', `لطفاً ظرف ${win} دقیقه سلفی و عکس خودروهای خط را ارسال کنید.`, { type: 'presence_check', slot: sl });
              }
              setDue({ slot: sl, windowMinutes: win, day: now.day, key }); return;
            }
          }
        }
      } catch (e) {}
    };
    check();
    pollRef.current = setInterval(check, 20000);
    return () => { alive = false; clearInterval(pollRef.current); };
  }, [user, due]);

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
    const r3 = AppState.addEventListener('change', st => { if (st === 'active') {} });
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

  return (
    <Modal visible animationType="slide" onRequestClose={() => {}}>
      <PresenceCheckModal
        slot={due.slot}
        windowMinutes={due.windowMinutes}
        onDone={finish}
        onExpire={finish}
        onStart={() => stopPresenceAlarm().catch(() => {})}
      />
    </Modal>
  );
}
