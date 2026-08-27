import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiBase } from './config';
import { loadTokens, request, flushQueuedRequests } from './api';
import { clearAppConfigCache, getAppConfig } from './appconfig';
import { refreshSearchCache } from './linecache';
import { FONT } from './theme';
import { faNum } from './num';
import * as Application from 'expo-application';

const MAINTENANCE_CACHE_KEY = 'startup_maintenance_status_v1';
const startupVersion = Application.nativeApplicationVersion || '1.3.74';

async function readMaintenanceStatus() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const response = await fetch(`${apiBase()}/system/maintenance-status?_=${Date.now()}`, {
      headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const data = await response.json();
    if (!response.ok || !data || typeof data !== 'object') throw new Error('maintenance_status_invalid');
    const normalized = {
      enabled: !!data.enabled,
      message: String(data.message || ''),
      checked_at: Date.now(),
    };
    await AsyncStorage.setItem(MAINTENANCE_CACHE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch (_) {
    // هنگام اختلال شبکه، آخرین وضعیت معتبر ذخیره‌شده ملاک قرار می‌گیرد.
    try {
      const raw = await AsyncStorage.getItem(MAINTENANCE_CACHE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { enabled: false, message: '', unavailable: true };
  }
}

async function clearServerDataCache() {
  const keys = await AsyncStorage.getAllKeys();
  const removable = keys.filter((key) =>
    key.startsWith('cache:') ||
    key === 'app_config_v1' ||
    key === 'search_cache_v1'
  );
  if (removable.length) await AsyncStorage.multiRemove(removable);
  clearAppConfigCache();
}

export default function StartupGate({ children }) {
  const [phase, setPhase] = useState('در حال بررسی وضعیت سامانه…');
  const [progress, setProgress] = useState(4);
  const [ready, setReady] = useState(false);
  const [maintenance, setMaintenance] = useState(null);
  const [retrying, setRetrying] = useState(false);

  const run = useCallback(async () => {
    const startedAt = Date.now();
    setReady(false);
    setMaintenance(null);
    setProgress(4);

    setPhase('در حال بررسی وضعیت سامانه…');
    const status = await readMaintenanceStatus();
    setProgress(15);
    if (status.enabled) {
      setMaintenance(status);
      return;
    }

    setPhase('در حال به‌روزرسانی اطلاعات برنامه…');
    try {
      await loadTokens();
      setProgress(30);
      await clearServerDataCache();
      setProgress(40);
      // پیکربندی عمومی/شخصی برنامه از سرور دوباره دریافت می‌شود.
      await getAppConfig(true).catch(() => null);
      setProgress(55);
      await refreshSearchCache(true).catch(() => null);
      setProgress(65);
      // در صورت وجود نشست، دادهٔ کاربر نیز بدون استفاده از کش تازه می‌شود.
      await request('/auth/me', { noStore: true }).catch(() => null);
      setProgress(75);
    } catch (_) {}

    setPhase('در حال ارسال اطلاعات ذخیره‌شده…');
    try {
      // فقط مواردی که سرور موفقیت آن‌ها را تأیید کند از صف حذف می‌شوند.
      await flushQueuedRequests();
    } catch (_) {}
    setProgress(90);

    setPhase('در حال آماده‌سازی برنامه…');
    const remain = Math.max(0, 5000 - (Date.now() - startedAt));
    if (remain) await new Promise(resolve => setTimeout(resolve, remain));
    setProgress(100);
    setReady(true);
  }, []);

  useEffect(() => { run(); }, [run]);

  const retry = async () => {
    setRetrying(true);
    await run();
    setRetrying(false);
  };

  if (maintenance?.enabled) {
    return (
      <View style={s.maintenanceWrap}>
        <Image source={require('../assets/khatyar-startup.png')} style={s.maintenanceBg} resizeMode="cover" />
        <View style={s.shade} />
        <View style={s.maintenanceCard}>
          <Text style={s.maintenanceIcon}>🛠️</Text>
          <Text style={s.maintenanceTitle}>سامانه در حالت تعمیر است</Text>
          <Text style={s.maintenanceText}>
            {maintenance.message || 'نرم‌افزار موقتاً در دسترس نیست. لطفاً بعداً دوباره تلاش کنید.'}
          </Text>
          <TouchableOpacity style={s.retryButton} onPress={retry} disabled={retrying}>
            <Text style={s.retryText}>{retrying ? 'در حال بررسی…' : 'بررسی مجدد'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={s.wrap}>
        <Image source={require('../assets/khatyar-startup.png')} style={s.image} resizeMode="cover" />
        <View style={s.loadingPanel}>
          <ProgressBar percent={progress} />
          <Text style={s.progressLabel}>{faNum(Math.round(progress))}٪</Text><Text style={s.version}>نسخه برنامه: {faNum(startupVersion)}</Text>
          <Text style={s.phase}>{phase}</Text>
        </View>
      </View>
    );
  }

  return children ? <>{children}</> : null;
}

// نوار پیشرفت صفر تا صد به‌جای نشانگر چرخشی (spinner) قبلی — کاربر دقیقاً می‌بیند
// بارگذاری برنامه چند درصد پیش رفته است، نه فقط یک انیمیشن نامشخصِ در حال چرخش.
function ProgressBar({ percent }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.max(0, Math.min(100, percent)),
      duration: 350,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [percent]);
  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View style={s.progressTrack}>
      <Animated.View style={[s.progressFill, { width }]} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#08664f' },
  image: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  loadingPanel: {
    position: 'absolute', left: 22, right: 22, bottom: 38,
    minHeight: 88, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 18,
    backgroundColor: 'rgba(0, 45, 35, 0.78)', alignItems: 'center', justifyContent: 'center',
  },
  phase: { marginTop: 10, color: '#fff', fontFamily: FONT.bold, fontSize: 14, textAlign: 'center' },
  progressTrack: { width: '100%', height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#ffffff' },
  version: { marginTop: 5, color: 'rgba(255,255,255,.88)', fontFamily: FONT.regular, fontSize: 11 },
  progressLabel: { marginTop: 8, color: '#fff', fontFamily: FONT.bold, fontSize: 13 },
  maintenanceWrap: { flex: 1, backgroundColor: '#063f33', alignItems: 'center', justifyContent: 'center' },
  maintenanceBg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 30, 24, 0.74)' },
  maintenanceCard: {
    marginHorizontal: 24, width: '88%', borderRadius: 22, padding: 24,
    backgroundColor: 'rgba(255,255,255,0.96)', alignItems: 'center',
  },
  maintenanceIcon: { fontSize: 48, marginBottom: 10 },
  maintenanceTitle: { fontFamily: FONT.bold, color: '#9b1c1c', fontSize: 20, textAlign: 'center' },
  maintenanceText: { fontFamily: FONT.regular, color: '#344054', fontSize: 14, lineHeight: 25, textAlign: 'center', marginTop: 12 },
  retryButton: { marginTop: 20, width: '100%', borderRadius: 12, paddingVertical: 14, backgroundColor: '#08745a', alignItems: 'center' },
  retryText: { fontFamily: FONT.bold, color: '#fff', fontSize: 15 },
});
