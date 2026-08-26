import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState, Platform } from 'react-native';
import * as Battery from 'expo-battery';
import * as IntentLauncher from 'expo-intent-launcher';
import { C, FONT } from './theme';

// در نسخه انتشار، بهینه‌سازی باتری مانع ورود به برنامه نمی‌شود.
// فقط یک هشدار قابل‌بستن نمایش داده می‌شود تا کاربر در صورت نیاز به ردیابی پس‌زمینه آن را اصلاح کند.
export default function BatteryGuard({ children }) {
  const [showHint, setShowHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const check = useCallback(async () => {
    if (Platform.OS !== 'android' || dismissed) return;
    try {
      const optimized = await Battery.isBatteryOptimizationEnabledAsync().catch(() => false);
      const state = await Battery.getPowerStateAsync().catch(() => null);
      setShowHint(Boolean(optimized || state?.lowPowerMode));
    } catch (_) {
      setShowHint(false);
    }
  }, [dismissed]);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  async function openSettings() {
    try {
      await IntentLauncher.startActivityAsync('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
    } catch (_) {
      try { await IntentLauncher.startActivityAsync('android.settings.BATTERY_SAVER_SETTINGS'); } catch (_) {}
    }
  }

  return (
    <View style={s.root}>
      {children}
      {showHint && !dismissed ? (
        <View style={s.hint} accessibilityRole="alert">
          <Text style={s.title}>بهینه‌سازی باتری فعال است</Text>
          <Text style={s.body}>ممکن است ثبت موقعیت در پس‌زمینه متوقف شود. استفاده عادی از برنامه محدود نمی‌شود.</Text>
          <View style={s.actions}>
            <TouchableOpacity style={s.primary} onPress={openSettings}><Text style={s.primaryText}>تنظیمات باتری</Text></TouchableOpacity>
            <TouchableOpacity style={s.secondary} onPress={() => setDismissed(true)}><Text style={s.secondaryText}>بعداً</Text></TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  hint: { position: 'absolute', left: 12, right: 12, bottom: 18, backgroundColor: '#fff8e1', borderWidth: 1, borderColor: '#f2c94c', borderRadius: 14, padding: 14, elevation: 6 },
  title: { fontFamily: FONT.bold, color: C.ink, fontSize: 15, textAlign: 'right' },
  body: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, lineHeight: 20, marginTop: 6, textAlign: 'right' },
  actions: { flexDirection: 'row-reverse', gap: 8, marginTop: 10 },
  primary: { backgroundColor: C.brand, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  primaryText: { color: '#fff', fontFamily: FONT.bold, fontSize: 12 },
  secondary: { borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  secondaryText: { color: C.muted, fontFamily: FONT.bold, fontSize: 12 },
});
