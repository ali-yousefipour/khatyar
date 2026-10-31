import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { setApiBase, apiBase } from '../config';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';

export default function SetupScreen({ onDone }) {
  const [url, setUrl] = useState(apiBase());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function testAndSave() {
    setBusy(true); setMsg(null);
    const clean = String(url || '').trim().replace(/\/+$/, '');
    try {
      if (!/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(clean)) throw new Error('آدرس سرور باید با https:// شروع شود.');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      let r;
      try {
        r = await fetch(`${clean.replace(/\/api$/, '')}/health`, { signal: controller.signal });
      } finally { clearTimeout(timer); }
      if (!r.ok) throw new Error(`خطای پاسخ سرور: ${r.status}`);
      const d = await r.json();
      if (!d.ok) throw new Error('پاسخ نامعتبر از سرور');
      await setApiBase(clean);
      setMsg({ ok: true, t: 'اتصال موفق بود ✓' });
      onDone?.();
    } catch (e) {
      setMsg({ ok: false, t: e?.name === 'AbortError' ? 'زمان اتصال به پایان رسید؛ شبکه را بررسی کنید.' : (e?.message || 'اتصال ناموفق بود؛ آدرس را بررسی کنید.') });
    } finally { setBusy(false); }
  }

  return (
    <View style={s.wrap}>
      <View style={s.logo}><Text style={s.logoTxt}>ت</Text></View>
      <Text style={s.title}>اتصال به سرور</Text>
      <Text style={s.sub}>آدرس وب‌سرویس سامانه را وارد کنید</Text>

      <Text style={s.label}>آدرس سرور (API)</Text>
      <TextInput style={s.input} value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} accessibilityLabel="آدرس HTTPS سرور"
        keyboardType="url" placeholder="https://taxi-control.mashhad.ir/api" placeholderTextColor={C.muted} />

      {msg && <Text style={[s.msg, { color: msg.ok ? C.ok : C.danger }]}>{msg.t}</Text>}

      <TouchableOpacity accessibilityRole="button" accessibilityState={{disabled:busy}} style={[s.btn,busy&&{opacity:0.6}]} onPress={testAndSave} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>تست و ذخیره</Text>}
      </TouchableOpacity>
      <Text style={s.note}>این آدرس فقط یک‌بار تنظیم می‌شود و بعداً از منو قابل تغییر است.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.paper, padding: 26, justifyContent: 'center' },
  logo: { width: 72, height: 72, borderRadius: 22, backgroundColor: C.brand, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  logoTxt: { color: '#fff', fontSize: 30, fontFamily: FONT.bold },
  title: { fontFamily: FONT.bold, fontSize: 18, textAlign: 'center', marginTop: 16, color: C.ink },
  sub: { textAlign: 'center', color: C.muted, marginBottom: 26, fontFamily: FONT.regular },
  label: { fontFamily: FONT.regular, color: C.muted, fontSize: 13, marginBottom: 6, textAlign: 'right' },
  input: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 13, textAlign: 'left', fontFamily: FONT.regular, color: C.ink },
  msg: { fontFamily: FONT.bold, textAlign: 'center', marginTop: 14 },
  btn: { backgroundColor: C.brand, borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 18 },
  btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 },
  note: { color: C.muted, fontSize: 11, textAlign: 'center', marginTop: 16, fontFamily: FONT.regular },
});
