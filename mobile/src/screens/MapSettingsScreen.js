import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C as CC, FONT } from '../theme';
import { faNum } from '../num';
import { isTileCached, cacheMashhadTiles, loadLocalTilesAround } from '../mapCache';
import { getAppConfig } from '../appconfig';
import ActivityIndicator from '../components/PulseLoadingIndicator';

const PROVIDERS = [
  ['osm', 'OpenStreetMap (پیش‌فرض، رایگان)'],
  ['google', 'گوگل'],
  ['neshan', 'نشان'],
];
const MODES = [
  ['smart', 'هوشمند (آفلاین در نبود اینترنت، آنلاین در دسترس‌بودن)'],
  ['online', 'فقط آنلاین'],
  ['offline', 'فقط آفلاین (از نقشهٔ دانلودشده)'],
];

export default function MapSettingsScreen() {
  const [provider, setProvider] = useState('osm');
  const [mode, setMode] = useState('smart');
  const [cached, setCached] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(null); // {done,total}
  const [neshanKey, setNeshanKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('map_offline_provider').then((v) => {
      if (v && PROVIDERS.some(([key]) => key === v)) setProvider(v);
      return isTileCached(v || 'osm');
    }).then(setCached).catch(() => setError('بارگذاری تنظیمات نقشه انجام نشد.'));
    AsyncStorage.getItem('map_offline_mode').then((v) => {
      if (v && MODES.some(([key]) => key === v)) setMode(v);
    }).catch(() => setError('بارگذاری حالت نقشه انجام نشد.'));
    getAppConfig().then((c) => setNeshanKey((c && c.neshan_api_key) || '')).catch(() => {});
  }, []);

  const saveProvider = async (p) => {
    if (saving || downloading || provider === p) return;
    setSaving(true); setError('');
    try {
      await AsyncStorage.setItem('map_offline_provider', p);
      setProvider(p);
      setCached(await isTileCached(p));
    } catch (_) { setError('ذخیرهٔ سرویس نقشه انجام نشد. دوباره تلاش کنید.'); }
    finally { setSaving(false); }
  };
  const saveMode = async (m) => {
    if (saving || downloading || mode === m) return;
    setSaving(true); setError('');
    try { await AsyncStorage.setItem('map_offline_mode', m); setMode(m); }
    catch (_) { setError('ذخیرهٔ حالت نقشه انجام نشد. دوباره تلاش کنید.'); }
    finally { setSaving(false); }
  };

  async function testOffline() {
    try { const t=await loadLocalTilesAround(36.297,59.606,15,1); const n=Object.keys(t).length; Alert.alert(n>0?'آماده استفاده':'نقشه ناقص', n>0?`${faNum(n)} تایل نمونه از حافظه خوانده شد. نقشه آفلاین قابل استفاده است.`:'تایل محلی خوانده نشد؛ نقشه را دوباره دانلود کنید.'); } catch(e){ Alert.alert('خطا','آزمون نقشه آفلاین ناموفق بود.'); }
  }

  async function download() {
    if (downloading || saving) return;
    setDownloading(true); setProgress({ done: 0, total: 1 });
    try {
      const r = await cacheMashhadTiles(
        (done, total) => setProgress({ done, total }),
        provider, neshanKey,
      );
      const available = await isTileCached(provider);
      setCached(available);
      Alert.alert(available ? 'دانلود کامل شد' : 'دانلود ناقص', available ? `${faNum(r.saved)} تایل نقشه ذخیره شد و در حالت آفلاین قابل استفاده است.` : `تنها ${faNum(r.saved)} تایل ذخیره شد. برای استفادهٔ آفلاین، دانلود را دوباره انجام دهید.`);
    } catch (e) {
      Alert.alert('خطا', 'دانلود نقشه ناموفق بود. اتصال اینترنت را بررسی کنید.');
    } finally { setDownloading(false); setProgress(null); }
  }

  return (
    <ScrollView persistentScrollbar={true} style={{ backgroundColor: CC.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
      <Text style={s.h}>تنظیمات نقشه</Text>
      <Text style={s.intro}>سرویس نقشه و نحوهٔ استفاده در حالت بدون اینترنت را انتخاب کنید. تغییرات انتخابی روی همین دستگاه ذخیره می‌شوند.</Text>
      {!!error && <View accessibilityLiveRegion="polite" style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}

      <Text style={s.section}>۱) نوع نقشه برای دانلود آفلاین</Text>
      {PROVIDERS.map(([val, lbl]) => (
        <TouchableOpacity key={val} accessibilityRole="radio" accessibilityState={{ checked: provider === val, disabled: downloading || saving }} disabled={downloading || saving} style={[s.opt, provider === val && s.optOn]} onPress={() => saveProvider(val)}>
          <View style={[s.radio, provider === val && s.radioOn]}>{provider === val && <View style={s.dot} />}</View>
          <Text style={[s.optTxt, provider === val && { color: CC.brand, fontFamily: FONT.bold }]}>{lbl}</Text>
        </TouchableOpacity>
      ))}

      <Text style={s.section}>۲) حالت بارگذاری نقشه</Text>
      {MODES.map(([val, lbl]) => (
        <TouchableOpacity key={val} accessibilityRole="radio" accessibilityState={{ checked: mode === val, disabled: downloading || saving }} disabled={downloading || saving} style={[s.opt, mode === val && s.optOn]} onPress={() => saveMode(val)}>
          <View style={[s.radio, mode === val && s.radioOn]}>{mode === val && <View style={s.dot} />}</View>
          <Text style={[s.optTxt, mode === val && { color: CC.brand, fontFamily: FONT.bold }]}>{lbl}</Text>
        </TouchableOpacity>
      ))}

      <Text style={s.section}>۳) دانلود دادهٔ نقشهٔ آفلاین (محدودهٔ مشهد)</Text>
      <View style={s.card}>
        <Text style={s.cardInfo}>
          وضعیت فعلی: {cached ? '✓ نقشهٔ آفلاین دانلود شده است' : 'نقشهٔ آفلاین هنوز دانلود نشده'}
        </Text>
        {downloading ? (
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <ActivityIndicator color={CC.brand} />
            {progress && <Text style={s.prog}>دانلود: {faNum(progress.done)} از {faNum(progress.total)} تایل</Text>}
          </View>
        ) : (
          <TouchableOpacity accessibilityRole="button" style={s.btn} onPress={download} disabled={saving}>
            <Text style={s.btnTxt}>{cached ? 'به‌روزرسانی / دانلود مجدد نقشه' : 'شروع دانلود نقشهٔ آفلاین'}</Text>
          </TouchableOpacity>
        )}
        {cached && !downloading ? <TouchableOpacity style={[s.btn,{backgroundColor:CC.slate}]} onPress={testOffline}><Text style={s.btnTxt}>آزمون نقشهٔ آفلاین</Text></TouchableOpacity> : null}
        <Text style={s.note}>
          دانلود نقشهٔ {PROVIDERS.find((p) => p[0] === provider)?.[1].split(' ')[0]} برای محدودهٔ مشهد انجام می‌شود.
          در حالت «هوشمند» یا «آفلاین»، اگر اینترنت در دسترس نباشد از همین نقشهٔ ذخیره‌شده استفاده می‌شود.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  h: { fontFamily: FONT.bold, fontSize: 19, color: CC.ink, textAlign: 'right', marginBottom: 14 },
  intro: { fontFamily: FONT.regular, fontSize: 13, color: CC.muted, textAlign: 'right', lineHeight: 23 },
  errorBox: { backgroundColor: '#fff7f7', borderColor: '#fecaca', borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 },
  errorText: { fontFamily: FONT.regular, color: '#9f1d1d', textAlign: 'right', lineHeight: 21 },
  section: { fontFamily: FONT.bold, fontSize: 14, color: CC.slate, textAlign: 'right', marginTop: 18, marginBottom: 10 },
  opt: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 15, minHeight: 52, backgroundColor: CC.card, borderRadius: 15, borderWidth: 1, borderColor: CC.line, marginBottom: 8 },
  optOn: { borderColor: CC.brand, backgroundColor: '#f0faf6' },
  optTxt: { fontFamily: FONT.regular, color: CC.ink, fontSize: 13.5, flex: 1, textAlign: 'right' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: CC.line, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: CC.brand },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: CC.brand },
  card: { backgroundColor: CC.card, borderRadius: 12, borderWidth: 1, borderColor: CC.line, padding: 14 },
  cardInfo: { fontFamily: FONT.bold, color: CC.ink, fontSize: 13.5, textAlign: 'right' },
  btn: { backgroundColor: CC.brand, borderRadius: 12, padding: 14, minHeight: 48, alignItems: 'center', marginTop: 12 },
  btnTxt: { fontFamily: FONT.bold, color: '#fff', fontSize: 14 },
  prog: { fontFamily: FONT.regular, color: CC.muted, fontSize: 12, marginTop: 8 },
  note: { fontFamily: FONT.regular, color: CC.muted, fontSize: 11.5, textAlign: 'right', marginTop: 10, lineHeight: 19 },
});
