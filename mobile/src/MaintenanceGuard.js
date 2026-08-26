/**
 * نگهبان حالت تعمیر — هر ۳۰ ثانیه و هنگام بازگشت به اپ بررسی می‌کند که آیا
 * مدیر سیستم «حالت تعمیر» را فعال کرده است یا نه. در صورت فعال بودن، برای
 * همهٔ کاربران به‌جز سمت‌های مدیریتی، یک صفحهٔ هشدار تمام‌صفحه با پیام
 * قابل‌ویرایش نمایش داده می‌شود و ادامهٔ استفاده از اپ مسدود می‌شود.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import { C, FONT } from './theme';
import { useAuth } from './auth';
import { apiBase } from './config';

const CHECK_INTERVAL_MS = 30 * 1000; // هر ۳۰ ثانیه

export default function MaintenanceGuard({ children }) {
  const { user } = useAuth();
  const isAdmin = !!user?.is_admin;
  // این گارد فقط برای کاربران ازقبل واردشده فعال است؛ صفحهٔ ورود هرگز مسدود
  // نمی‌شود تا مدیر بتواند با اعتبار خودش وارد شده و حالت تعمیر را خاموش کند.
  // مسدودسازی ورود کاربران غیرمدیر توسط خود API لاگین انجام می‌شود.
  const active = !!user && !isAdmin;
  const [status, setStatus] = useState(null); // {enabled, message}
  const [checking, setChecking] = useState(false);
  const timerRef = useRef(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase()}/system/maintenance-status`);
      const data = await res.json();
      setStatus(data && typeof data === 'object' ? data : null);
    } catch {
      // در صورت خطای شبکه، وضعیت فعلی حفظ می‌شود؛ در چرخهٔ بعدی دوباره تلاش می‌شود
    }
  }, []);

  useEffect(() => {
    if (!active) { setStatus(null); return undefined; }
    check();
    timerRef.current = setInterval(check, CHECK_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    return () => { clearInterval(timerRef.current); sub.remove(); };
  }, [check, active]);

  const recheck = async () => {
    setChecking(true);
    await check();
    setChecking(false);
  };

  if (!active || !status?.enabled) return children ? <>{children}</> : null;

  return (
    <View style={s.overlay}>
      <Text style={s.icon}>🛠️</Text>
      <Text style={s.title}>نرم‌افزار موقتاً در دسترس نیست</Text>
      <Text style={s.sub}>{status.message || 'نرم‌افزار و پنل موقتاً برای تعمیرات غیرفعال است. لطفاً بعداً تلاش کنید.'}</Text>
      <TouchableOpacity style={s.btn} onPress={recheck} disabled={checking}>
        <Text style={s.btnTxt}>{checking ? 'در حال بررسی…' : '🔄 بررسی مجدد'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { position: 'absolute', inset: 0, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0e141f', alignItems: 'center', justifyContent: 'center', padding: 28, zIndex: 9999 },
  icon: { fontSize: 56, marginBottom: 14 },
  title: { fontFamily: FONT.bold, color: '#fff', fontSize: 18, textAlign: 'center', marginBottom: 10 },
  sub: { fontFamily: FONT.regular, color: '#9aa6bd', fontSize: 14, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  btn: { backgroundColor: '#0d7a5f', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 36, width: '100%', alignItems: 'center' },
  btnTxt: { fontFamily: FONT.bold, color: '#fff', fontSize: 15 },
});
