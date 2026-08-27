import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { request, postOrQueue } from '../api';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';

export default function FormsScreen({ route }) {
  const driverParam = route.params?.driver;
  const [forms, setForms] = useState(null);
  const [active, setActive] = useState(null);
  const [answers, setAnswers] = useState({}); // keyed by field.key
  const [driver, setDriver] = useState(driverParam || null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { request('/admin/forms').then(setForms).catch(() => setForms([])); }, []);

  function setA(k, v) { setAnswers((a) => ({ ...a, [k]: v })); }

  // فراخوان اطلاعات راننده با کد ملی و پرکردن فیلدهای دارای prefill
  async function autofill(field) {
    const nid = String(answers[field.key] || '').replace(/\D/g, '');
    if (nid.length < 8) return Alert.alert('توجه', 'کد ملی معتبر وارد کنید.');
    try {
      const res = await request('/search?national_id=' + nid);
      if (res.type !== 'driver') return Alert.alert('یافت نشد', 'راننده‌ای با این کد ملی پیدا نشد.');
      setDriver(res.driver);
      // ترکیب اطلاعات راننده و خودرو برای فراخوان (پلاک، مدل، خط از خودرو)
      const veh = res.vehicle || {};
      const merged = { ...res.driver,
        plate: veh.plate, model_name: veh.model_name, model_year: veh.model_year,
        line_code: veh.line_code, insurance_expire: veh.insurance_expire,
        tech_inspection_expire: veh.tech_inspection_expire };
      setAnswers((a) => {
        const next = { ...a };
        (active.schema || []).forEach((f) => { if (f.prefill && merged[f.prefill] != null) next[f.key] = String(merged[f.prefill]); });
        return next;
      });
      Alert.alert('انجام شد', 'اطلاعات راننده فراخوانی شد.');
    } catch (e) { Alert.alert('خطا', e.message); }
  }

  function visible(field) {
    if (!field.showIfKey) return true;
    return String(answers[field.showIfKey] ?? '') === String(field.showIfVal ?? '');
  }

  async function submit() {
    const out = {};
    for (const f of (active.schema || [])) {
      if (!visible(f)) continue;
      const v = answers[f.key] ?? '';
      if (f.required && !v) return Alert.alert('توجه', `فیلد «${f.label}» الزامی است.`);
      out[f.key] = v;
    }
    setBusy(true);
    try {
      const r = await postOrQueue('/admin/form-submit', { form_id: active.id, driver_id: driver?.id, answers: out });
      Alert.alert(r.queued ? 'آفلاین' : 'ثبت شد', r.queued ? 'فرم ذخیره شد و بعداً ارسال می‌شود.' : 'فرم ثبت شد.');
      setActive(null); setAnswers({});
    } catch (e) { Alert.alert('خطا', e.message); }
    finally { setBusy(false); }
  }

  if (!forms) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;

  if (!active) return (
    <ScrollView style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
      <Text style={s.h}>فرم‌های قابل تکمیل</Text>
      {forms.length === 0 && <Text style={s.empty}>فرمی تعریف نشده است.</Text>}
      {forms.map((f) => (
        <TouchableOpacity key={f.id} style={s.card} onPress={() => { setActive(f); setAnswers({}); }}>
          <Text style={s.cardTitle}>{f.title}</Text>
          <Text style={s.cardSub}>{(f.schema || []).length} فیلد</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <ScrollView style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
      <Text style={s.h}>{active.title}</Text>
      {(active.schema || []).filter(visible).map((field) => (
        <View key={field.key} style={{ marginBottom: 12 }}>
          <Text style={s.label}>{field.label}{field.required ? ' *' : ''}</Text>

          {field.type === 'national_id' ? (
            <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
              <TextInput style={[s.input, { flex: 1 }]} keyboardType="number-pad"
                value={answers[field.key] || ''} onChangeText={(v) => setA(field.key, v)} />
              <TouchableOpacity style={s.smallBtn} onPress={() => autofill(field)}>
                <Text style={s.smallBtnTxt}>فراخوان</Text>
              </TouchableOpacity>
            </View>
          ) : field.type === 'select' ? (
            <View style={s.opts}>
              {(field.options || []).map((o) => (
                <TouchableOpacity key={o} onPress={() => setA(field.key, o)}
                  style={[s.opt, answers[field.key] === o && { backgroundColor: C.brand, borderColor: C.brand }]}>
                  <Text style={[s.optTxt, answers[field.key] === o && { color: '#fff' }]}>{o}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : field.type === 'checkbox' ? (
            <View style={s.opts}>
              {['بله', 'خیر'].map((o) => (
                <TouchableOpacity key={o} onPress={() => setA(field.key, o)}
                  style={[s.opt, answers[field.key] === o && { backgroundColor: C.brand, borderColor: C.brand }]}>
                  <Text style={[s.optTxt, answers[field.key] === o && { color: '#fff' }]}>{o}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : field.type === 'textarea' ? (
            <TextInput style={[s.input, { minHeight: 90, textAlignVertical: 'top' }]} multiline
              value={answers[field.key] || ''} onChangeText={(v) => setA(field.key, v)} />
          ) : field.type === 'signature' ? (
            <TextInput style={s.input} placeholder="نام و نام خانوادگی (به‌جای امضا)" placeholderTextColor={C.muted}
              value={answers[field.key] || ''} onChangeText={(v) => setA(field.key, v)} />
          ) : (
            <TextInput style={s.input} keyboardType={field.type === 'number' ? 'number-pad' : 'default'}
              value={answers[field.key] || ''} onChangeText={(v) => setA(field.key, v)} />
          )}
        </View>
      ))}
      <TouchableOpacity style={s.btn} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>ثبت فرم</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setActive(null)} style={{ marginTop: 12, alignItems: 'center' }}>
        <Text style={{ color: C.muted, fontFamily: FONT.regular }}>بازگشت به فهرست فرم‌ها</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },
  h: { fontFamily: FONT.bold, fontSize: 16, color: C.ink, textAlign: 'right', marginBottom: 12 },
  empty: { color: C.muted, fontFamily: FONT.regular, textAlign: 'center', marginTop: 30 },
  card: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 16, marginBottom: 10 },
  cardTitle: { fontFamily: FONT.bold, color: C.ink, textAlign: 'right' },
  cardSub: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, textAlign: 'right', marginTop: 3 },
  label: { fontFamily: FONT.regular, color: C.muted, fontSize: 13, marginBottom: 6, textAlign: 'right' },
  input: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 12, textAlign: 'right', fontFamily: FONT.regular, color: C.ink },
  opts: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  opt: { borderColor: C.line, borderWidth: 1, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  optTxt: { fontFamily: FONT.bold, fontSize: 13, color: C.ink },
  smallBtn: { backgroundColor: C.ink, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  smallBtnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 13 },
  btn: { backgroundColor: C.brand, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 8 },
  btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 },
});
