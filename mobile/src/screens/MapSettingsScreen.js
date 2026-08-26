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

  useEffect(() => {
    AsyncStorage.getItem('map_offline_provider').then((v) => v && setProvider(v));
    AsyncStorage.getItem('map_offline_mode').then((v) => v && setMode(v));
    isTileCached(provider).then(setCached);
    getAppConfig().then((c) => setNeshanKey((c && c.neshan_api_key) || '')).catch(() => {});
  }, []);

  const saveProvider = async (p) => { setProvider(p); await AsyncStorage.setItem('map_offline_provider', p); setCached(await isTileCached(p)); };
  const saveMode = (m) => { setMode(m); AsyncStorage.setItem('map_offline_mode', m); };

  async function testOffline() {
    try { const t=await loadLocalTilesAround(36.297,59.606,15,1); const n=Object.keys(t).length; Alert.alert(n>0?'آماده استفاده':'نقشه ناقص', n>0?`${faNum(n)} تایل نمونه از حافظه خوانده شد. نقشه آفلاین قابل استفاده است.`:'تایل محلی خوانده نشد؛ نقشه را دوباره دانلود کنید.'); } catch(e){ Alert.alert('خطا','آزمون نقشه آفلاین ناموفق بود.'); }
  }

  async function download() {
    setDownloading(true); setProgress({ done: 0, total: 1 });
    try {
      const r = await cacheMashhadTiles(
        (done, total) => setProgress({ done, total }),
        provider, neshanKey,
      );
      setCached(true);
      Alert.alert('دانلود کامل شد', `${faNum(r.saved)} تایل نقشه ذخیره شد و در حالت آفلاین قابل استفاده است.`);
    } catch (e) {
      Alert.alert('خطا', 'دانلود نقشه ناموفق بود. اتصال اینترنت را بررسی کنید.');
    } finally { setDownloading(false); setProgress(null); }
  }

  return (
    <ScrollView style={{ backgroundColor: CC.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
      <Text style={s.h}>تنظیمات نقشه</Text>

      <Text style={s.section}>۱) نوع نقشه برای دانلود آفلاین</Text>
      {PROVIDERS.map(([val, lbl]) => (
        <TouchableOpacity key={val} style={[s.opt, provider === val && s.optOn]} onPress={() => saveProvider(val)}>
          <View style={[s.radio, provider === val && s.radioOn]}>{provider === val && <View style={s.dot} />}</View>
          <Text style={[s.optTxt, provider === val && { color: CC.brand, fontFamily: FONT.bold }]}>{lbl}</Text>
        </TouchableOpacity>
      ))}

      <Text style={s.section}>۲) حالت بارگذاری نقشه</Text>
      {MODES.map(([val, lbl]) => (
        <TouchableOpacity key={val} style={[s.opt, mode === val && s.optOn]} onPress={() => saveMode(val)}>
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
          <TouchableOpacity style={s.btn} onPress={download}>
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
  section: { fontFamily: FONT.bold, fontSize: 14, color: CC.slate, textAlign: 'right', marginTop: 18, marginBottom: 10 },
  opt: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 12, backgroundColor: CC.card, borderRadius: 10, borderWidth: 1, borderColor: CC.line, marginBottom: 8 },
  optOn: { borderColor: CC.brand, backgroundColor: '#f0faf6' },
  optTxt: { fontFamily: FONT.regular, color: CC.ink, fontSize: 13.5, flex: 1, textAlign: 'right' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: CC.line, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: CC.brand },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: CC.brand },
  card: { backgroundColor: CC.card, borderRadius: 12, borderWidth: 1, borderColor: CC.line, padding: 14 },
  cardInfo: { fontFamily: FONT.bold, color: CC.ink, fontSize: 13.5, textAlign: 'right' },
  btn: { backgroundColor: CC.brand, borderRadius: 12, padding: 13, alignItems: 'center', marginTop: 12 },
  btnTxt: { fontFamily: FONT.bold, color: '#fff', fontSize: 14 },
  prog: { fontFamily: FONT.regular, color: CC.muted, fontSize: 12, marginTop: 8 },
  note: { fontFamily: FONT.regular, color: CC.muted, fontSize: 11.5, textAlign: 'right', marginTop: 10, lineHeight: 19 },
});
