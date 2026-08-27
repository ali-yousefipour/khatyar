/**
 * صرفه‌جویی باتری: کنترل کامل روشن/خاموش‌بودنِ ردیابی موقعیت بر اساس شیفت کاری.
 *
 * قبلاً حتی در ساعات خارج از شیفت (وقتی تنظیم «activity_mode=shift_only» فعال بود)،
 * ماژول ردیابی پس‌زمینه هم‌چنان روشن می‌ماند و فقط داده‌های دریافتی قبل از ارسال به
 * سرور دور ریخته می‌شدند — یعنی گیرندهٔ GPS دستگاه هم‌چنان به‌طور مداوم فعال و پرمصرف
 * باقی می‌ماند. این ماژول به‌جای آن، خودِ ردیابی را در ساعات غیرشیفت کاملاً خاموش
 * می‌کند و با شروع شیفت دوباره روشن می‌کند — صرفه‌جویی واقعی باتری.
 *
 * برای سازمان‌هایی که از حالت پیش‌فرض («always» یعنی ردیابی همیشگی) استفاده می‌کنند،
 * این ماژول هیچ کاری انجام نمی‌دهد و رفتار قبلی برنامه دقیقاً حفظ می‌شود.
 */
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './auth';
import { getAppConfig } from './appconfig';
import { isInShift } from './shiftCheck';
import { startTracking, stopTracking, isTrackingActive } from './location';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // هر ۵ دقیقه کافی است؛ محاسبهٔ isInShift سبک است

export default function ShiftTrackingGate() {
  const { user } = useAuth();
  const timerRef = useRef(null);

  useEffect(() => {
    if (!user) return undefined;
    let alive = true;

    const check = async () => {
      if (!alive) return;
      try {
        const cfg = await getAppConfig(true).catch(() => null);
        // فقط برای حالت «فقط در ساعت شیفت» این منطق اعمال می‌شود؛ در غیر این صورت
        // رفتار قبلی (ردیابیِ همیشه فعال از زمان ورود تا خروج) دست‌نخورده می‌ماند.
        if (!cfg || (cfg.activity_mode || 'always') !== 'shift_only') return;
        const [inShift, active] = await Promise.all([
          isInShift().catch(() => true),
          isTrackingActive().catch(() => true),
        ]);
        if (!alive) return;
        if (inShift && !active) { try { await startTracking(); } catch (e) {} }
        else if (!inShift && active) { try { await stopTracking(); } catch (e) {} }
      } catch (e) {}
    };

    check();
    timerRef.current = setInterval(check, CHECK_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });

    return () => {
      alive = false;
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      try { sub.remove(); } catch (_) {}
    };
  }, [user?.id]);

  return null;
}
