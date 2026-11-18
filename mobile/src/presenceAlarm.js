import * as Notifications from 'expo-notifications';
import { Vibration, NativeModules } from 'react-native';
import { playSound, stopSound } from './soundFx';

// آلارم صحت‌سنجی حضور:
// ۱) پس از دریافت فرمان، ۵ ثانیه فرصت داده می‌شود.
// ۲) اگر کاربر برنامه/فرآیند صحت‌سنجی را باز نکرد، صدای هشدار اختصاصی به‌صورت تکرارشونده پخش می‌شود.
// ۳) با شروع صحت‌سنجی، stopPresenceAlarm صدا و لرزش را فوراً قطع می‌کند.
let soundObj = null;
let deadlineTimer = null;
let alarmActive = false;
let generation = 0;

const VIBRATE_PATTERN = [0, 700, 300, 700, 300, 1000];
async function beginLoopingAlarm(currentGeneration) {
  if (!alarmActive || soundObj) return;
  try { if(await NativeModules?.KhatyarRadio?.startPresenceAlarm?.())return; }catch(_){}
  try { Vibration.vibrate(VIBRATE_PATTERN, true); } catch (e) {}
  const player = await playSound('presenceAlert', { loop: true, volume: 1.0 });
  if (!alarmActive || generation !== currentGeneration) {
    await stopSound(player);
    return;
  }
  soundObj = player;
}

export async function startPresenceAlarm(deadlineMs) {
  if (Number.isFinite(deadlineMs) && deadlineMs <= Date.now()) { await stopPresenceAlarm(); return; }
  if (alarmActive) return;
  alarmActive = true;
  const currentGeneration = ++generation;
  if (deadlineTimer) clearTimeout(deadlineTimer);
  if (Number.isFinite(deadlineMs)) deadlineTimer = setTimeout(() => { stopPresenceAlarm().catch(() => {}); }, Math.max(0,deadlineMs-Date.now()));
  beginLoopingAlarm(currentGeneration).catch(() => {});
}

export async function stopPresenceAlarm({dismissNotifications=false}={}) {
  if(dismissNotifications)try{NativeModules?.KhatyarRadio?.stopPresenceAlarm?.();}catch(_){}
  alarmActive = false;
  ++generation;
  if (deadlineTimer) { clearTimeout(deadlineTimer); deadlineTimer = null; }
  try { Vibration.cancel(); } catch (e) {}
  if (soundObj) {
    const s = soundObj;
    soundObj = null;
    await stopSound(s);
  }
  try {
    const shown=dismissNotifications?await Notifications.getPresentedNotificationsAsync():[];
    await Promise.all(shown.filter(n=>n.request?.content?.data?.type==='presence_check').map(n=>Notifications.dismissNotificationAsync(n.request.identifier)));
  } catch (_) {}

}
