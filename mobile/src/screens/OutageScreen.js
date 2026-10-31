import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, FlatList } from 'react-native';
import { request, postOrQueue } from '../api';
import { C, FONT } from '../theme';
import { fj, todayJalali } from '../jdate';
import { faNum } from '../num';
import { getAppConfig } from '../appconfig';
import TimePicker from '../components/TimePicker';
import ActivityIndicator from '../components/PulseLoadingIndicator';
import ModalKeyboardView from '../components/ModalKeyboardView';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const normalizedDigits = value => String(value ?? '').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

export default function OutageScreen() {
  const [lines, setLines] = useState([]);
  const [lineId, setLineId] = useState(null);
  const [lineQ, setLineQ] = useState('');
  const [lineOpen, setLineOpen] = useState(false);
  const [date] = useState(todayJalali ? todayJalali() : '');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [note, setNote] = useState('');
  const [reasons, setReasons] = useState([]);
  const [reason, setReason] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);

  const load = async () => {
    setRefreshing(true);
    try {
      const [l, h] = await Promise.all([
        request('/my/nobat-lines', { noStore: true }),
        request('/my/outages', { noStore: true }),
      ]);
      const cfg = await getAppConfig().catch(() => null);
      setLines(Array.isArray(l) ? l : []);
      setHistory(Array.isArray(h) ? h : []);
      setReasons(Array.isArray(cfg?.outage_reasons) ? cfg.outage_reasons : []);
      setError('');
    } catch (e) { setError(e?.message || 'دریافت اطلاعات قطعی‌ها ناموفق بود.'); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);

  const pickedLine = lines.find((l) => String(l.id) === String(lineId));
  const filteredLines = lines.filter((l) =>
    !lineQ.trim() || normalizedDigits(l.code).includes(normalizedDigits(lineQ.trim())) ||
    ((l.origin || '') + (l.destination || '')).indexOf(lineQ) >= 0);

  async function submit() {
    if (!lineId) return Alert.alert('توجه', 'انتخاب خط الزامی است.');
    if (!start.trim()) return Alert.alert('توجه', 'زمان شروع قطعی را انتخاب کنید.');
    setBusy(true);
    try {
      const r = await postOrQueue('/outages', { line_id: lineId, outage_date: date, start_time: start, note, reason });
      Alert.alert(r.queued ? 'آفلاین' : 'ثبت شد', r.queued ? 'ذخیره شد و بعداً ارسال می‌شود.' : 'قطعی سامانه ثبت شد. هنگام وصل شدن، دکمهٔ «وصل شد» را بزنید.');
      setStart(''); setNote(''); setReason(null); load();
    } catch (e) { Alert.alert('خطا', e.message || 'ثبت ناموفق'); }
    finally { setBusy(false); }
  }

  async function resolveOutage(h) {
    Alert.alert('وصل شدن سامانه', `آیا سامانهٔ نوبت‌دهی خط ${faNum(h.line_code)} وصل شد؟ زمان پایان با ساعت فعلی ثبت می‌شود.`, [
      { text: 'انصراف', style: 'cancel' },
      { text: 'بله، وصل شد', onPress: async () => {
        try { setResolvingId(h.id); await request(`/outages/${h.id}/resolve`, { method: 'POST', body: {} });
          Alert.alert('ثبت شد', 'زمان وصل شدن سامانه ثبت شد.'); load();
        } catch (e) { Alert.alert('خطا', e.message || 'ثبت ناموفق'); } finally { setResolvingId(null); }
      } },
    ]);
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;
  const hm = (m) => `${faNum(Math.floor((m || 0) / 60))}:${faNum(String((m || 0) % 60).padStart(2, '0'))}`;

  return (
    <ScrollView persistentScrollbar={true} style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
      {!!error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={load} style={s.retry}><Text style={s.retryTxt}>{refreshing ? 'در حال دریافت…' : 'تلاش مجدد'}</Text></TouchableOpacity></View>}
      <View style={s.pageIntro}><MaterialCommunityIcons name="alert-circle-outline" size={27} color={C.brand}/><View style={{flex:1}}><Text style={s.pageTitle}>اعلام قطع سیستم نوبت‌دهی</Text><Text style={s.pageSubtitle}>زمان شروع و خط را مشخص کنید. پس از برقراری سامانه، قطعی را از فهرست زیر ببندید.</Text></View></View>
      <Text style={s.label}>تاریخ قطعی (امروز — غیرقابل تغییر)</Text>
      <View style={[s.input, s.fixedDate]}><Text style={s.fixedDateTxt}>{faNum(date)}</Text></View>

      <Text style={s.label}>زمان شروع قطعی</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="انتخاب زمان شروع قطعی" style={s.select} onPress={() => setStartOpen(true)}>
        <Text style={[s.selectTxt, !start && { color: C.muted }]}>{start ? faNum(start) : 'انتخاب ساعت شروع'}</Text>
        <MaterialCommunityIcons name="clock-outline" color={C.brand} size={22}/>
      </TouchableOpacity>
      <TimePicker visible={startOpen} onClose={() => setStartOpen(false)} initial={start || '09:00'} onSelect={setStart} />

      <Text style={s.label}>خط</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="انتخاب خط نوبت‌دهی" style={s.select} onPress={() => setLineOpen(true)}>
        <Text style={[s.selectTxt, !pickedLine && { color: C.muted }]}>{pickedLine ? `خط ${faNum(pickedLine.code)}${pickedLine.origin ? ` (${pickedLine.origin} - ${pickedLine.destination || ''})` : ''}` : 'انتخاب/جستجوی خط'}</Text>
        <Text style={{ color: C.muted }}>▾</Text>
      </TouchableOpacity>

      {reasons.length > 0 && (<>
        <Text style={s.label}>علت قطعی</Text>
        <View style={s.chips}>
          {reasons.map((rz) => (
            <TouchableOpacity key={rz} style={[s.chip, reason === rz && s.chipOn]} onPress={() => setReason(rz)}>
              <Text style={[s.chipTxt, reason === rz && { color: '#fff' }]}>{rz}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </>)}

      <Modal visible={lineOpen} animationType="slide" transparent onRequestClose={() => setLineOpen(false)}>
        <ModalKeyboardView style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>انتخاب خط</Text>
            <TextInput style={s.input} value={lineQ} onChangeText={setLineQ} placeholder="جستجو بر اساس شماره یا نام خط" placeholderTextColor={C.muted} accessibilityLabel="جستجوی خط" autoFocus />
            <FlatList data={filteredLines} keyExtractor={(it) => String(it.id)} style={{ maxHeight: 340, marginTop: 8 }}
              ListEmptyComponent={<Text style={s.empty}>خطی یافت نشد.</Text>}
              renderItem={({ item }) => (
              <TouchableOpacity accessibilityRole="button" style={s.optRow} onPress={() => { setLineId(item.id); setLineOpen(false); setLineQ(''); }}>
                  <Text style={s.optName}>خط {faNum(item.code)}</Text>
                  {!!item.origin && <Text style={s.optSub}>{item.origin} - {item.destination || ''}</Text>}
                </TouchableOpacity>
              )} />
            <TouchableOpacity style={s.modalClose} onPress={() => setLineOpen(false)}><Text style={s.modalCloseTxt}>بستن</Text></TouchableOpacity>
          </View>
        </ModalKeyboardView>
      </Modal>

      <Text style={s.label}>توضیحات (اختیاری)</Text>
      <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} multiline value={note} onChangeText={setNote} placeholder="توضیحات بیشتر…" placeholderTextColor={C.muted} />

      <TouchableOpacity style={[s.btn, (busy || refreshing || !!error) && { opacity: 0.6 }]} disabled={busy || refreshing || !!error} onPress={submit}><Text style={s.btnTxt}>{busy ? 'در حال ثبت…' : 'ثبت قطعی سامانه'}</Text></TouchableOpacity>

      <Text style={[s.label, { marginTop: 22 }]}>قطعی‌های ثبت‌شدهٔ شما</Text>
      {history.length === 0 && <Text style={s.empty}>هنوز قطعی‌ای ثبت نکرده‌اید.</Text>}
      {history.map((h) => {
        const open = !h.end_time;
        return (
          <View key={h.id} style={[s.histCard, open && { borderColor: C.danger, borderWidth: 1.5 }]}>
            <Text style={s.histTitle}>خط {faNum(h.line_code)} {open ? '— قطعی باز' : `— ${hm(h.minutes)} مدت قطعی`}</Text>
            <Text style={s.histTime}>{faNum(h.outage_date)} · شروع: {faNum(h.start_time)}{h.end_time ? ` · پایان: ${faNum(h.end_time)}` : ''}</Text>
            {!!h.reason && <Text style={s.histNote}>علت: {h.reason}</Text>}
            {!!h.note && <Text style={s.histNote}>{h.note}</Text>}
            {open && (
              <TouchableOpacity accessibilityRole="button" style={[s.resolveBtn,resolvingId===h.id&&{opacity:.55}]} disabled={resolvingId!==null} onPress={() => resolveOutage(h)}>
                <Text style={s.resolveTxt}>{resolvingId===h.id?'در حال ثبت اتصال…':'وصل شد — ثبت زمان پایان'}</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  pageIntro:{flexDirection:'row-reverse',gap:12,alignItems:'center',backgroundColor:'#eaf5f1',borderWidth:1,borderColor:'#c9e5da',borderRadius:18,padding:16,marginBottom:10},
  pageTitle:{fontFamily:FONT.bold,fontSize:17,color:C.brand,textAlign:'right'},
  pageSubtitle:{fontFamily:FONT.regular,fontSize:12,color:C.ink,textAlign:'right',lineHeight:21,marginTop:5},
  errorBox: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#f3b8c0', backgroundColor: '#fff1f1', marginBottom: 12 },
  errorText: { fontFamily: FONT.regular, color: '#982b3d', textAlign: 'right', lineHeight: 22 },
  retry: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 14 },
  retryTxt: { fontFamily: FONT.bold, color: C.brand },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },
  label: { fontFamily: FONT.bold, color: C.ink, fontSize: 13.5, marginBottom: 8, marginTop: 12, textAlign: 'right' },
  input: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 12, textAlign: 'right', fontFamily: FONT.regular, color: C.ink },
  fixedDate: { backgroundColor: '#f0f2f7', flexDirection: 'row-reverse', alignItems: 'center' },
  fixedDateTxt: { fontFamily: FONT.bold, color: C.slate, fontSize: 15 },
  select: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 13, minHeight:52, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  selectTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 13.5, textAlign: 'right', flex: 1 },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 99, minHeight:44,justifyContent:'center',paddingVertical: 8, paddingHorizontal: 14 },
  chipOn: { backgroundColor: C.brand, borderColor: C.brand },
  chipTxt: { fontFamily: FONT.regular, color: C.ink, fontSize: 12.5 },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '80%' },
  modalTitle: { fontFamily: FONT.bold, color: C.ink, fontSize: 15, textAlign: 'right', marginBottom: 10 },
  optRow: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 16, padding: 15, marginBottom: 10 },
  optName: { fontFamily: FONT.bold, color: C.ink, fontSize: 14, textAlign: 'right' },
  optSub: { fontFamily: FONT.regular, color: C.muted, fontSize: 11.5, textAlign: 'right', marginTop: 2 },
  modalClose: { backgroundColor: C.ink, borderRadius: 16, padding: 15, alignItems: 'center', marginTop: 6 },
  modalCloseTxt: { color: '#fff', fontFamily: FONT.bold },
  btn: { backgroundColor: C.brand, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 16 },
  btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 },
  empty: { color: C.muted, fontFamily: FONT.regular, textAlign: 'center', paddingVertical: 12 },
  histCard: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 16, padding: 15, marginBottom: 9 },
  histTitle: { fontFamily: FONT.bold, color: C.ink, textAlign: 'right' },
  histNote: { fontFamily: FONT.regular, color: C.ink, fontSize: 12.5, textAlign: 'right', marginTop: 2 },
  histTime: { fontFamily: FONT.regular, color: C.muted, fontSize: 11, textAlign: 'right', marginTop: 4 },
  resolveBtn: { backgroundColor: C.brand, borderRadius: 10, minHeight:48,padding: 10, alignItems: 'center',justifyContent:'center', marginTop: 10 },
  resolveTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 13 },
});
