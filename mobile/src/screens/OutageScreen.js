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

  const load = () => {
    Promise.all([
      request('/my/nobat-lines').catch(() => []),
      request('/my/outages').catch(() => []),
      getAppConfig().catch(() => ({})),
    ]).then(([l, h, cfg]) => { setLines(l); setHistory(h); setReasons((cfg && cfg.outage_reasons) || []); setLoading(false); });
  };
  useEffect(load, []);

  const pickedLine = lines.find((l) => l.id === lineId);
  const filteredLines = lines.filter((l) =>
    !lineQ || String(l.code).indexOf(lineQ) >= 0 ||
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
        try { await request(`/outages/${h.id}/resolve`, { method: 'POST', body: {} });
          Alert.alert('ثبت شد', 'زمان وصل شدن سامانه ثبت شد.'); load();
        } catch (e) { Alert.alert('خطا', e.message || 'ثبت ناموفق'); }
      } },
    ]);
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;
  const hm = (m) => `${faNum(Math.floor((m || 0) / 60))}:${faNum(String((m || 0) % 60).padStart(2, '0'))}`;

  return (
    <ScrollView style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
      <Text style={s.label}>تاریخ قطعی (امروز — غیرقابل تغییر)</Text>
      <View style={[s.input, s.fixedDate]}><Text style={s.fixedDateTxt}>{faNum(date)}</Text></View>

      <Text style={s.label}>زمان شروع قطعی</Text>
      <TouchableOpacity style={s.select} onPress={() => setStartOpen(true)}>
        <Text style={[s.selectTxt, !start && { color: C.muted }]}>{start ? faNum(start) : 'انتخاب ساعت شروع'}</Text>
        <Text>🕐</Text>
      </TouchableOpacity>
      <TimePicker visible={startOpen} onClose={() => setStartOpen(false)} initial={start || '09:00'} onSelect={setStart} />

      <Text style={s.label}>خط</Text>
      <TouchableOpacity style={s.select} onPress={() => setLineOpen(true)}>
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
            <TextInput style={s.input} value={lineQ} onChangeText={setLineQ} placeholder="جستجو بر اساس شماره یا نام خط" placeholderTextColor={C.muted} autoFocus />
            <FlatList data={filteredLines} keyExtractor={(it) => String(it.id)} style={{ maxHeight: 340, marginTop: 8 }}
              ListEmptyComponent={<Text style={s.empty}>خطی یافت نشد.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.optRow} onPress={() => { setLineId(item.id); setLineOpen(false); }}>
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

      <TouchableOpacity style={[s.btn, busy && { opacity: 0.6 }]} disabled={busy} onPress={submit}><Text style={s.btnTxt}>{busy ? 'در حال ثبت…' : 'ثبت قطعی سامانه'}</Text></TouchableOpacity>

      <Text style={[s.label, { marginTop: 22 }]}>قطعی‌های ثبت‌شدهٔ شما</Text>
      {history.length === 0 && <Text style={s.empty}>هنوز قطعی‌ای ثبت نکرده‌اید.</Text>}
      {history.map((h) => {
        const open = !h.end_time;
        return (
          <View key={h.id} style={[s.histCard, open && { borderColor: C.danger, borderWidth: 1.5 }]}>
            <Text style={s.histTitle}>خط {faNum(h.line_code)} {open ? '— 🔴 قطعی باز (در حال قطعی)' : `— ${hm(h.minutes)} ساعت قطعی`}</Text>
            <Text style={s.histTime}>{faNum(h.outage_date)} · شروع: {faNum(h.start_time)}{h.end_time ? ` · پایان: ${faNum(h.end_time)}` : ''}</Text>
            {!!h.reason && <Text style={s.histNote}>علت: {h.reason}</Text>}
            {!!h.note && <Text style={s.histNote}>{h.note}</Text>}
            {open && (
              <TouchableOpacity style={s.resolveBtn} onPress={() => resolveOutage(h)}>
                <Text style={s.resolveTxt}>✓ وصل شد (ثبت زمان پایان)</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },
  label: { fontFamily: FONT.bold, color: C.ink, fontSize: 13.5, marginBottom: 8, marginTop: 12, textAlign: 'right' },
  input: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 12, textAlign: 'right', fontFamily: FONT.regular, color: C.ink },
  fixedDate: { backgroundColor: '#f0f2f7', flexDirection: 'row-reverse', alignItems: 'center' },
  fixedDateTxt: { fontFamily: FONT.bold, color: C.slate, fontSize: 15 },
  select: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 13, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  selectTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 13.5, textAlign: 'right', flex: 1 },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 99, paddingVertical: 8, paddingHorizontal: 14 },
  chipOn: { backgroundColor: C.brand, borderColor: C.brand },
  chipTxt: { fontFamily: FONT.regular, color: C.ink, fontSize: 12.5 },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '80%' },
  modalTitle: { fontFamily: FONT.bold, color: C.ink, fontSize: 15, textAlign: 'right', marginBottom: 10 },
  optRow: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  optName: { fontFamily: FONT.bold, color: C.ink, fontSize: 14, textAlign: 'right' },
  optSub: { fontFamily: FONT.regular, color: C.muted, fontSize: 11.5, textAlign: 'right', marginTop: 2 },
  modalClose: { backgroundColor: C.ink, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 6 },
  modalCloseTxt: { color: '#fff', fontFamily: FONT.bold },
  btn: { backgroundColor: C.brand, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 16 },
  btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 },
  empty: { color: C.muted, fontFamily: FONT.regular, textAlign: 'center', paddingVertical: 12 },
  histCard: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 9 },
  histTitle: { fontFamily: FONT.bold, color: C.ink, textAlign: 'right' },
  histNote: { fontFamily: FONT.regular, color: C.ink, fontSize: 12.5, textAlign: 'right', marginTop: 2 },
  histTime: { fontFamily: FONT.regular, color: C.muted, fontSize: 11, textAlign: 'right', marginTop: 4 },
  resolveBtn: { backgroundColor: C.brand, borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 10 },
  resolveTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 13 },
});
