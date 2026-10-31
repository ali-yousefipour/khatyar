import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { request, postOrQueue } from '../api';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';
import SignaturePad from '../components/SignaturePad';
import JDatePicker, { jLabel } from '../components/JDatePicker';

function fileExtOk(name, allowedTypes) {
  if (!allowedTypes) return true;
  const list = allowedTypes.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (!list.length) return true;
  const lower = String(name || '').toLowerCase();
  const mimeExtensions = { 'application/pdf':['.pdf'], 'image/jpeg':['.jpg','.jpeg'], 'image/png':['.png'], 'image/webp':['.webp'], 'application/msword':['.doc'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':['.docx'] };
  return list.some((a) => a==='*/*' || a==='*' || (a==='image/*' ? /\.(jpe?g|png|webp|gif)$/i.test(lower) : (a.startsWith('.') ? lower.endsWith(a) : (mimeExtensions[a]||[]).some(ext=>lower.endsWith(ext)))));
}

export default function FormsScreen({ route }) {
  const driverParam = route.params?.driver;
  const [forms, setForms] = useState(null);
  const [active, setActive] = useState(null);
  const [answers, setAnswers] = useState({}); // keyed by field.key
  const [driver, setDriver] = useState(driverParam || null);
  const [busy, setBusy] = useState(false);
  const [dateField, setDateField] = useState(null); // کلید فیلدی که در حال انتخاب تاریخ برای آن هستیم
  const [filePicking, setFilePicking] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadForms() {
    setLoading(true); setLoadError('');
    try {
      const data = await request('/admin/forms', { noStore: true });
      if (!Array.isArray(data)) throw new Error('پاسخ فهرست فرم‌ها نامعتبر است.');
      setForms(data);
    } catch (e) { setLoadError(e?.message || 'دریافت فرم‌ها انجام نشد.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadForms(); }, []);

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

  async function pickFile(field) {
    setFilePicking(field.key);
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: field.allowedTypes || '*/*', copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      const maxKb = Number(field.maxSizeKB || 2048);
      if (asset.size && asset.size > maxKb * 1024) { Alert.alert('حجم فایل زیاد است', `حداکثر حجم مجاز ${maxKb} کیلوبایت است.`); return; }
      if (!fileExtOk(asset.name, field.allowedTypes)) { Alert.alert('نوع فایل مجاز نیست', 'نوع فایل انتخاب‌شده برای این فیلد مجاز نیست.'); return; }
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const approxKb = Math.round((base64.length * 0.73) / 1024);
      if (approxKb > maxKb) { Alert.alert('حجم فایل زیاد است', `حداکثر حجم مجاز ${maxKb} کیلوبایت است.`); return; }
      const mime = asset.mimeType || 'application/octet-stream';
      setA(field.key, `data:${mime};base64,${base64}`);
      setA(field.key + '__name', asset.name || 'فایل');
    } catch (e) { Alert.alert('خطا', 'انتخاب فایل ناموفق بود.'); }
    finally { setFilePicking(null); }
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
      if (f.required && (v === null || v === undefined || String(v).trim() === '')) return Alert.alert('توجه', `فیلد «${f.label}» الزامی است.`);
      if (f.type === 'sheba' && v && !/^IR[0-9]{24}$/.test(v)) return Alert.alert('توجه', `شمارهٔ شبای «${f.label}» نامعتبر است (باید IR و ۲۴ رقم باشد).`);
      out[f.key] = v;
    }
    if (busy) return;
    setBusy(true);
    try {
      const r = await postOrQueue('/admin/form-submit', { form_id: active.id, driver_id: driver?.id, answers: out });
      Alert.alert(r.queued ? 'آفلاین' : 'ثبت شد', r.queued ? 'فرم ذخیره شد و بعداً ارسال می‌شود.' : 'فرم ثبت شد.');
      setActive(null); setAnswers({});
    } catch (e) { Alert.alert('خطا', e.message); }
    finally { setBusy(false); }
  }

  if (loading && !forms) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;
  if (!forms) return <View style={s.center}><Text accessibilityLiveRegion="polite" style={s.error}>{loadError || 'فهرست فرم‌ها دریافت نشد.'}</Text><TouchableOpacity accessibilityRole="button" style={s.btn} onPress={loadForms}><Text style={s.btnTxt}>تلاش دوباره</Text></TouchableOpacity></View>;

  if (!active) return (
    <ScrollView persistentScrollbar={true} style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
      <Text style={s.h}>فرم‌های قابل تکمیل</Text>
      {loadError ? <View style={s.errorBox}><Text accessibilityLiveRegion="polite" style={s.error}>{loadError}</Text><TouchableOpacity accessibilityRole="button" disabled={loading} onPress={loadForms} style={s.retry}><Text style={s.retryText}>{loading ? 'در حال دریافت…' : 'بارگذاری دوباره'}</Text></TouchableOpacity></View> : null}
      {forms.length === 0 && <Text style={s.empty}>فرمی تعریف نشده است.</Text>}
      {forms.map((f) => (
        <TouchableOpacity key={f.id} accessibilityRole="button" style={s.card} onPress={() => { setActive(f); setAnswers({}); }}>
          <Text style={s.cardTitle}>{f.title}</Text>
          <Text style={s.cardSub}>{(f.schema || []).length} فیلد</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <ScrollView persistentScrollbar={true} style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
      <Text style={s.h}>{active.title}</Text>
      <Text style={s.intro}>فیلدهای ستاره‌دار الزامی‌اند. پس از تکمیل، فرم را از پایین صفحه ثبت کنید.</Text>
      {(active.schema || []).filter(visible).map((field) => (
        <View key={field.key} style={{ marginBottom: 12 }}>
          <Text style={s.label}>{field.label}{field.required ? ' *' : ''}</Text>

          {field.type === 'national_id' ? (
            <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
              <TextInput accessibilityLabel={field.label} style={[s.input, { flex: 1 }]} keyboardType="number-pad" maxLength={10}
                value={answers[field.key] || ''} onChangeText={(v) => setA(field.key, v)} />
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="فراخوان اطلاعات راننده با کد ملی" style={s.smallBtn} onPress={() => autofill(field)}>
                <Text style={s.smallBtnTxt}>فراخوان</Text>
              </TouchableOpacity>
            </View>
          ) : field.type === 'select' ? (
            <View style={s.opts}>
              {(field.options || []).map((o) => (
                <TouchableOpacity accessibilityRole="radio" accessibilityState={{checked:answers[field.key]===o}} key={o} onPress={() => setA(field.key, o)}
                  style={[s.opt, answers[field.key] === o && { backgroundColor: C.brand, borderColor: C.brand }]}>
                  <Text style={[s.optTxt, answers[field.key] === o && { color: '#fff' }]}>{o}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : field.type === 'checkbox' ? (
            <View style={s.opts}>
              {['بله', 'خیر'].map((o) => (
                <TouchableOpacity accessibilityRole="radio" accessibilityState={{checked:answers[field.key]===o}} key={o} onPress={() => setA(field.key, o)}
                  style={[s.opt, answers[field.key] === o && { backgroundColor: C.brand, borderColor: C.brand }]}>
                  <Text style={[s.optTxt, answers[field.key] === o && { color: '#fff' }]}>{o}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : field.type === 'textarea' ? (
            <TextInput accessibilityLabel={field.label} style={[s.input, { minHeight: 90, textAlignVertical: 'top' }]} multiline
              value={answers[field.key] || ''} onChangeText={(v) => setA(field.key, v)} />
          ) : field.type === 'signature' ? (
            <SignaturePad value={answers[field.key]} onChange={(v) => setA(field.key, v)} />
          ) : field.type === 'date' ? (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`انتخاب تاریخ ${field.label}`} style={[s.input,s.picker]} onPress={() => setDateField(field.key)}>
              <Text style={{ fontFamily: FONT.regular, color: answers[field.key] ? C.ink : C.muted, textAlign: 'right' }}>
                {answers[field.key] || 'برای انتخاب تاریخ ضربه بزنید'}
              </Text>
            </TouchableOpacity>
          ) : field.type === 'file' ? (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`انتخاب فایل ${field.label}`} style={[s.input,s.picker, answers[field.key] && { borderColor: C.brand }]} onPress={() => pickFile(field)} disabled={filePicking === field.key}>
              <Text style={{ fontFamily: FONT.regular, color: answers[field.key] ? C.brand : C.muted, textAlign: 'right' }}>
                {filePicking === field.key ? 'در حال انتخاب…' : (answers[field.key + '__name'] || (answers[field.key] ? 'فایل انتخاب شد ✓' : 'برای انتخاب فایل ضربه بزنید'))}
              </Text>
            </TouchableOpacity>
          ) : field.type === 'sheba' ? (
            <TextInput accessibilityLabel={field.label} style={[s.input, { textAlign: 'left', writingDirection: 'ltr' }]} autoCapitalize="characters" placeholder="IR + ۲۴ رقم" placeholderTextColor={C.muted}
              value={answers[field.key] || ''} onChangeText={(v) => setA(field.key, v.toUpperCase())} />
          ) : (
            <TextInput accessibilityLabel={field.label} style={s.input} keyboardType={field.type === 'number' ? 'number-pad' : 'default'}
              value={answers[field.key] || ''} onChangeText={(v) => setA(field.key, v)} />
          )}
        </View>
      ))}
      <TouchableOpacity accessibilityRole="button" style={s.btn} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>ثبت فرم</Text>}
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" onPress={() => setActive(null)} style={s.backBtn}>
        <Text style={{ color: C.muted, fontFamily: FONT.regular }}>بازگشت به فهرست فرم‌ها</Text>
      </TouchableOpacity>
      <JDatePicker visible={!!dateField} onClose={() => setDateField(null)}
        onSelect={(v) => { if (dateField) setA(dateField, jLabel(v.jy, v.jm, v.jd)); setDateField(null); }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },
  errorBox: { borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff7f7', padding: 14, borderRadius: 14, marginBottom: 12 },
  error: { color: '#9f1d1d', fontFamily: FONT.regular, textAlign: 'center', lineHeight: 23, marginBottom: 10 },
  retry: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: C.brand, fontFamily: FONT.bold },
  h: { fontFamily: FONT.bold, fontSize: 16, color: C.ink, textAlign: 'right', marginBottom: 12 },
  intro: { fontFamily: FONT.regular, fontSize: 13, color: C.muted, textAlign: 'right', lineHeight: 23, marginBottom: 14 },
  empty: { color: C.muted, fontFamily: FONT.regular, textAlign: 'center', marginTop: 30 },
  card: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 18, padding: 17, marginBottom: 10 },
  cardTitle: { fontFamily: FONT.bold, color: C.ink, textAlign: 'right' },
  cardSub: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, textAlign: 'right', marginTop: 3 },
  label: { fontFamily: FONT.regular, color: C.muted, fontSize: 13, marginBottom: 6, textAlign: 'right' },
  input: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 12, minHeight: 48, textAlign: 'right', fontFamily: FONT.regular, color: C.ink },
  picker: { justifyContent: 'center' },
  opts: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  opt: { borderColor: C.line, borderWidth: 1, backgroundColor: '#fff', borderRadius: 10, minHeight: 48, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 14 },
  optTxt: { fontFamily: FONT.bold, fontSize: 13, color: C.ink },
  smallBtn: { backgroundColor: C.ink, borderRadius: 10, minHeight: 48, paddingHorizontal: 16, justifyContent: 'center' },
  smallBtnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 13 },
  btn: { backgroundColor: C.brand, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 8 },
  backBtn: { minHeight: 48, marginTop: 12, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 },
});
