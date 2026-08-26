import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { request } from './api';
import { C, FONT } from './theme';
import PersonalPhotoCapture from './PersonalPhotoCapture';
import ActivityIndicator from './components/PulseLoadingIndicator';

// نخستین ورود: تکمیل اطلاعات فردی + تغییر رمز + عکس پرسنلی (با دوربین جلو)
export default function FirstSetupScreen({ onDone }) {
  const [step, setStep] = useState('form'); // form | camera | submitting
  const [phone, setPhone] = useState('');
  const [national, setNational] = useState('');
  const [marital, setMarital] = useState('');
  const [children, setChildren] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);

  function validateForm() {
    if (!/^\d{10,11}$/.test(phone.trim())) { Alert.alert('خطا', 'شمارهٔ تلفن همراه معتبر وارد کنید.'); return false; }
    if (national.trim() && !/^\d{10}$/.test(national.trim())) { Alert.alert('خطا', 'کد ملی باید ۱۰ رقم باشد.'); return false; }
    if (!marital) { Alert.alert('خطا', 'وضعیت تأهل را انتخاب کنید.'); return false; }
    if (!address.trim()) { Alert.alert('خطا', 'آدرس محل سکونت را وارد کنید.'); return false; }
    if (pw.length < 6) { Alert.alert('خطا', 'رمز جدید باید حداقل ۶ کاراکتر باشد.'); return false; }
    if (pw === '123456') { Alert.alert('خطا', 'رمز جدید نباید ۱۲۳۴۵۶ باشد.'); return false; }
    if (pw !== pw2) { Alert.alert('خطا', 'تکرار رمز مطابقت ندارد.'); return false; }
    return true;
  }

  async function submitAll(dataUrl) {
    setBusy(true); setStep('submitting');
    try {
      await request('/my/initial-setup', { method: 'POST', body: {
        next: pw, email: email.trim(), phone: phone.trim(), national_code: national.trim(),
        marital_status: marital, address: address.trim(),
        children_count: children === '' ? null : parseInt(children, 10) || 0,
        photo: dataUrl,
      } });
      onDone && onDone();
    } catch (e) { Alert.alert('خطا', e.message || 'ثبت ناموفق بود'); setStep('form'); }
    finally { setBusy(false); }
  }

  if (step === 'camera') {
    return <PersonalPhotoCapture onCapture={(d) => submitAll(d)} onCancel={() => setStep('form')} />;
  }
  if (step === 'submitting') {
    return <View style={s.center}><ActivityIndicator size="large" color={C.brand} /><Text style={s.body}>در حال ثبت اطلاعات…</Text></View>;
  }

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.icon}>🪪</Text>
      <Text style={s.title}>تکمیل اطلاعات و عکس پرسنلی</Text>
      <Text style={s.body}>در نخستین ورود، اطلاعات فردی خود را تکمیل، رمز عبور را تغییر دهید و یک عکس پرسنلی با دوربین بگیرید.</Text>

      <Text style={s.label}>تلفن همراه *</Text>
      <TextInput style={s.input} keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholder="09xxxxxxxxx" />
      <Text style={s.label}>کد ملی</Text>
      <TextInput style={s.input} keyboardType="number-pad" maxLength={10} value={national} onChangeText={setNational} placeholder="۱۰ رقم" />
      <Text style={s.label}>وضعیت تأهل *</Text>
      <View style={s.rowSel}>
        {['مجرد', 'متاهل'].map((m) => (
          <TouchableOpacity key={m} style={[s.sel, marital === m && s.selOn]} onPress={() => setMarital(m)}>
            <Text style={[s.selTxt, marital === m && s.selTxtOn]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {marital === 'متاهل' ? (
        <View>
          <Text style={s.label}>تعداد فرزند</Text>
          <TextInput style={s.input} keyboardType="number-pad" value={children} onChangeText={setChildren} placeholder="0" />
        </View>
      ) : null}
      <Text style={s.label}>آدرس محل سکونت *</Text>
      <TextInput style={[s.input, { height: 70 }]} multiline value={address} onChangeText={setAddress} />
      <Text style={s.label}>ایمیل (اختیاری)</Text>
      <TextInput style={s.input} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <Text style={s.label}>رمز عبور جدید *</Text>
      <TextInput style={s.input} secureTextEntry value={pw} onChangeText={setPw} />
      <Text style={s.label}>تکرار رمز جدید *</Text>
      <TextInput style={s.input} secureTextEntry value={pw2} onChangeText={setPw2} />

      <View style={s.uniformBox}>
        <Text style={s.uniformTxt}>⚠ عکس پرسنلی باید با لباس فرم سازمانی و فقط با دوربین گرفته شود (بدون امکان انتخاب از گالری).</Text>
      </View>

      <TouchableOpacity style={s.btn} disabled={busy} onPress={() => { if (validateForm()) setStep('camera'); }}>
        <Text style={s.btnTxt}>ادامه و گرفتن عکس پرسنلی</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 22, paddingBottom: 50, backgroundColor: C.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: C.paper },
  icon: { fontSize: 42, textAlign: 'center', marginTop: 12 },
  title: { fontFamily: FONT.bold, fontSize: 19, color: C.ink, textAlign: 'center', marginVertical: 8 },
  body: { fontFamily: FONT.regular, fontSize: 13, color: C.muted, textAlign: 'center', marginBottom: 16, lineHeight: 22 },
  label: { fontFamily: FONT.bold, fontSize: 13, color: C.ink, textAlign: 'right', marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 11, padding: 12, fontFamily: FONT.regular, fontSize: 14, textAlign: 'right', color: C.ink },
  rowSel: { flexDirection: 'row-reverse', gap: 10 },
  sel: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 11, padding: 12, alignItems: 'center', backgroundColor: '#fff' },
  selOn: { backgroundColor: C.brand, borderColor: C.brand },
  selTxt: { fontFamily: FONT.bold, color: C.ink },
  selTxtOn: { color: '#fff' },
  uniformBox: { backgroundColor: '#fff4d6', borderRadius: 11, padding: 12, marginTop: 18, borderWidth: 1, borderColor: '#f0e2b8' },
  uniformTxt: { fontFamily: FONT.bold, fontSize: 12.5, color: '#7a5b00', textAlign: 'right', lineHeight: 21 },
  btn: { backgroundColor: C.brand, borderRadius: 13, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 },
});
