import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { ImagePicker, launchCamera, launchLibrary } from '../cameraLock';
import { compressToDataUri } from '../img';
import * as DocumentPicker from 'expo-document-picker';
import { request } from '../api';
import { C, FONT } from '../theme';
import JDatePicker, { jLabel } from '../components/JDatePicker';
import TimePicker from '../components/TimePicker';
import ActivityIndicator from '../components/PulseLoadingIndicator';
import { g2j } from '../jdate';

// فیلد تاریخ شمسی (فقط از تقویم) — مقدار شمسی YYYY-MM-DD برمی‌گرداند
function JDateField({ label, value, onPick }) {
  const [open, setOpen] = React.useState(false);
  const FA = '۰۱۲۳۴۵۶۷۸۹'; const fa = (s) => String(s).replace(/[0-9]/g, (d) => FA[+d]);
  const show = value ? fa(value) : 'انتخاب تاریخ';
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={pf.label}>{label}</Text>
      <TouchableOpacity style={pf.btn} onPress={() => setOpen(true)}>
        <Text style={[pf.btnTxt, !value && { color: C.muted }]}>{show}</Text><Text>📅</Text>
      </TouchableOpacity>
      <JDatePicker visible={open} onClose={() => setOpen(false)} initial={null}
        onSelect={(d) => onPick(`${d.jy}-${String(d.jm).padStart(2, '0')}-${String(d.jd).padStart(2, '0')}`)} />
    </View>
  );
}
function TimeField({ label, value, onPick }) {
  const [open, setOpen] = React.useState(false);
  const FA = '۰۱۲۳۴۵۶۷۸۹'; const fa = (s) => String(s).replace(/[0-9]/g, (d) => FA[+d]);
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={pf.label}>{label}</Text>
      <TouchableOpacity style={pf.btn} onPress={() => setOpen(true)}>
        <Text style={[pf.btnTxt, !value && { color: C.muted }]}>{value ? fa(value) : 'انتخاب ساعت'}</Text><Text>🕐</Text>
      </TouchableOpacity>
      <TimePicker visible={open} onClose={() => setOpen(false)} initial={value} onSelect={onPick} />
    </View>
  );
}
const pf = StyleSheet.create({
  label: { fontFamily: FONT.regular, color: C.muted, fontSize: 13, marginBottom: 6, textAlign: 'right' },
  btn: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 12, padding: 13, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  btnTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 14 },
});


const TYPES = [
  { k: 'annual', t: 'مرخصی استحقاقی', units: true },
  { k: 'sick', t: 'مرخصی استعلاجی', units: true, attach: true },
  { k: 'mission', t: 'ماموریت', units: true },
  { k: 'overtime', t: 'اضافه‌کار', units: true },
  { k: 'manual', t: 'تردد دستی', manual: true },
];
const STATUS = { pending: ['در انتظار', '#cc7a14'], approved: ['تأییدشده', '#0d7a5f'], rejected: ['ردشده', '#d63b54'] };

// تبدیل Date → رشتهٔ شمسی YYYY-MM-DD بدون وابستگی به Intl/Hermes
function toJ(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const [jy, jm, jd] = g2j(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return `${jy}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')}`;
}

export default function RequestsScreen() {
  const [tab, setTab] = useState('new');
  return (
    <View style={s.wrap}>
      <View style={s.tabbar}>
        <TouchableOpacity style={[s.tab, tab === 'new' && s.tabOn]} onPress={() => setTab('new')}><Text style={[s.tabT, tab === 'new' && s.tabTOn]}>ثبت درخواست</Text></TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'list' && s.tabOn]} onPress={() => setTab('list')}><Text style={[s.tabT, tab === 'list' && s.tabTOn]}>درخواست‌های من</Text></TouchableOpacity>
      </View>
      {tab === 'new' ? <NewRequest onDone={() => setTab('list')} /> : <MyRequests />}
    </View>
  );
}

function NewRequest({ onDone }) {
  const [type, setType] = useState('annual');
  const [unit, setUnit] = useState('daily');
  const [fromJ, setFromJ] = useState('');
  const [toJd, setToJd] = useState('');
  const [theDate, setTheDate] = useState('');
  const [fromTime, setFromTime] = useState('08:00');
  const [toTime, setToTime] = useState('12:00');
  const [inTime, setInTime] = useState('08:00');
  const [outTime, setOutTime] = useState('14:00');
  const [reason, setReason] = useState('');
  const [attach, setAttach] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [busy, setBusy] = useState(false);
  const [subs, setSubs] = useState([]);          // نیروهای جایگزین در دسترس
  const [sub, setSub] = useState(null);          // جایگزین انتخاب‌شده
  const [subOpen, setSubOpen] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [reqSub, setReqSub] = useState(false);   // آیا جایگزین الزامی است
  const cfg = TYPES.find((t) => t.k === type);
  const needsSubstitute = ['annual', 'sick', 'mission'].includes(type);

  // بارگذاری تنظیم الزام جایگزین
  useEffect(() => {
    request('/my/app-config').then((c) => setReqSub(!!c.leave_require_substitute)).catch(() => {});
  }, []);

  // وقتی بازهٔ تاریخ مشخص شد، نیروهای جایگزینِ در دسترس را برای آن بازه می‌گیریم
  const loadSubs = async () => {
    const f = unit === 'hourly' ? theDate : fromJ;
    const t = unit === 'hourly' ? theDate : toJd;
    if (!needsSubstitute || !f || !t) return;
    setSubLoading(true);
    try {
      const r = await request(`/my/substitutes?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`);
      setSubs(r.substitutes || []);
    } catch (e) { setSubs([]); }
    finally { setSubLoading(false); }
  };
  useEffect(() => { loadSubs(); /* eslint-disable-next-line */ }, [type, unit, fromJ, toJd, theDate]);

  const pickAttach = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
    if (r.canceled) return;
    const f = r.assets[0];
    const b64 = await fileToB64(f.uri);
    setAttach({ name: f.name, data: b64 });
  };
  const takeSelfie = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('توجه', 'دسترسی دوربین لازم است'); return; }
    const r = await launchCamera({ cameraType: ImagePicker.CameraType.front, quality: 0.5 });
    if (r.canceled) return;
    const c = await compressToDataUri(r.assets[0].uri);
    setSelfie(c || ('data:image/jpeg;base64,' + (r.assets[0].base64 || '')));
  };

  const submit = async () => {
    if (cfg.manual && !theDate) return Alert.alert('توجه', 'تاریخ را از تقویم انتخاب کنید.');
    if (!cfg.manual && unit === 'hourly' && !theDate) return Alert.alert('توجه', 'تاریخ را از تقویم انتخاب کنید.');
    if (!cfg.manual && unit === 'daily' && (!fromJ || !toJd)) return Alert.alert('توجه', 'بازهٔ تاریخ را از تقویم انتخاب کنید.');
    if (needsSubstitute && reqSub && !sub) return Alert.alert('توجه', 'برای این مرخصی، معرفی نیروی جایگزین الزامی است.');
    if (needsSubstitute && sub && sub.available === false) return Alert.alert('توجه', sub.reason || 'نیروی جایگزین انتخابی در این بازه در دسترس نیست.');
    setBusy(true);
    try {
      const body = { type, reason };
      if (cfg.manual) {
        body.the_date = theDate; body.in_time = inTime; body.out_time = outTime; body.manual_kind = 'both';
        if (selfie) body.selfie_data = selfie;
      } else {
        body.unit = unit;
        if (unit === 'hourly') { body.the_date = theDate; body.from_time = fromTime; body.to_time = toTime; }
        else { body.from_jdate = fromJ; body.to_jdate = toJd; }
        if (cfg.attach && attach) { body.attachment_name = attach.name; body.attachment_data = attach.data; }
      }
      if (needsSubstitute && sub) body.substitute_user_id = sub.id;
      await request('/my/requests', { method: 'POST', body });
      Alert.alert('ثبت شد', 'درخواست شما ارسال و برای تأیید ارجاع شد.');
      onDone();
    } catch (e) { Alert.alert('خطا', e.message || 'ارسال ناموفق'); }
    finally { setBusy(false); }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
      <Text style={s.label}>نوع درخواست</Text>
      <View style={s.chips}>
        {TYPES.map((t) => (
          <TouchableOpacity key={t.k} style={[s.chip, type === t.k && s.chipOn]} onPress={() => setType(t.k)}>
            <Text style={[s.chipT, type === t.k && s.chipTOn]}>{t.t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!cfg.manual && (
        <>
          <Text style={s.label}>واحد</Text>
          <View style={s.chips}>
            <TouchableOpacity style={[s.chip, unit === 'daily' && s.chipOn]} onPress={() => setUnit('daily')}><Text style={[s.chipT, unit === 'daily' && s.chipTOn]}>روزانه</Text></TouchableOpacity>
            <TouchableOpacity style={[s.chip, unit === 'hourly' && s.chipOn]} onPress={() => setUnit('hourly')}><Text style={[s.chipT, unit === 'hourly' && s.chipTOn]}>ساعتی</Text></TouchableOpacity>
          </View>
        </>
      )}

      {cfg.manual ? (
        <>
          <JDateField label="تاریخ" value={theDate} onPick={setTheDate} />
          <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
            <View style={{ flex: 1 }}><TimeField label="ساعت ورود" value={inTime} onPick={setInTime} /></View>
            <View style={{ flex: 1 }}><TimeField label="ساعت خروج" value={outTime} onPick={setOutTime} /></View>
          </View>
          <TouchableOpacity style={s.attachBtn} onPress={takeSelfie}><Text style={s.attachT}>{selfie ? '✓ سلفی گرفته شد (تعویض)' : '📷 الصاق عکس سلفی'}</Text></TouchableOpacity>
        </>
      ) : unit === 'hourly' ? (
        <>
          <JDateField label="تاریخ" value={theDate} onPick={setTheDate} />
          <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
            <View style={{ flex: 1 }}><TimeField label="از ساعت" value={fromTime} onPick={setFromTime} /></View>
            <View style={{ flex: 1 }}><TimeField label="تا ساعت" value={toTime} onPick={setToTime} /></View>
          </View>
        </>
      ) : (
        <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
          <View style={{ flex: 1 }}><JDateField label="از تاریخ" value={fromJ} onPick={setFromJ} /></View>
          <View style={{ flex: 1 }}><JDateField label="تا تاریخ" value={toJd} onPick={setToJd} /></View>
        </View>
      )}

      {needsSubstitute && (
        <View style={{ marginBottom: 4 }}>
          <Text style={s.label}>نیروی جایگزین {reqSub ? '(الزامی)' : '(اختیاری)'}</Text>
          <TouchableOpacity style={s.subBtn} onPress={() => {
            const f = unit === 'hourly' ? theDate : fromJ;
            if (!f) return Alert.alert('توجه', 'ابتدا تاریخ مرخصی را انتخاب کنید تا جایگزین‌های در دسترس نمایش داده شوند.');
            loadSubs(); setSubOpen(true);
          }}>
            <Text style={[s.subBtnT, !sub && { color: C.muted }]}>{sub ? sub.name : 'انتخاب نیروی جایگزین'}</Text>
          </TouchableOpacity>
          {sub && sub.available === false && <Text style={s.subWarn}>⚠ {sub.reason || 'این فرد در بازهٔ انتخابی در دسترس نیست.'}</Text>}
        </View>
      )}

      <Text style={s.label}>توضیحات</Text>
      <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} multiline value={reason} onChangeText={setReason} placeholder="توضیحات…" placeholderTextColor={C.muted} />

      {cfg.attach && (
        <TouchableOpacity style={s.attachBtn} onPress={pickAttach}><Text style={s.attachT}>{attach ? `✓ ${attach.name}` : '📎 الصاق پیوست (تصویر/PDF)'}</Text></TouchableOpacity>
      )}

      <TouchableOpacity style={[s.btn, busy && { opacity: 0.6 }]} disabled={busy} onPress={submit}>
        <Text style={s.btnT}>{busy ? 'در حال ارسال…' : 'ارسال درخواست'}</Text>
      </TouchableOpacity>

      <Modal visible={subOpen} transparent animationType="slide" onRequestClose={() => setSubOpen(false)}>
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>انتخاب نیروی جایگزین</Text>
            <Text style={s.modalHint}>فقط افرادی که برای این بازهٔ زمانی در دسترس‌اند قابل انتخاب‌اند.</Text>
            {subLoading ? <ActivityIndicator color={C.brand} style={{ marginVertical: 16 }} /> : (
              <ScrollView style={{ maxHeight: 360 }}>
                <TouchableOpacity style={s.subRow} onPress={() => { setSub(null); setSubOpen(false); }}>
                  <Text style={s.subRowT}>بدون جایگزین</Text>
                </TouchableOpacity>
                {subs.length === 0 ? <Text style={s.muted}>نیروی جایگزینی تعریف نشده است.</Text> :
                  subs.map((x) => (
                    <TouchableOpacity key={x.id} style={[s.subRow, x.available === false && { opacity: 0.5 }]}
                      disabled={x.available === false}
                      onPress={() => { setSub(x); setSubOpen(false); }}>
                      <Text style={s.subRowT}>{x.name}{x.role_title ? ` (${x.role_title})` : ''}</Text>
                      <Text style={[s.subRowS, { color: x.available === false ? C.danger : C.ok }]}>
                        {x.available === false ? `در دسترس نیست — ${x.reason || ''}` : '✓ در دسترس'}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            )}
            <TouchableOpacity style={s.modalClose} onPress={() => setSubOpen(false)}><Text style={s.modalCloseT}>بستن</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function MyRequests() {
  const [rows, setRows] = useState(null);
  const [bal, setBal] = useState(null);
  useEffect(() => {
    request('/my/requests').then(setRows).catch(() => setRows([]));
    request('/my/leave-balance').then(setBal).catch(() => {});
  }, []);
  if (!rows) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;
  const TY = { annual: 'مرخصی استحقاقی', sick: 'مرخصی استعلاجی', mission: 'ماموریت', overtime: 'اضافه‌کار', manual: 'تردد دستی' };
  const num = (x) => (x == null ? '∞' : String(Math.round((x + Number.EPSILON) * 10) / 10));
  return (
    <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 56 }}>
      {bal && (
        <View style={s.balCard}>
          <Text style={s.balTitle}>مانده مرخصی (ماه جاری / سال)</Text>
          {[['annual_daily', 'استحقاقی روزانه', 'روز'], ['annual_hourly', 'استحقاقی ساعتی', 'ساعت'], ['sick_daily', 'استعلاجی روزانه', 'روز'], ['sick_hourly', 'استعلاجی ساعتی', 'ساعت']].map(([k, l, un]) => {
            const b = (bal.balance || {})[k] || {};
            if (!b.cap_month && !b.cap_year) return null;
            return (
              <View key={k} style={s.balRow}>
                <Text style={s.balL}>{l}</Text>
                <Text style={s.balV}>مانده ماه: <Text style={{ color: C.ok }}>{num(b.left_month)}</Text> / سال: <Text style={{ color: C.ok }}>{num(b.left_year)}</Text> {un}</Text>
              </View>
            );
          })}
          {!['annual_daily', 'annual_hourly', 'sick_daily', 'sick_hourly'].some((k) => { const b = (bal.balance || {})[k] || {}; return b.cap_month || b.cap_year; }) && <Text style={s.muted}>سقفی تعریف نشده (نامحدود).</Text>}
        </View>
      )}
      {!rows.length ? <Text style={[s.muted, { padding: 20 }]}>درخواستی ثبت نکرده‌اید.</Text> : rows.map((r) => {
        const st = STATUS[r.status] || ['—', C.muted];
        return (
          <View key={r.id} style={s.card}>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
              <Text style={s.cardT}>{TY[r.type] || r.type} {r.unit === 'hourly' ? '(ساعتی)' : r.unit === 'daily' ? '(روزانه)' : ''}</Text>
              <View style={[s.badge, { backgroundColor: st[1] + '22' }]}><Text style={{ color: st[1], fontFamily: FONT.bold, fontSize: 11 }}>{st[0]}</Text></View>
            </View>
            <Text style={s.cardMeta}>{r.the_date || r.from_jdate}{r.to_jdate && r.to_jdate !== r.from_jdate ? ` تا ${r.to_jdate}` : ''}{r.from_time ? `  ${r.from_time}–${r.to_time}` : ''}{r.in_time ? `  ورود ${r.in_time} خروج ${r.out_time || '—'}` : ''}</Text>
            {r.reason ? <Text style={s.cardReason}>{r.reason}</Text> : null}
            {r.approver_note ? <Text style={[s.cardReason, { color: C.danger }]}>پاسخ: {r.approver_note}</Text> : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

function Field({ label, v, on, hint }) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} value={v} onChangeText={on} placeholder={hint} placeholderTextColor={C.muted} />
    </View>
  );
}

async function fileToB64(uri) {
  const res = await fetch(uri); const blob = await res.blob();
  return new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(blob); });
}

const s = StyleSheet.create({
  subBtn: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 10, padding: 12 },
  subBtnT: { fontFamily: FONT.regular, color: C.ink, fontSize: 13.5, textAlign: 'right' },
  subWarn: { fontFamily: FONT.regular, color: C.danger, fontSize: 12, textAlign: 'right', marginTop: 5 },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '75%' },
  modalTitle: { fontFamily: FONT.bold, color: C.ink, fontSize: 15, textAlign: 'right', marginBottom: 4 },
  modalHint: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, textAlign: 'right', marginBottom: 10 },
  subRow: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 7 },
  subRowT: { fontFamily: FONT.bold, color: C.ink, fontSize: 13.5, textAlign: 'right' },
  subRowS: { fontFamily: FONT.regular, fontSize: 11.5, textAlign: 'right', marginTop: 3 },
  modalClose: { backgroundColor: C.ink, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 6 },
  modalCloseT: { color: '#fff', fontFamily: FONT.bold },
  wrap: { flex: 1, backgroundColor: C.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabbar: { flexDirection: 'row-reverse', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.line },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabOn: { borderBottomWidth: 2, borderBottomColor: C.brand },
  tabT: { fontFamily: FONT.regular, color: C.muted, fontSize: 14 },
  tabTOn: { color: C.brand, fontFamily: FONT.bold },
  label: { fontFamily: FONT.bold, fontSize: 13, color: C.ink, textAlign: 'right', marginTop: 12, marginBottom: 5 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 11, padding: 11, fontFamily: FONT.regular, fontSize: 14, textAlign: 'right', color: C.ink },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: C.line, borderRadius: 18, paddingVertical: 7, paddingHorizontal: 13, backgroundColor: '#fff' },
  chipOn: { backgroundColor: C.brand, borderColor: C.brand },
  chipT: { fontFamily: FONT.regular, fontSize: 12.5, color: C.ink },
  chipTOn: { color: '#fff', fontFamily: FONT.bold },
  muted: { fontFamily: FONT.regular, color: C.muted, fontSize: 13, textAlign: 'center' },
  attachBtn: { borderWidth: 1, borderColor: C.brand, borderRadius: 11, paddingVertical: 12, alignItems: 'center', marginTop: 12, backgroundColor: '#e7f3ee' },
  attachT: { color: C.brand, fontFamily: FONT.bold, fontSize: 13 },
  btn: { backgroundColor: C.brand, borderRadius: 13, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  btnT: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: C.line },
  cardT: { fontFamily: FONT.bold, color: C.ink, fontSize: 14 },
  cardMeta: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, textAlign: 'right', marginTop: 5 },
  cardReason: { fontFamily: FONT.regular, color: C.slate, fontSize: 12.5, textAlign: 'right', marginTop: 5 },
  badge: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 9 },
  balCard: { backgroundColor: '#fff', borderRadius: 12, padding: 13, marginBottom: 12, borderWidth: 1, borderColor: C.line },
  balTitle: { fontFamily: FONT.bold, color: C.ink, fontSize: 13, textAlign: 'right', marginBottom: 8 },
  balRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderTopWidth: 1, borderTopColor: C.line },
  balL: { fontFamily: FONT.regular, color: C.slate, fontSize: 12.5 },
  balV: { fontFamily: FONT.regular, color: C.muted, fontSize: 12 },
});
