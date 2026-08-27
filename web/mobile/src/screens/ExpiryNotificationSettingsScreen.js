import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { request } from '../api';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';

const TYPE_ROWS = [
  ['taxi_license', 'پایان اعتبار پروانه تاکسیرانی'],
  ['operation_license', 'پایان اعتبار پروانه بهره‌برداری'],
  ['technical_inspection', 'پایان اعتبار معاینه فنی'],
  ['third_party_insurance', 'پایان اعتبار بیمه شخص ثالث'],
];

export default function ExpiryNotificationSettingsScreen() {
  const [cfg, setCfg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    request('/my/expiry-notification-settings', { noStore: true })
      .then(setCfg)
      .catch(e => Alert.alert('خطا', e.message || 'دریافت تنظیمات ناموفق بود.'));
  }, []);

  function setType(key, value) {
    setCfg(prev => ({ ...prev, types: { ...(prev?.types || {}), [key]: value } }));
  }

  function numeric(name, value) {
    const clean = String(value || '').replace(/[^0-9]/g, '');
    setCfg(prev => ({ ...prev, [name]: clean }));
  }

  async function save() {
    setBusy(true);
    try {
      const body = {
        types: cfg.types,
        check_days: Math.max(0, Math.min(365, Number(cfg.check_days || 0))),
        repeat_days: Math.max(1, Math.min(365, Number(cfg.repeat_days || 30))),
      };
      const saved = await request('/my/expiry-notification-settings', { method: 'POST', body });
      setCfg(saved);
      Alert.alert('ذخیره شد', 'تنظیمات اعلان‌های پایان اعتبار ذخیره شد.');
    } catch (e) {
      Alert.alert('خطا', e.message || 'ذخیره تنظیمات ناموفق بود.');
    } finally { setBusy(false); }
  }

  if (!cfg) return <View style={s.center}><ActivityIndicator size={90} message="در حال دریافت تنظیمات اعلان‌ها…" /></View>;

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content}>
      <Text style={s.help}>اعلان‌ها فقط برای رانندگان و خودروهای خطوطی نمایش داده می‌شوند که کاربر به آن‌ها دسترسی دارد.</Text>
      <View style={s.card}>
        <Text style={s.heading}>نوع اعلان‌های فعال</Text>
        {TYPE_ROWS.map(([key, label]) => (
          <View key={key} style={s.row}>
            <Switch value={cfg.types?.[key] !== false} onValueChange={v => setType(key, v)} />
            <Text style={s.label}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={s.card}>
        <Text style={s.heading}>دوره بررسی</Text>
        <Text style={s.desc}>چند روز مانده به پایان اعتبار، اعلان نمایش داده شود. مقدار صفر یعنی فقط موارد منقضی‌شده.</Text>
        <TextInput style={s.input} keyboardType="number-pad" value={String(cfg.check_days)} onChangeText={v => numeric('check_days', v)} textAlign="center" />
        <Text style={s.unit}>روز مانده به انقضا</Text>
      </View>

      <View style={s.card}>
        <Text style={s.heading}>ارسال مجدد پس از خواندن</Text>
        <Text style={s.desc}>وقتی اعلان خوانده شود، تا این تعداد روز دوباره برای همان راننده یا خودرو نمایش داده نمی‌شود.</Text>
        <TextInput style={s.input} keyboardType="number-pad" value={String(cfg.repeat_days)} onChangeText={v => numeric('repeat_days', v)} textAlign="center" />
        <Text style={s.unit}>روز؛ پیش‌فرض ۳۰ روز</Text>
      </View>

      <TouchableOpacity style={[s.button, busy && { opacity: .6 }]} disabled={busy} onPress={save}>
        <Text style={s.buttonText}>{busy ? 'در حال ذخیره…' : 'ذخیره تنظیمات'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.paper }, content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },
  help: { fontFamily: FONT.regular, color: C.muted, textAlign: 'right', lineHeight: 23, marginBottom: 12 },
  card: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  heading: { fontFamily: FONT.bold, color: C.ink, textAlign: 'right', fontSize: 15, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#eef1f4' },
  label: { flex: 1, fontFamily: FONT.regular, color: C.ink, textAlign: 'right', marginLeft: 12 },
  desc: { fontFamily: FONT.regular, color: C.muted, textAlign: 'right', lineHeight: 22 },
  input: { alignSelf: 'center', minWidth: 120, marginTop: 12, backgroundColor: '#f7f8fa', borderColor: C.line, borderWidth: 1, borderRadius: 10, padding: 10, fontFamily: FONT.bold, color: C.ink, fontSize: 18 },
  unit: { fontFamily: FONT.regular, color: C.muted, textAlign: 'center', marginTop: 7 },
  button: { backgroundColor: C.brand, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontFamily: FONT.bold },
});
