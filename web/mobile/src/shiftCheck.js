/**
 * بررسی اینکه آیا الان در ساعت شیفت کاری کاربر هستیم.
 * اگر activity_mode = 'always' باشد همیشه true برمی‌گردد.
 * اگر activity_mode = 'shift_only' باشد، زمان فعلی با شیفت مقایسه می‌شود.
 */
import { getAppConfig } from './appconfig';

// نام روزهای شمسی
const DAYS = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
// روز هفتهٔ شمسی از تاریخ میلادی (شنبه=0)
function jDayOfWeek(date) {
  const dow = date.getDay(); // 0=Sun, 6=Sat
  return (dow + 1) % 7; // شنبه=0
}
function timeToMins(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export async function isInShift() {
  try {
    const cfg = await getAppConfig();
    if (!cfg) return true;
    if ((cfg.activity_mode || 'always') === 'always') return true;
    // shift_only: بررسی شیفت کاربر
    const shift = cfg.user_shift;
    if (!shift) return false; // اگر شیفت تعریف نشده، محافظه‌کارانه false
    const now = new Date();
    const curMins = now.getHours() * 60 + now.getMinutes();
    const dow = jDayOfWeek(now); // 0=شنبه
    if (shift.type === 'simple' && shift.weekly) {
      // شیفت ساده: weekly یک آبجکت از نام روز به [{from,to}] است
      const dayKeys = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];
      const dayKey = dayKeys[dow];
      const slots = shift.weekly[dayKey];
      if (!slots || !slots.length) return false;
      return slots.some((s) => curMins >= timeToMins(s.from) && curMins <= timeToMins(s.to));
    }
    if (shift.type === 'floating') {
      // شیفت شناور: ۸ ساعت در هر روز کاری (محدودهٔ پیش‌فرض ۷ تا ۱۹)
      return curMins >= 7 * 60 && curMins <= 19 * 60;
    }
    return true;
  } catch { return true; } // در صورت خطا، فعال باشد
}
