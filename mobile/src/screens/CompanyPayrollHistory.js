import React, { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Modal, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { request } from '../api';
import { C, FONT } from '../theme';
import { faNum } from '../num';
import ActivityIndicator from '../components/PulseLoadingIndicator';

const amount = (value, maximumFractionDigits = 0) => value === null || value === undefined || value === '' ? '—' : Number(value).toLocaleString('fa-IR', { maximumFractionDigits });
const digits = value => String(value).replace(/[۰-۹]/g, character => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(character))).replace(/[٠-٩]/g, character => String('٠١٢٣٤٥٦٧٨٩'.indexOf(character))).replace(/\D/g, '');

export default function CompanyPayrollHistory() {
  const { width: screenWidth } = useWindowDimensions();
  const detailColumns = screenWidth >= 600 ? 3 : 2;
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [filters, setFilters] = useState({ year: '', month: '', page: 1 });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [opening, setOpening] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const detailLock = useRef(false);
  const mounted = useRef(false);
  useFocusEffect(useCallback(() => {
    let alive = true;
    mounted.current = true;
    setBusy(true);
    setError('');
    const query = `year=${encodeURIComponent(filters.year)}&month=${encodeURIComponent(filters.month)}&page=${filters.page}`;
    request(`/my/payroll?${query}`, { noStore: true }).then(value => {
      if (alive) setResult(value);
    }).catch(failure => {
      if (alive) { setResult(null); setError(failure.message || 'دریافت وضعیت حقوق ناموفق بود.'); }
    }).finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; mounted.current = false; };
  }, [filters, refresh]));
  const applyFilters = () => {
    const selectedYear = digits(year);
    const selectedMonth = digits(month);
    if ((selectedYear && (Number(selectedYear) < 1300 || Number(selectedYear) > 1500)) || (selectedMonth && (Number(selectedMonth) < 1 || Number(selectedMonth) > 12))) {
      Alert.alert('فیلتر نامعتبر', 'سال شمسی و ماه بین ۱ تا ۱۲ وارد کنید.');
      return;
    }
    setFilters({ year: selectedYear, month: selectedMonth, page: 1 });
  };
  const openDetail = async id => {
    if (detailLock.current) return;
    detailLock.current = true;
    setOpening(true);
    try {
      const value = await request(`/my/payroll/${id}`, { noStore: true });
      if (mounted.current) setDetail(value);
    } catch (failure) {
      if (mounted.current) Alert.alert('خطا', failure.message || 'جزئیات فیش دریافت نشد.');
    } finally {
      detailLock.current = false;
      if (mounted.current) setOpening(false);
    }
  };
  return <View style={styles.root}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>حقوق اعلامی شرکت</Text>
      <Text style={styles.note}>مبالغ به ریال و مطابق فایل شرکت هستند. درج مبلغ، به‌تنهایی تأیید واریز بانکی نیست.</Text>
      <View style={styles.row}>
        <TextInput accessibilityLabel="سال حقوق" style={styles.input} placeholder="همهٔ سال‌ها" keyboardType="number-pad" value={year} maxLength={4} onChangeText={setYear} />
        <TextInput accessibilityLabel="ماه حقوق" style={styles.input} placeholder="همهٔ ماه‌ها" keyboardType="number-pad" value={month} maxLength={2} onChangeText={setMonth} />
      </View>
      <View style={styles.row}>
        <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={applyFilters}><Text style={styles.buttonText}>اعمال فیلتر</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => setRefresh(value => value + 1)}><Text style={styles.buttonText}>تازه‌سازی</Text></TouchableOpacity>
      </View>
      {busy ? <ActivityIndicator color={C.brand} /> : error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : result && <>
        <Text style={styles.note}>{faNum(result.summary.count)} فیش · جمع خالص {amount(result.summary.total_net)} ریال</Text>
        {!result.rows.length && <Text style={styles.note}>اطلاعات حقوقی برای این بازه ثبت نشده است. فیش‌های پیوستی در تب دیگر قرار دارند.</Text>}
        {result.rows.map(row => <View style={styles.card} key={row.id}>
          <Text style={styles.heading}>حقوق {faNum(`${row.period_jy}/${String(row.period_jm).padStart(2, '0')}`)}</Text>
          <Text style={styles.label}>{row.employee_name}</Text>
          <Text style={styles.label}>خالص اعلامی: {amount(row.net)} ریال</Text>
          <Text style={styles.note}>{row.role_title}</Text>
          <TouchableOpacity accessibilityRole="button" disabled={opening} style={[styles.button, opening && styles.disabled]} onPress={() => openDetail(row.id)}><Text style={styles.buttonText}>{opening ? 'در حال دریافت…' : 'جزئیات حقوق و کسورات'}</Text></TouchableOpacity>
        </View>)}
        <View style={styles.row}>
          <TouchableOpacity accessibilityRole="button" disabled={filters.page <= 1} style={[styles.button, filters.page <= 1 && styles.disabled]} onPress={() => setFilters(value => ({ ...value, page: value.page - 1 }))}><Text style={styles.buttonText}>قبلی</Text></TouchableOpacity>
          <Text style={styles.label}>{faNum(filters.page)}</Text>
          <TouchableOpacity accessibilityRole="button" disabled={filters.page * result.page_size >= Number(result.summary.count)} style={[styles.button, filters.page * result.page_size >= Number(result.summary.count) && styles.disabled]} onPress={() => setFilters(value => ({ ...value, page: value.page + 1 }))}><Text style={styles.buttonText}>بعدی</Text></TouchableOpacity>
        </View>
      </>}
    </ScrollView>
    <Modal visible={!!detail} animationType="slide" onRequestClose={() => setDetail(null)}>
      <View style={styles.root}><TouchableOpacity accessibilityRole="button" style={[styles.button, { margin: 16 }]} onPress={() => setDetail(null)}><Text style={styles.buttonText}>بستن جزئیات</Text></TouchableOpacity>
        <ScrollView contentContainerStyle={styles.content}>{detail && <>
          <Text style={styles.heading}>{detail.row.employee_name} — {faNum(`${detail.row.period_jy}/${detail.row.period_jm}`)}</Text>
          <Text style={styles.note}>اطلاعات اعلامی شرکت — مبالغ ریال</Text>
          {(detail.row.warnings || []).map((warning, index) => <Text key={index} style={styles.error}>{warning}</Text>)}
          <View style={styles.detailsGrid}>{detail.fields.map((field, index) => <View style={[styles.detailCell, { width: detailColumns === 3 ? '31.8%' : '48.5%' }]} key={field}><Text style={styles.detailTitle}>{detail.labels[index]}</Text><Text style={styles.detailValue} numberOfLines={3}>{index < 7 ? (detail.row.data[field] || '—') : amount(detail.row.data[field], 6)}</Text></View>)}</View>
        </>}</ScrollView>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  content: { padding: 16, paddingBottom: 32 },
  heading: { fontFamily: FONT.bold, fontSize: 19, color: C.ink, textAlign: 'right', marginBottom: 10 },
  label: { fontFamily: FONT.regular, color: C.ink, textAlign: 'right', fontSize: 15, flexShrink: 1 },
  note: { fontFamily: FONT.regular, color: C.slate, textAlign: 'right', lineHeight: 24, marginBottom: 12 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 12 },
  input: { flex: 1, minHeight: 48, backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 10, padding: 10, fontFamily: FONT.regular, textAlign: 'right', color: C.ink },
  button: { flexGrow: 1, minHeight: 46, padding: 12, backgroundColor: C.brand, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: FONT.bold, color: '#fff', textAlign: 'center' },
  card: { padding: 16, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', marginBottom: 12, gap: 8 },
  detailsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 9 },
  detailCell: { minHeight: 68, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: C.line, paddingHorizontal: 10, paddingVertical: 9, justifyContent: 'center' },
  detailTitle: { fontFamily: FONT.regular, fontSize: 13, color: C.slate, textAlign: 'right', marginBottom: 5 },
  detailValue: { fontFamily: FONT.bold, fontSize: 16, color: C.ink, textAlign: 'right' },
  error: { fontFamily: FONT.regular, color: '#b42318', textAlign: 'right', paddingVertical: 12 },
  disabled: { opacity: 0.45 },
});
