import { Vibration } from 'react-native';
import { playSound, stopSound } from './soundFx';

// آلارم صحت‌سنجی حضور:
// ۱) پس از دریافت فرمان، ۵ ثانیه فرصت داده می‌شود.
// ۲) اگر کاربر برنامه/فرآیند صحت‌سنجی را باز نکرد، صدای هشدار اختصاصی به‌صورت تکرارشونده پخش می‌شود.
// ۳) با شروع صحت‌سنجی، stopPresenceAlarm صدا و لرزش را فوراً قطع می‌کند.
let soundObj = null;
let delayTimer = null;
let alarmActive = false;

const VIBRATE_PATTERN = [0, 700, 300, 700, 300, 1000];
const START_DELAY_MS = 5000;

async function beginLoopingAlarm() {
  if (!alarmActive || soundObj) return;
  try { Vibration.vibrate(VIBRATE_PATTERN, true); } catch (e) {}
  soundObj = await playSound('presenceAlert', { loop: true, volume: 1.0 });
}

export async function startPresenceAlarm() {
  if (alarmActive) return;
  alarmActive = true;
  if (delayTimer) { clearTimeout(delayTimer); delayTimer = null; }
  delayTimer = setTimeout(() => { beginLoopingAlarm().catch(() => {}); }, START_DELAY_MS);
}

export async function stopPresenceAlarm() {
  alarmActive = false;
  if (delayTimer) { clearTimeout(delayTimer); delayTimer = null; }
  try { Vibration.cancel(); } catch (e) {}
  if (soundObj) {
    const s = soundObj;
    soundObj = null;
    await stopSound(s);
  }
}
