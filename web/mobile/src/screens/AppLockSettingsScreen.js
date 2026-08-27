import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Switch } from 'react-native';
import { C as CC, FONT } from '../theme';
import { faNum } from '../num';
import { getLockConfig, setLockConfig, setLockSecret, clearLockSecret } from '../AppLock';

const TIMEOUTS = [[0, 'بلافاصله'], [1, '۱ دقیقه'], [5, '۵ دقیقه'], [15, '۱۵ دقیقه'], [30, '۳۰ دقیقه']];

export default function AppLockSettingsScreen() {
  const [cfg, setCfg] = useState(null);
  const [setting, setSetting] = useState(false); // در حال تنظیم رمز
  const [type, setType] = useState('pin');
  const [val1, setVal1] = useState('');
  const [val2, setVal2] = useState('');
  const [hasBiometric, setHasBiometric] = useState(false);

  useEffect(() => {
    getLockConfig().then((c) => { setCfg(c); setType(c.type || 'pin'); });
    checkBiometric();
  }, []);

  async function checkBiometric() {
    try {
      const LocalAuth = require('expo-local-authentication');
      const has = await LocalAuth.hasHardwareAsync();
      const enrolled = await LocalAuth.isEnrolledAsync();
      setHasBiometric(has && enrolled);
    } catch { setHasBiometric(false); }
  }

  if (!cfg) return <View style={s.center}><Text style={s.muted}>در حال بارگذاری…</Text></View>;

  const saveCfg = async (next) => { setCfg(next); await setLockConfig(next); };

  async function enableLock() {
    if (val1.length < 4) return Alert.alert('خطا', type === 'pin' ? 'رمز عددی حداقل ۴ رقم باشد.' : 'الگو حداقل ۴ نقطه باشد.');
    if (val1 !== val2) return Alert.alert('خطا', 'دو مقدار وارد شده یکسان نیستند.');
    await setLockSecret(val1);
    await saveCfg({ ...cfg, enabled: true, type, timeoutMin: cfg.timeoutMin ?? 1, useBiometric: cfg.useBiometric ?? true });
    setSetting(false); setVal1(''); setVal2('');
    Alert.alert('فعال شد', 'قفل برنامه فعال شد.');
  }

  async function disableLock() {
    Alert.alert('غیرفعال‌سازی قفل', 'آیا می‌خواهید قفل برنامه را غیرفعال کنید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'غیرفعال کن', style: 'destructive', onPress: async () => {
        await clearLockSecret();
        await saveCfg({ ...cfg, enabled: false });
      } },
    ]);
  }

  return (
    <ScrollView style={{ backgroundColor: CC.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
      <Text style={s.h}>قفل خودکار برنامه</Text>
      <Text style={s.sub}>برنامه را با رمز عددی، الگو یا اثر انگشت محافظت کنید. پس از مدت بی‌فعالیتی، برنامه قفل می‌شود.</Text>

      {!cfg.enabled && !setting && (
        <TouchableOpacity style={s.btn} onPress={() => setSetting(true)}>
          <Text style={s.btnTxt}>فعال‌سازی قفل برنامه</Text>
        </TouchableOpacity>
      )}

      {setting && (
        <View style={s.card}>
          <Text style={s.label}>نوع قفل</Text>
          <View style={s.row}>
            {[['pin', 'رمز عددی'], ['pattern', 'الگو (اعداد ۱ تا ۹)']].map(([v, l]) => (
              <TouchableOpacity key={v} style={[s.chip, type === v && s.chipOn]} onPress={() => setType(v)}>
                <Text style={[s.chipTxt, type === v && { color: '#fff' }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[s.label, { marginTop: 12 }]}>{type === 'pin' ? 'رمز عددی (۴ تا ۸ رقم)' : 'الگو: اعداد نقاط را به ترتیب وارد کنید (مثلاً 1235789)'}</Text>
          <TextInput style={s.input} value={val1} onChangeText={(t) => setVal1(t.replace(/[^0-9]/g, ''))} keyboardType="numeric" secureTextEntry maxLength={9} placeholder="وارد کنید" />
          <TextInput style={s.input} value={val2} onChangeText={(t) => setVal2(t.replace(/[^0-9]/g, ''))} keyboardType="numeric" secureTextEntry maxLength={9} placeholder="تکرار" />
          <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 10 }}>
            <TouchableOpacity style={s.btn} onPress={enableLock}><Text style={s.btnTxt}>ذخیره و فعال‌سازی</Text></TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnG]} onPress={() => { setSetting(false); setVal1(''); setVal2(''); }}><Text style={s.btnTxt}>انصراف</Text></TouchableOpacity>
          </View>
        </View>
      )}

      {cfg.enabled && (
        <View style={s.card}>
          <Text style={s.status}>✓ قفل برنامه فعال است ({cfg.type === 'pin' ? 'رمز عددی' : 'الگو'})</Text>

          <Text style={[s.label, { marginTop: 14 }]}>قفل پس از این مدت بی‌فعالیتی</Text>
          <View style={[s.row, { flexWrap: 'wrap' }]}>
            {TIMEOUTS.map(([m, l]) => (
              <TouchableOpacity key={m} style={[s.chip, cfg.timeoutMin === m && s.chipOn]} onPress={() => saveCfg({ ...cfg, timeoutMin: m })}>
                <Text style={[s.chipTxt, cfg.timeoutMin === m && { color: '#fff' }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {hasBiometric && (
            <View style={[s.rowBetween, { marginTop: 16 }]}>
              <Text style={s.label}>باز کردن با اثر انگشت</Text>
              <Switch value={cfg.useBiometric !== false} onValueChange={(v) => saveCfg({ ...cfg, useBiometric: v })}
                trackColor={{ true: CC.brand }} />
            </View>
          )}

          <TouchableOpacity style={[s.btn, s.btnDanger, { marginTop: 16 }]} onPress={disableLock}>
            <Text style={s.btnTxt}>غیرفعال‌سازی قفل</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: CC.muted, fontFamily: FONT.regular },
  h: { fontFamily: FONT.bold, fontSize: 19, color: CC.ink, textAlign: 'right', marginBottom: 6 },
  sub: { fontFamily: FONT.regular, fontSize: 12.5, color: CC.muted, textAlign: 'right', marginBottom: 16, lineHeight: 20 },
  card: { backgroundColor: CC.card, borderRadius: 12, borderWidth: 1, borderColor: CC.line, padding: 14, marginBottom: 12 },
  status: { fontFamily: FONT.bold, color: CC.brand, fontSize: 14, textAlign: 'right' },
  label: { fontFamily: FONT.bold, color: CC.ink, fontSize: 13.5, textAlign: 'right', marginBottom: 8 },
  row: { flexDirection: 'row-reverse', gap: 8, flexWrap: 'wrap' },
  rowBetween: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  chip: { backgroundColor: '#eef2f8', borderWidth: 1, borderColor: CC.line, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  chipOn: { backgroundColor: CC.brand, borderColor: CC.brand },
  chipTxt: { fontFamily: FONT.regular, color: CC.slate, fontSize: 13 },
  input: { backgroundColor: '#f4f6fb', borderRadius: 10, borderWidth: 1, borderColor: CC.line, padding: 12, fontFamily: FONT.regular, fontSize: 16, textAlign: 'center', marginBottom: 10, letterSpacing: 4 },
  btn: { backgroundColor: CC.brand, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 20, alignItems: 'center' },
  btnG: { backgroundColor: '#64748b' },
  btnDanger: { backgroundColor: CC.danger },
  btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 14 },
});
