import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { C, FONT } from '../theme';
import { jToday } from '../jdate';
const J_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const FA = '۰۱۲۳۴۵۶۷۸۹';
const fa = (s) => String(s ?? '').replace(/[0-9]/g, (d) => FA[+d]);
function normalizeInitial(initial, fallbackYear) {
  try {
    if (Array.isArray(initial)) {
      const jy = Number(initial[0]); const jm = Number(initial[1]); const jd = Number(initial[2]);
      if (Number.isFinite(jy) && Number.isFinite(jm) && Number.isFinite(jd)) return { jy, jm, jd };
    }
    if (initial && typeof initial === 'object') {
      const jy = Number(initial.jy ?? initial.year); const jm = Number(initial.jm ?? initial.month); const jd = Number(initial.jd ?? initial.day);
      if (Number.isFinite(jy) && Number.isFinite(jm) && Number.isFinite(jd)) return { jy, jm, jd };
    }
    if (typeof initial === 'string' && initial.trim()) {
      const parts = initial.replace(/[/.]/g, '-').split('-').map((x) => Number(x));
      if (parts.length === 3 && parts.every(Number.isFinite)) return { jy: parts[0], jm: parts[1], jd: parts[2] };
    }
  } catch (e) {}
  const t = jToday();
  return { jy: Number(fallbackYear) || Number(t?.[0]) || 1405, jm: Number(t?.[1]) || 1, jd: Number(t?.[2]) || 1 };
}
function j2g(jy, jm, jd) {
  jy = Number(jy); jm = Number(jm); jd = Number(jd);
  if (!Number.isFinite(jy) || !Number.isFinite(jm) || !Number.isFinite(jd)) return [1970, 1, 1];
  let gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;
  let days = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + 78 + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097); days %= 146097;
  if (days > 36524) { gy += 100 * Math.floor(--days / 36524); days %= 36524; if (days >= 365) days++; }
  gy += 4 * Math.floor(days / 1461); days %= 1461;
  if (days > 365) { gy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  let gd = days + 1;
  const sal_a = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
  return [gy, gm, gd];
}
function jMonthLen(jy, jm) { if (jm <= 6) return 31; if (jm <= 11) return 30; const isLeap = ((jy % 33) % 4) === 1; return isLeap ? 30 : 29; }
export function jToStr(jy, jm, jd) { const [gy, gm, gd] = j2g(jy, jm, jd); const p = (n) => String(n).padStart(2, '0'); return `${gy}-${p(gm)}-${p(gd)}`; }
export function jLabel(jy, jm, jd) { return `${fa(jy)}/${fa(String(jm).padStart(2, '0'))}/${fa(String(jd).padStart(2, '0'))}`; }
export default function JDatePicker({ visible, onClose, onSelect, initial, minYear = 1300, maxYear }) {
  const todayArr = jToday();
  const today = { jy: Number(todayArr?.[0]) || 1405, jm: Number(todayArr?.[1]) || 1, jd: Number(todayArr?.[2]) || 1 };
  const maxY = maxYear || today.jy;
  const init = normalizeInitial(initial, Math.min(today.jy, maxY));
  const [jy, setJy] = useState(init.jy);
  const [jm, setJm] = useState(init.jm);
  const [mode, setMode] = useState('day');
  useEffect(() => {
    if (visible) {
      const next = normalizeInitial(initial, Math.min(today.jy, maxY));
      setJy(Math.max(minYear, Math.min(maxY, next.jy)));
      setJm(Math.max(1, Math.min(12, next.jm)));
      setMode('day');
    }
  }, [visible, initial, minYear, maxY]);
  const safeJy = Number.isFinite(Number(jy)) ? Number(jy) : Math.min(today.jy, maxY);
  const safeJm = Number.isFinite(Number(jm)) ? Number(jm) : 1;
  const len = jMonthLen(safeJy, safeJm);
  const days = Array.from({ length: len }, (_, i) => i + 1);
  const years = Array.from({ length: Math.max(1, maxY - minYear + 1) }, (_, i) => maxY - i);
  return (
    <Modal visible={!!visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.bg}>
        <View style={s.card}>
          <View style={s.head}>
            <TouchableOpacity onPress={() => { if (safeJm === 1) { setJm(12); setJy(Math.max(minYear, safeJy - 1)); } else setJm(safeJm - 1); }}><Text style={s.nav}>‹</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setMode(mode === 'year' ? 'day' : 'year')}>
              <Text style={s.title}>{J_MONTHS[safeJm - 1]} {fa(safeJy)}</Text>
              <Text style={s.hint}>برای انتخاب سال لمس کنید</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { if (safeJm === 12) { setJm(1); setJy(Math.min(maxY, safeJy + 1)); } else setJm(safeJm + 1); }}><Text style={s.nav}>›</Text></TouchableOpacity>
          </View>
          <View style={s.tabs}>
            <TouchableOpacity style={[s.tab, mode === 'day' && s.tabOn]} onPress={() => setMode('day')}><Text style={[s.tabTxt, mode === 'day' && s.tabTxtOn]}>روز</Text></TouchableOpacity>
            <TouchableOpacity style={[s.tab, mode === 'month' && s.tabOn]} onPress={() => setMode('month')}><Text style={[s.tabTxt, mode === 'month' && s.tabTxtOn]}>ماه</Text></TouchableOpacity>
            <TouchableOpacity style={[s.tab, mode === 'year' && s.tabOn]} onPress={() => setMode('year')}><Text style={[s.tabTxt, mode === 'year' && s.tabTxtOn]}>سال</Text></TouchableOpacity>
          </View>
          {mode === 'day' && <ScrollView contentContainerStyle={s.grid}>
            {days.map((d) => (
              <TouchableOpacity key={d} style={s.day} onPress={() => { onSelect({ jy: safeJy, jm: safeJm, jd: d, gStr: jToStr(safeJy, safeJm, d), label: jLabel(safeJy, safeJm, d) }); onClose && onClose(); }}>
                <Text style={s.dayTxt}>{fa(d)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>}
          {mode === 'month' && <ScrollView contentContainerStyle={s.grid}>
            {J_MONTHS.map((m, idx) => (
              <TouchableOpacity key={m} style={[s.month, safeJm === idx + 1 && s.selected]} onPress={() => { setJm(idx + 1); setMode('day'); }}>
                <Text style={[s.dayTxt, safeJm === idx + 1 && s.selectedTxt]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>}
          {mode === 'year' && <ScrollView contentContainerStyle={s.grid}>
            {years.map((y) => (
              <TouchableOpacity key={y} style={[s.year, safeJy === y && s.selected]} onPress={() => { setJy(y); setMode('month'); }}>
                <Text style={[s.dayTxt, safeJy === y && s.selectedTxt]}>{fa(y)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>}
          <TouchableOpacity style={s.close} onPress={onClose}><Text style={s.closeTxt}>بستن</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  card: { backgroundColor: C.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, maxHeight: '82%' },
  head: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontFamily: FONT.bold, fontSize: 17, color: C.ink, textAlign: 'center' },
  hint: { fontFamily: FONT.regular, fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 3 },
  nav: { fontSize: 30, color: C.brand, paddingHorizontal: 16, fontWeight: '700' },
  tabs: { flexDirection: 'row-reverse', backgroundColor: '#eef1f7', borderRadius: 12, padding: 4, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  tabOn: { backgroundColor: C.brand },
  tabTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 12 },
  tabTxtOn: { color: '#fff' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-start', paddingBottom: 8 },
  day: { width: '13%', aspectRatio: 1, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  month: { width: '31%', height: 48, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  year: { width: '22%', height: 46, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: C.brand, borderColor: C.brand },
  selectedTxt: { color: '#fff' },
  dayTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 14 },
  close: { marginTop: 12, backgroundColor: '#eef1f7', borderRadius: 12, padding: 12, alignItems: 'center' },
  closeTxt: { fontFamily: FONT.bold, color: C.ink },
});
