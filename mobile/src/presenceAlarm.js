import * as Notifications from 'expo-notifications';
import { Vibration, NativeModules } from 'react-native';
import { playSound, stopSound } from './soundFx';

// آلارم مرکزی صحت‌سنجی حضور:
// ۱) هم‌زمان با فعال‌شدن مهلت درخواست، بدون تأخیر شروع می‌شود.
// ۲) پخش تکرارشونده تا تأیید آماده‌بودن ویزارد یا انقضای مهلت ادامه دارد.
// ۳) فقط acknowledgement واقعی ویزارد، اتمام یا انقضا منابع صوتی را آزاد می‌کند.
let soundObj = null;
let deadlineTimer = null;
let alarmActive = false;
let generation = 0;
let activeDeadlineMs = 0;

const VIBRATE_PATTERN = [0, 700, 300, 700, 300, 1000];
async function beginLoopingAlarm(currentGeneration) {
  if (!alarmActive || soundObj) return;
  try {
    if(await NativeModules?.KhatyarRadio?.startPresenceAlarm?.(activeDeadlineMs||Date.now()+180000)){ 
      if(!alarmActive)NativeModules?.KhatyarRadio?.stopPresenceAlarm?.();
      return;
    }
  }catch(_){}
  if(!alarmActive||generation!==currentGeneration)return;
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
  activeDeadlineMs=Number.isFinite(deadlineMs)?deadlineMs:0;
  alarmActive = true;
  const currentGeneration = ++generation;
  if (deadlineTimer) clearTimeout(deadlineTimer);
  if (Number.isFinite(deadlineMs)) deadlineTimer = setTimeout(() => { stopPresenceAlarm({dismissNotifications:true}).catch(() => {}); }, Math.max(0,deadlineMs-Date.now()));
  beginLoopingAlarm(currentGeneration).catch(() => {});
}

export async function stopPresenceAlarm({dismissNotifications=false}={}) {
  // No due challenge during initial JS hydration is not proof that the
  // notification-started native alarm is obsolete. Only a wizard readiness,
  // completion, expiration or explicit account reset can dismiss it.
  if(dismissNotifications)try{await NativeModules?.KhatyarRadio?.stopPresenceAlarm?.();}catch(_){} 
  alarmActive = false;
  activeDeadlineMs = 0;
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
