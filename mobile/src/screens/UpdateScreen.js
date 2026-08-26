import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';

// صفحهٔ به‌روزرسانی اجباری: تا وقتی کاربر فایل جدید را نصب نکند، اجازهٔ ورود ندارد.
export default function UpdateScreen({ info, onRecheck }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    if (!info.url) return;
    setBusy(true);
    try { await Linking.openURL(info.url); } catch (e) {}
    setBusy(false);
  }

  return (
    <View style={s.wrap}>
      <Text style={s.emoji}>⬆️</Text>
      <Text style={s.title}>به‌روزرسانی لازم است</Text>
      <Text style={s.msg}>
        نسخهٔ جدیدی از برنامه منتشر شده است. برای ادامه باید برنامه را به‌روزرسانی کنید.
      </Text>
      <Text style={s.ver}>نسخهٔ فعلی: {info.current}   |   نسخهٔ جدید: {info.latest}</Text>

      <TouchableOpacity style={s.btn} onPress={download} disabled={busy || !info.url}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>دانلود و نصب نسخهٔ جدید</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={s.btnGhost} onPress={onRecheck}>
        <Text style={s.btnGhostTxt}>بعد از نصب، اینجا را بزنید</Text>
      </TouchableOpacity>

      {!info.url && <Text style={s.note}>آدرس فایل به‌روزرسانی هنوز در سرور تنظیم نشده است.</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emoji: { fontSize: 54, marginBottom: 14 },
  title: { fontFamily: FONT.bold, color: C.ink, fontSize: 20, marginBottom: 12, textAlign: 'center' },
  msg: { fontFamily: FONT.regular, color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 24, marginBottom: 14 },
  ver: { fontFamily: FONT.regular, color: C.ink, fontSize: 13, marginBottom: 24, textAlign: 'center' },
  btn: { backgroundColor: C.brand, borderRadius: 13, paddingVertical: 14, paddingHorizontal: 34, marginBottom: 10, minWidth: 240, alignItems: 'center' },
  btnTxt: { fontFamily: FONT.bold, color: '#fff', fontSize: 15 },
  btnGhost: { paddingVertical: 10, paddingHorizontal: 20 },
  btnGhostTxt: { fontFamily: FONT.regular, color: C.brand, fontSize: 14 },
  note: { fontFamily: FONT.regular, color: C.taxi, fontSize: 12, marginTop: 16, textAlign: 'center' },
});
