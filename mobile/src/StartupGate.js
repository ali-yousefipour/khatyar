import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiBase } from './config';
import { loadTokens, request, flushQueuedRequests } from './api';
import { getAppConfig } from './appconfig';
import { refreshSearchCache } from './linecache';
import { FONT } from './theme';
import { faNum } from './num';
import * as Application from 'expo-application';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Network from 'expo-network';

const MAINTENANCE_CACHE_KEY = 'startup_maintenance_status_v1';
const startupVersion = Application.nativeApplicationVersion || '1.3.74';

async function readMaintenanceStatus() {
  try {
    const net=await Network.getNetworkStateAsync().catch(()=>null);
    if(net?.isConnected===false||net?.isInternetReachable===false)throw new Error('offline');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
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
      // داده‌های احراز هویت و فهرست‌های ذخیره‌شده در شروع برنامه پاک نشوند؛
      // بدون اینترنت، نسخهٔ محلی باید در دسترس بماند.
      setProgress(40);
      // تازه‌سازی به‌صورت پس‌زمینه؛ صفحهٔ شروع منتظر دانلود فایل‌ها نیست.
      const net=await Network.getNetworkStateAsync().catch(()=>null);
      if(net?.isConnected!==false&&net?.isInternetReachable!==false){
        getAppConfig(true).catch(()=>null);
        refreshSearchCache(true).catch(()=>null);
        request('/auth/me',{noStore:true,timeoutMs:5000}).catch(()=>null);
      }
      setProgress(55);
      setProgress(65);
      setProgress(75);
    } catch (_) {}

    setPhase('در حال آماده‌سازی همگام‌سازی…');
    // ارسال صف ممکن است برای هر مورد تا پایان timeout شبکه یا بارگذاری تصویر طول بکشد.
    // شروع برنامه نباید منتظر تمام‌شدن صف بماند؛ فقط پاسخ تأییدشده سرور
    // در offline.flush از صف حذف می‌شود و سرویس App نیز ارسال را پیگیری می‌کند.
    flushQueuedRequests().catch(() => {});
    setProgress(90);

    setPhase('در حال آماده‌سازی برنامه…');
    const remain = Math.max(0, 1500 - (Date.now() - startedAt));
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
          <View style={s.maintenanceIcon}><MaterialCommunityIcons name="tools" size={30} color="#9b1c1c" /></View>
          <Text style={s.maintenanceTitle}>سامانه در حالت تعمیر است</Text>
          <Text style={s.maintenanceText}>
            {maintenance.message || 'نرم‌افزار موقتاً در دسترس نیست. لطفاً بعداً دوباره تلاش کنید.'}
          </Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="بررسی مجدد وضعیت سامانه" accessibilityState={{disabled:retrying}} style={s.retryButton} onPress={retry} disabled={retrying}>
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
        <View style={s.loadingPanel} accessibilityRole="progressbar" accessibilityLabel={phase} accessibilityValue={{min:0,max:100,now:Math.round(progress)}}>
          <View style={s.panelHead}>
            <View style={s.brandIcon}><MaterialCommunityIcons name="taxi" size={23} color="#073d33" /></View>
            <View style={s.panelTitles}><Text style={s.brandTitle}>خطیار</Text><Text style={s.brandSubtitle}>در حال آماده‌سازی محیط کاری شما</Text></View>
            <Text style={s.progressLabel}>{faNum(Math.round(progress))}٪</Text>
          </View>
          <ProgressBar percent={progress} />
          <Text style={s.phase}>{phase}</Text>
          <View style={s.panelFooter}><MaterialCommunityIcons name="shield-check-outline" size={14} color="#c8e9dc" /><Text style={s.version}>نسخه {faNum(startupVersion)} · اتصال امن</Text></View>
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
    position: 'absolute', left: 20, right: 20, bottom: 36,
    minHeight: 158, borderRadius: 24, paddingVertical: 19, paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 45, 35, 0.91)', borderWidth:1, borderColor:'rgba(255,255,255,0.23)',
    justifyContent: 'center',
  },
  panelHead:{flexDirection:'row-reverse',alignItems:'center',gap:11,marginBottom:18},
  brandIcon:{width:44,height:44,borderRadius:15,backgroundColor:'#f9d978',alignItems:'center',justifyContent:'center'},
  panelTitles:{flex:1,alignItems:'flex-end'},
  brandTitle:{color:'#fff',fontFamily:FONT.bold,fontSize:18,textAlign:'right'},
  brandSubtitle:{color:'#d1e9e0',fontFamily:FONT.regular,fontSize:11,textAlign:'right',marginTop:2},
  phase: { marginTop: 13, color: '#fff', fontFamily: FONT.bold, fontSize: 13, textAlign: 'right', writingDirection:'rtl' },
  progressTrack: { width: '100%', height: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#f9d978' },
  panelFooter:{flexDirection:'row-reverse',alignItems:'center',gap:6,marginTop:12},
  version: { color: '#d1e9e0', fontFamily: FONT.regular, fontSize: 11 },
  progressLabel: { color: '#f9d978', fontFamily: FONT.bold, fontSize: 18 },
  maintenanceWrap: { flex: 1, backgroundColor: '#063f33', alignItems: 'center', justifyContent: 'center' },
  maintenanceBg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 30, 24, 0.74)' },
  maintenanceCard: {
    marginHorizontal: 24, width: '88%', borderRadius: 22, padding: 24,
    backgroundColor: 'rgba(255,255,255,0.96)', alignItems: 'center',
  },
  maintenanceIcon: { width:56,height:56,borderRadius:18,backgroundColor:'#fee9e7',alignItems:'center',justifyContent:'center',marginBottom:10 },
  maintenanceTitle: { fontFamily: FONT.bold, color: '#9b1c1c', fontSize: 20, textAlign: 'center' },
  maintenanceText: { fontFamily: FONT.regular, color: '#344054', fontSize: 14, lineHeight: 25, textAlign: 'center', marginTop: 12 },
  retryButton: { marginTop: 20, width: '100%', borderRadius: 12, paddingVertical: 14, backgroundColor: '#08745a', alignItems: 'center' },
  retryText: { fontFamily: FONT.bold, color: '#fff', fontSize: 15 },
});
