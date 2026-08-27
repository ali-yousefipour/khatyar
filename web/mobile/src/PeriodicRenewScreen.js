import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { request } from './api';
import { C, FONT } from './theme';
import PersonalPhotoCapture from './PersonalPhotoCapture';
import ActivityIndicator from './components/PulseLoadingIndicator';

// تمدید دوره‌ای اجباری (هر ۳۰ روز): تغییر رمز + عکس پرسنلی جدید
export default function PeriodicRenewScreen({ onDone }) {
  const [step, setStep] = useState('form'); // form | camera | submitting
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');

  function validate() {
    if (pw.length < 6) { Alert.alert('خطا', 'رمز جدید باید حداقل ۶ کاراکتر باشد.'); return false; }
    if (pw === '123456') { Alert.alert('خطا', 'رمز جدید نباید ۱۲۳۴۵۶ باشد.'); return false; }
    if (pw !== pw2) { Alert.alert('خطا', 'تکرار رمز مطابقت ندارد.'); return false; }
    return true;
  }

  async function submit(dataUrl) {
    setStep('submitting');
    try {
      await request('/my/periodic-renew', { method: 'POST', body: { next: pw, photo: dataUrl } });
      onDone && onDone();
    } catch (e) { Alert.alert('خطا', e.message || 'ثبت ناموفق بود'); setStep('form'); }
  }

  if (step === 'camera') return <PersonalPhotoCapture onCapture={(d) => submit(d)} onCancel={() => setStep('form')} />;
  if (step === 'submitting') return <View style={s.center}><ActivityIndicator size="large" color={C.brand} /><Text style={s.body}>در حال ثبت…</Text></View>;

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.icon}>🔄</Text>
      <Text style={s.title}>به‌روزرسانی دوره‌ای</Text>
      <Text style={s.body}>طبق سیاست سازمان، لازم است به‌صورت دوره‌ای رمز عبور خود را تغییر دهید و عکس پرسنلی جدید (با لباس فرم) بگیرید.</Text>
      <Text style={s.label}>رمز عبور جدید *</Text>
      <TextInput style={s.input} secureTextEntry value={pw} onChangeText={setPw} />
      <Text style={s.label}>تکرار رمز جدید *</Text>
      <TextInput style={s.input} secureTextEntry value={pw2} onChangeText={setPw2} />
      <View style={s.uniformBox}>
        <Text style={s.uniformTxt}>⚠ عکس پرسنلی باید با لباس فرم سازمانی و فقط با دوربین گرفته شود.</Text>
      </View>
      <TouchableOpacity style={s.btn} onPress={() => { if (validate()) setStep('camera'); }}>
        <Text style={s.btnTxt}>ادامه و گرفتن عکس پرسنلی</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 22, paddingBottom: 50, backgroundColor: C.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: C.paper },
  icon: { fontSize: 42, textAlign: 'center', marginTop: 18 },
  title: { fontFamily: FONT.bold, fontSize: 19, color: C.ink, textAlign: 'center', marginVertical: 8 },
  body: { fontFamily: FONT.regular, fontSize: 13, color: C.muted, textAlign: 'center', marginBottom: 16, lineHeight: 22 },
  label: { fontFamily: FONT.bold, fontSize: 13, color: C.ink, textAlign: 'right', marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 11, padding: 12, fontFamily: FONT.regular, fontSize: 14, textAlign: 'right', color: C.ink },
  uniformBox: { backgroundColor: '#fff4d6', borderRadius: 11, padding: 12, marginTop: 18, borderWidth: 1, borderColor: '#f0e2b8' },
  uniformTxt: { fontFamily: FONT.bold, fontSize: 12.5, color: '#7a5b00', textAlign: 'right', lineHeight: 21 },
  btn: { backgroundColor: C.brand, borderRadius: 13, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 },
});
