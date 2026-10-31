import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Switch, StyleSheet, Alert, RefreshControl } from 'react-native';
import { request } from '../api';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';

const TYPES = [
  ['station_exit', 'خروج از محدوده'], ['station_enter', 'ورود به محدوده'],
  ['vpn_on', 'روشن‌شدن VPN'], ['gps_off', 'خاموش‌شدن GPS'],
  ['attendance_checkin', 'ثبت ورود حضور من'], ['attendance_checkout', 'ثبت خروج حضور من'],
];
const toggle = (arr, id) => arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];

export default function FieldAlertSettingsScreen() {
  const [cfg, setCfg] = useState(null);
  const [opt, setOpt] = useState({ roles: [], users: [] });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setRefreshing(true);
    try {
      const [a, b] = await Promise.all([
        request('/my/field-alert-preferences', { noStore: true }),
        request('/my/field-alert-options', { noStore: true }),
      ]);
      if (!a || !Array.isArray(b?.roles) || !Array.isArray(b?.users)) throw new Error('پاسخ تنظیمات هشدار معتبر نیست.');
      setCfg(a);
      setOpt(b);
      setError('');
    } catch (e) { setError(e?.message || 'دریافت تنظیمات هشدار ناموفق بود.'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (busy || !cfg || error) return;
    setBusy(true);
    try {
      const saved = await request('/my/field-alert-preferences', { method: 'POST', queueIfOffline: false, body: cfg });
      if (!saved || saved.queued) throw new Error('سرور ذخیره تنظیمات را تأیید نکرد.');
      setCfg(saved);
      Alert.alert('ذخیره شد', 'فیلتر دریافت هشدارها ذخیره شد.');
    } catch (e) { Alert.alert('خطا', e?.message || 'ذخیره ناموفق بود.'); }
    finally { setBusy(false); }
  };

  if (loading && !cfg) return <View style={s.center}><ActivityIndicator size={80} /></View>;
  if (!cfg) return <View style={s.center}><Text style={s.errorText}>{error || 'تنظیمات در دسترس نیست.'}</Text><TouchableOpacity accessibilityRole="button" style={s.retry} onPress={load}><Text style={s.retryText}>تلاش مجدد</Text></TouchableOpacity></View>;

  return <ScrollView persistentScrollbar style={s.page} contentContainerStyle={s.content}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} colors={[C.brand]} />}>
    {!!error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text><TouchableOpacity accessibilityRole="button" style={s.retry} onPress={load}><Text style={s.retryText}>تلاش مجدد</Text></TouchableOpacity></View>}
    <View style={s.row}><Text style={s.h}>دریافت هشدارهای میدانی</Text><Switch value={!!cfg.enabled} onValueChange={v => setCfg({ ...cfg, enabled: v })} /></View>
    <Text style={s.sub}>نوع پیام‌های قابل دریافت</Text>
    {TYPES.map(([k, label]) => <View key={k} style={s.row}><Text style={s.txt}>{label}</Text><Switch value={!!cfg.types?.[k]} onValueChange={v => setCfg({ ...cfg, types: { ...cfg.types, [k]: v } })} /></View>)}
    <Text style={s.sub}>هشدار چه افرادی دریافت شود؟</Text>
    {[['all', 'تمام کاربران'], ['roles', 'سمت‌های خاص'], ['users', 'کاربران منتخب']].map(([k, label]) => <TouchableOpacity accessibilityRole="radio" accessibilityState={{ checked: cfg.subject_mode === k }} key={k} style={[s.choice, cfg.subject_mode === k && s.active]} onPress={() => setCfg({ ...cfg, subject_mode: k })}><Text style={s.txt}>{cfg.subject_mode === k ? '● ' : '○ '}{label}</Text></TouchableOpacity>)}
    {cfg.subject_mode === 'roles' && opt.roles.map(x => <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: (cfg.role_ids || []).includes(Number(x.id)) }} key={x.id} style={s.choice} onPress={() => setCfg({ ...cfg, role_ids: toggle(cfg.role_ids || [], Number(x.id)) })}><Text style={s.txt}>{(cfg.role_ids || []).includes(Number(x.id)) ? '☑' : '☐'} {x.title}</Text></TouchableOpacity>)}
    {cfg.subject_mode === 'users' && opt.users.map(x => <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: (cfg.user_ids || []).includes(Number(x.id)) }} key={x.id} style={s.choice} onPress={() => setCfg({ ...cfg, user_ids: toggle(cfg.user_ids || [], Number(x.id)) })}><Text style={s.txt}>{(cfg.user_ids || []).includes(Number(x.id)) ? '☑' : '☐'} {x.name} ـ {x.role_title || ''}</Text></TouchableOpacity>)}
    <TouchableOpacity accessibilityRole="button" style={[s.btn, (busy || !!error) && { opacity: 0.55 }]} onPress={save} disabled={busy || !!error}><Text style={s.btnTxt}>{busy ? 'در حال ذخیره…' : 'ذخیره تنظیمات'}</Text></TouchableOpacity>
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { backgroundColor: C.paper }, content: { padding: 18, paddingBottom: 44 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper, padding: 20 },
  h: { fontFamily: FONT.bold, fontSize: 17, color: C.ink }, sub: { fontFamily: FONT.bold, color: C.brand, textAlign: 'right', marginTop: 18, marginBottom: 8 },
  txt: { fontFamily: FONT.regular, color: C.ink, textAlign: 'right' }, row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 7, minHeight: 52 },
  choice: { backgroundColor: '#fff', padding: 13, borderRadius: 9, marginBottom: 6, borderWidth: 1, borderColor: C.line, minHeight: 46 }, active: { borderColor: C.brand, borderWidth: 2 },
  btn: { backgroundColor: C.brand, padding: 15, borderRadius: 12, marginTop: 20, minHeight: 50 }, btnTxt: { fontFamily: FONT.bold, color: '#fff', textAlign: 'center' },
  errorBox: { backgroundColor: '#fff1f1', borderColor: '#f3b8c0', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  errorText: { fontFamily: FONT.regular, color: '#982b3d', textAlign: 'right', lineHeight: 22 }, retry: { minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center', paddingHorizontal: 14, marginTop: 8 }, retryText: { fontFamily: FONT.bold, color: C.brand },
});
