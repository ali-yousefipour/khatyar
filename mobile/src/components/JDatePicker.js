import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { C, FONT } from '../theme';
import { jToday } from '../jdate';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const J_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const FA = '۰۱۲۳۴۵۶۷۸۹';
const fa = (s) => String(s ?? '').replace(/[0-9]/g, (d) => FA[+d]);
const ascii = (s) => String(s ?? '').replace(/[۰-۹]/g, d => String(FA.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
function normalizeInitial(initial, fallbackYear) {
  try {
    if (Array.isArray(initial)) {
      const jy = Number(ascii(initial[0])); const jm = Number(ascii(initial[1])); const jd = Number(ascii(initial[2]));
      if (Number.isFinite(jy) && Number.isFinite(jm) && Number.isFinite(jd)) return { jy, jm, jd };
    }
    if (initial && typeof initial === 'object') {
      const jy = Number(ascii(initial.jy ?? initial.year)); const jm = Number(ascii(initial.jm ?? initial.month)); const jd = Number(ascii(initial.jd ?? initial.day));
      if (Number.isFinite(jy) && Number.isFinite(jm) && Number.isFinite(jd)) return { jy, jm, jd };
    }
    if (typeof initial === 'string' && initial.trim()) {
      const parts = ascii(initial).replace(/[/.]/g, '-').split('-').map((x) => Number(x));
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
function jMonthLen(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  // The Jalali calendar occasionally has a five-year leap gap; a simple
  // 33-year modulo rule incorrectly rejects 1408/12/30 and accepts 1407/12/30.
  // Match the conversion algorithm already used for the API date payload.
  const [y1, m1, d1] = j2g(jy, 1, 1);
  const [y2, m2, d2] = j2g(jy + 1, 1, 1);
  const yearDays = (Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000;
  return yearDays === 366 ? 30 : 29;
}
export function jToStr(jy, jm, jd) { const [gy, gm, gd] = j2g(jy, jm, jd); const p = (n) => String(n).padStart(2, '0'); return `${gy}-${p(gm)}-${p(gd)}`; }
export function jLabel(jy, jm, jd) { return `${fa(jy)}/${fa(String(jm).padStart(2, '0'))}/${fa(String(jd).padStart(2, '0'))}`; }
export default function JDatePicker({ visible, onClose, onSelect, initial, minYear = 1300, maxYear }) {
  const insets = useSafeAreaInsets();
  const todayArr = jToday();
  const today = { jy: Number(todayArr?.[0]) || 1405, jm: Number(todayArr?.[1]) || 1, jd: Number(todayArr?.[2]) || 1 };
  // برای تاریخ‌های اعتبار مدارک (گواهینامه، بیمه، معاینه فنی و موارد مشابه)
  // انتخاب سال‌های آینده نیز باید ممکن باشد. در صورت تعیین maxYear توسط مصرف‌کننده، همان مقدار محترم است.
  const maxY = maxYear || (today.jy + 10);
  const init = normalizeInitial(initial, Math.min(today.jy, maxY));
  const [jy, setJy] = useState(init.jy);
  const [jm, setJm] = useState(init.jm);
  const [selectedDate, setSelectedDate] = useState(init);
  const [mode, setMode] = useState('day');
  useEffect(() => {
    if (visible) {
      const next = normalizeInitial(initial, Math.min(today.jy, maxY));
      setJy(Math.max(minYear, Math.min(maxY, next.jy)));
      setJm(Math.max(1, Math.min(12, next.jm)));
      setSelectedDate({jy:Math.max(minYear,Math.min(maxY,next.jy)),jm:Math.max(1,Math.min(12,next.jm)),jd:Math.max(1,Math.min(jMonthLen(Math.max(minYear,Math.min(maxY,next.jy)), Math.max(1,Math.min(12,next.jm))),next.jd))});
      setMode('day');
    }
  }, [visible, initial, minYear, maxY]);
  const safeJy = Number.isFinite(Number(jy)) ? Number(jy) : Math.min(today.jy, maxY);
  const safeJm = Number.isFinite(Number(jm)) ? Number(jm) : 1;
  const len = jMonthLen(safeJy, safeJm);
  const days = Array.from({ length: len }, (_, i) => i + 1);
  const years = Array.from({ length: Math.max(1, maxY - minYear + 1) }, (_, i) => maxY - i);
  const canGoPrevious = safeJy > minYear || safeJm > 1;
  const canGoNext = safeJy < maxY || safeJm < 12;
  const todayAllowed = today.jy >= minYear && today.jy <= maxY;
  return (
    <Modal visible={!!visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.bg}>
        <View style={[s.card, { paddingBottom: Math.max(18, insets.bottom + 12) }]}>
          <View style={s.head}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="ماه قبل" style={s.monthNavButton} accessibilityState={{ disabled: !canGoPrevious }} disabled={!canGoPrevious} onPress={() => { if (safeJm === 1) { setJm(12); setJy(safeJy - 1); } else setJm(safeJm - 1); }}><Text allowFontScaling style={[s.nav, !canGoPrevious && s.navDisabled]}>‹</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="انتخاب سال" onPress={() => setMode(mode === 'year' ? 'day' : 'year')}>
              <Text allowFontScaling style={s.title}>{J_MONTHS[safeJm - 1]} {fa(safeJy)}</Text>
              <Text allowFontScaling style={s.hint}>برای انتخاب سال لمس کنید</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="ماه بعد" style={s.monthNavButton} accessibilityState={{ disabled: !canGoNext }} disabled={!canGoNext} onPress={() => { if (safeJm === 12) { setJm(1); setJy(safeJy + 1); } else setJm(safeJm + 1); }}><Text allowFontScaling style={[s.nav, !canGoNext && s.navDisabled]}>›</Text></TouchableOpacity>
          </View>
          <View style={s.tabs}>
            <TouchableOpacity accessibilityRole="tab" accessibilityState={{selected:mode==='day'}} style={[s.tab, mode === 'day' && s.tabOn]} onPress={() => setMode('day')}><Text allowFontScaling style={[s.tabTxt, mode === 'day' && s.tabTxtOn]}>روز</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="tab" accessibilityState={{selected:mode==='month'}} style={[s.tab, mode === 'month' && s.tabOn]} onPress={() => setMode('month')}><Text allowFontScaling style={[s.tabTxt, mode === 'month' && s.tabTxtOn]}>ماه</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="tab" accessibilityState={{selected:mode==='year'}} style={[s.tab, mode === 'year' && s.tabOn]} onPress={() => setMode('year')}><Text allowFontScaling style={[s.tabTxt, mode === 'year' && s.tabTxtOn]}>سال</Text></TouchableOpacity>
          </View>
          {mode === 'day' && <ScrollView contentContainerStyle={s.grid}>
            {days.map((d) => (
              <TouchableOpacity key={d} accessibilityRole="button" accessibilityLabel={`${fa(d)} ${J_MONTHS[safeJm - 1]}${safeJy === today.jy && safeJm === today.jm && d === today.jd ? '، امروز' : ''}`} accessibilityState={{selected:selectedDate.jy===safeJy && selectedDate.jm===safeJm && selectedDate.jd===d}} style={[s.day, safeJy === today.jy && safeJm === today.jm && d === today.jd && s.todayDay, selectedDate.jy===safeJy && selectedDate.jm===safeJm && selectedDate.jd===d && s.selected]} onPress={() => { setSelectedDate({jy:safeJy,jm:safeJm,jd:d}); onSelect({ jy: safeJy, jm: safeJm, jd: d, gStr: jToStr(safeJy, safeJm, d), label: jLabel(safeJy, safeJm, d) }); onClose && onClose(); }}>
                <Text allowFontScaling style={[s.dayTxt, safeJy === today.jy && safeJm === today.jm && d === today.jd && s.todayDayTxt, selectedDate.jy===safeJy && selectedDate.jm===safeJm && selectedDate.jd===d && s.selectedTxt]}>{fa(d)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>}
          {mode === 'month' && <ScrollView contentContainerStyle={s.grid}>
            {J_MONTHS.map((m, idx) => (
              <TouchableOpacity key={m} accessibilityRole="button" accessibilityLabel={m} accessibilityState={{selected:safeJm===idx+1}} style={[s.month, safeJm === idx + 1 && s.selected]} onPress={() => { setJm(idx + 1); setMode('day'); }}>
                <Text allowFontScaling style={[s.dayTxt, safeJm === idx + 1 && s.selectedTxt]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>}
          {mode === 'year' && <ScrollView contentContainerStyle={s.grid}>
            {years.map((y) => (
              <TouchableOpacity key={y} accessibilityRole="button" accessibilityLabel={'سال '+fa(y)} accessibilityState={{selected:safeJy===y}} style={[s.year, safeJy === y && s.selected]} onPress={() => { setJy(y); setMode('month'); }}>
                <Text allowFontScaling style={[s.dayTxt, safeJy === y && s.selectedTxt]}>{fa(y)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>}
          <View style={s.footer}><TouchableOpacity style={[s.todayAction, !todayAllowed && s.actionDisabled]} disabled={!todayAllowed} accessibilityRole="button" accessibilityLabel="انتخاب تاریخ امروز" accessibilityState={{ disabled: !todayAllowed }} onPress={() => { onSelect({ ...today, gStr: jToStr(today.jy,today.jm,today.jd), label: jLabel(today.jy,today.jm,today.jd) }); onClose && onClose(); }}><Text allowFontScaling style={s.todayActionTxt}>انتخاب امروز</Text></TouchableOpacity><TouchableOpacity style={s.close} onPress={onClose}><Text allowFontScaling style={s.closeTxt}>بستن</Text></TouchableOpacity></View>
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
  monthNavButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  nav: { fontSize: 30, color: C.brand, paddingHorizontal: 10, fontWeight: '700' },
  navDisabled: { opacity: 0.3 },
  actionDisabled: { opacity: 0.4 },
  tabs: { flexDirection: 'row-reverse', backgroundColor: '#eef1f7', borderRadius: 12, padding: 4, marginBottom: 10 },
  tab: { flex: 1, minHeight:44, justifyContent:'center', paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  tabOn: { backgroundColor: C.brand },
  tabTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 12 },
  tabTxtOn: { color: '#fff' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-start', paddingBottom: 8 },
  day: { width: '13%', minHeight:44, aspectRatio: 1, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  todayDay: { backgroundColor: '#e1f5e9', borderColor: C.brand, borderWidth: 2 },
  todayDayTxt: { color: C.brand },
  month: { width: '31%', minHeight: 48, paddingVertical: 10, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  year: { width: '22%', minHeight: 48, paddingVertical: 10, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: C.brand, borderColor: C.brand },
  selectedTxt: { color: '#fff' },
  dayTxt: { fontFamily: FONT.bold, color: C.ink, fontSize: 14 },
  footer: { flexDirection: 'row-reverse', gap: 10, marginTop: 12 },
  todayAction: { flex: 1, minHeight: 48, paddingVertical: 10, backgroundColor: C.brand, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  todayActionTxt: { fontFamily: FONT.bold, color: '#fff' },
  close: { flex: 1, minHeight: 48, paddingVertical: 10, backgroundColor: '#eef1f7', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  closeTxt: { fontFamily: FONT.bold, color: C.ink },
});
