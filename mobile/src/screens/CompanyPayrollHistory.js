import React, { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Modal, SafeAreaView, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { request } from '../api';
import { C, FONT } from '../theme';
import { faNum } from '../num';
import ActivityIndicator from '../components/PulseLoadingIndicator';
import { captureRef } from 'react-native-view-shot';
import * as Font from 'expo-font';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import PayrollAccessSlip from '../components/PayrollAccessSlip';

const amount = (value, maximumFractionDigits = 0) => value === null || value === undefined || value === '' ? '—' : Number(value).toLocaleString('fa-IR', { maximumFractionDigits });
const integerMoneyFields = new Set([
  'friday_amount', 'holiday_amount', 'overtime_amount', 'gross',
  'insurance', 'tax', 'net', 'night_amount', 'bonus', 'severance', 'employer_insurance',
]);
const hiddenDetailFields = new Set(['employer_total', 'row', 'row_number', 'row_no', 'radif', 'ردیف']);
const normalizeLabel = value => String(value || '').replace(/[\u200c\s_\-]/g, '').trim().toLowerCase();
const detailGroup = (field, label) => { const key = normalizeLabel(`${field} ${label}`); if (/نام|کدملی|شماره|سمت|ردیف|تاهل|فرزند|پرسنلی|حساب/.test(key) && !/حق|مبلغ/.test(key)) return 'هویتی و شغلی'; if (/بیمه|مالیات|کسور|وام|مساعده|کسر/.test(key)) return 'کسورات'; if (/روز|ساعت|غیبت|مرخصی|اضافه|شبکاری|نوبت|جمعهکاری|تعطیلکاری|کارکرد/.test(key) && !/مبلغ|حق|ریال/.test(key)) return 'کارکرد و زمان'; return 'حقوق و مزایا'; };
const detailGroups = ['هویتی و شغلی','کارکرد و زمان','حقوق و مزایا','کسورات'];
const moneyText = value => {
  if (value === null || value === undefined || value === '') return '—';
  const normalized = String(value).trim()
    .replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
    .replace(/[٠-٩]/g, c => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)))
    .replace(/٫/g, '.').replace(/[٬,\s]/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) && normalized !== ''
    ? Math.round(n).toLocaleString('fa-IR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })
    : String(value);
};
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
  const slipRef = useRef(null);
  const [slip, setSlip] = useState(null);
  const [issuing, setIssuing] = useState(false);
  const [payrollFontsReady, setPayrollFontsReady] = useState(false);
  const ensurePayrollFonts = async () => {
    if (!Font.isLoaded(FONT.payrollHoma) || !Font.isLoaded(FONT.payrollNazanin)) {
      await Font.loadAsync({
        [FONT.payrollHoma]: require('../../assets/fonts/B Homa.ttf'),
        [FONT.payrollNazanin]: require('../../assets/fonts/B NAZANIN.TTF'),
      });
    }
    if (!Font.isLoaded(FONT.payrollHoma) || !Font.isLoaded(FONT.payrollNazanin)) {
      throw new Error('فونت B HOMA یا B NAZANIN بارگذاری نشده است؛ ساخت تصویر متوقف شد.');
    }
    setPayrollFontsReady(true);
  };
  const [issuedMonths, setIssuedMonths] = useState({});
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

  const issueSlip = async row => {
    if (issuing) return;
    Alert.alert('دریافت تصویر فیش حقوق', 'دریافت تصویر فیش حقوق هر ماه حداکثر سه بار مجاز است. تصویر را پس از دریافت در گوشی ذخیره کنید.', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'ادامه', onPress: async () => {
        setIssuing(true);
        try {
          await ensurePayrollFonts();
          const data = await request(`/my/payroll/${row.id}`, { noStore: true });
          setSlip(data);
        } catch (e) { Alert.alert('خطا', e.message || 'دریافت اطلاعات فیش ممکن نشد.'); }
        finally { setIssuing(false); }
      } }
    ]);
  };
  const saveIssuedSlip = async () => {
    if (!slipRef.current || !slip || issuing) return;
    setIssuing(true);
    try {
      // Never capture or consume an issuance while payroll fonts are unavailable.
      if (!payrollFontsReady || !Font.isLoaded(FONT.payrollHoma) || !Font.isLoaded(FONT.payrollNazanin)) {
        throw new Error('فونت‌های فیش آماده نیستند. پیش‌نمایش را دوباره باز کنید.');
      }
      // Render first, then claim the one-time issuance atomically on the server.
      const uri = await captureRef(slipRef, { format: 'png', quality: 1, result: 'tmpfile', width: 2480, height: 1748 });
      const destination = `${FileSystem.documentDirectory}payroll-${slip.row.period_jy}-${slip.row.period_jm}.png`;
      await FileSystem.copyAsync({ from: uri, to: destination });
      let result;
      try {
        result = await request(`/my/payroll/${slip.row.id}/issue`, { method: 'POST', queueIfOffline: false, noStore: true });
        if (!result?.ok || !result.issued || result.queued) throw new Error('صدور فیش در سرور تأیید نشد؛ دوباره تلاش کنید.');
      }
      catch (error) { await FileSystem.deleteAsync(destination, { idempotent: true }); throw error; }
      setIssuedMonths(v => ({ ...v, [`${slip.row.period_jy}-${slip.row.period_jm}`]: Number(result.issued_count || 3) }));
      setRefresh(value => value + 1);
      Alert.alert('تصویر فیش ذخیره شد', `تصویر با کیفیت A5 ذخیره شد. تعداد دریافت‌های باقی‌مانده این ماه: ${faNum(result.remaining ?? 0)}. برای ذخیره در پوشه دلخواه گوشی از اشتراک‌گذاری استفاده کنید.`);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(destination, { mimeType: 'image/png', dialogTitle: 'ذخیره تصویر فیش حقوق' });
      setSlip(null);
    } catch (e) { Alert.alert('صدور یا ذخیره ناموفق', e.message || 'عملیات انجام نشد.'); }
    finally { setIssuing(false); }
  };
  return <View style={styles.root}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}><Text style={styles.heroTitle}>وضعیت حقوق ماهانه</Text><Text style={styles.heroSubtitle}>سوابق حقوق اعلام‌شده توسط شرکت</Text><Text style={styles.heroDisclaimer}>مبالغ به ریال و مطابق فایل شرکت هستند؛ ثبت مبلغ به معنی تأیید واریز بانکی نیست.</Text></View>
      <View style={styles.filterPanel}>
        <Text style={styles.sectionTitle}>جستجو در سوابق</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="تازه‌سازی" style={styles.outlineButton} onPress={() => setRefresh(value => value + 1)}><Text style={styles.outlineButtonText}>تازه‌سازی</Text></TouchableOpacity>
        <View style={styles.row}>
          <TextInput accessibilityLabel="سال حقوق" style={styles.input} placeholder="سال شمسی (همه)" keyboardType="number-pad" value={faNum(year)} maxLength={4} onChangeText={setYear} />
          <TextInput accessibilityLabel="ماه حقوق" style={styles.input} placeholder="ماه (همه)" keyboardType="number-pad" value={faNum(month)} maxLength={2} onChangeText={setMonth} />
        </View>
        <View style={styles.row}>
          <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={applyFilters}><Text style={styles.buttonText}>اعمال فیلتر</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.outlineButton} onPress={() => {setYear('');setMonth('');setFilters({year:'',month:'',page:1});setRefresh(value=>value+1);}}><Text style={styles.outlineButtonText}>پاک‌کردن فیلترها</Text></TouchableOpacity>
        </View>
      </View>
      {busy ? <ActivityIndicator color={C.brand} /> : error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : result && <>
        <View style={styles.summaryPanel}><View style={styles.summaryCell}><Text style={styles.summaryLabel}>تعداد فیش‌ها</Text><Text style={styles.summaryNumber}>{faNum(result.summary.count)}</Text></View><View style={styles.summaryCell}><Text style={styles.summaryLabel}>جمع خالص اعلامی</Text><Text style={styles.summaryNumber} numberOfLines={2} adjustsFontSizeToFit>{amount(result.summary.total_net)} <Text style={styles.summaryUnit}>ریال</Text></Text></View></View>
        {!result.rows.length && <Text style={styles.note}>اطلاعات حقوقی برای این بازه ثبت نشده است. فیش‌های پیوستی در تب دیگر قرار دارند.</Text>}
        {result.rows.map(row => {
          const remaining = Math.max(0,3-Math.max(Number(row.issued_count||0),Number(issuedMonths[`${row.period_jy}-${row.period_jm}`]||0)));
          const exhausted = row.issued || remaining===0;
          return <View style={styles.payrollCard} key={row.id}>
            <View style={styles.payrollHeader}><Text style={styles.payrollPeriod}>حقوق {faNum(`${row.period_jy}/${String(row.period_jm).padStart(2,'0')}`)}</Text><Text style={styles.periodBadge}>ماه شمسی</Text></View>
            <Text style={styles.employeeName}>{row.employee_name}</Text>
            {row.role_title ? <Text style={styles.employeeRole}>{row.role_title}</Text> : null}
            <View style={styles.payrollAmountBox}><Text style={styles.payrollAmountLabel}>خالص حقوق اعلامی</Text><Text style={styles.payrollAmount} numberOfLines={1} adjustsFontSizeToFit>{amount(row.net)} <Text style={styles.summaryUnit}>ریال</Text></Text></View>
            <View style={styles.payrollActions}>
              <TouchableOpacity accessibilityRole="button" disabled={opening} style={[styles.button,styles.actionButton,opening&&styles.disabled]} onPress={()=>openDetail(row.id)}><Text style={styles.buttonText}>{opening?'در حال دریافت…':'جزئیات حقوق و کسورات'}</Text></TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" disabled={issuing||exhausted} style={[styles.outlineButton,styles.actionButton,(issuing||exhausted)&&styles.disabled]} onPress={()=>issueSlip(row)}><Text style={styles.outlineButtonText}>{exhausted?'سقف دریافت تکمیل شده':`دریافت تصویر فیش · ${faNum(remaining)} بار باقی‌مانده`}</Text></TouchableOpacity>
            </View>
          </View>;
        })}
        <View style={styles.row}>
          <TouchableOpacity accessibilityRole="button" disabled={filters.page <= 1} style={[styles.button, filters.page <= 1 && styles.disabled]} onPress={() => setFilters(value => ({ ...value, page: value.page - 1 }))}><Text style={styles.buttonText}>قبلی</Text></TouchableOpacity>
          <Text style={styles.label}>{faNum(filters.page)}</Text>
          <TouchableOpacity accessibilityRole="button" disabled={filters.page * result.page_size >= Number(result.summary.count)} style={[styles.button, filters.page * result.page_size >= Number(result.summary.count) && styles.disabled]} onPress={() => setFilters(value => ({ ...value, page: value.page + 1 }))}><Text style={styles.buttonText}>بعدی</Text></TouchableOpacity>
        </View>
      </>}
    </ScrollView>
    <Modal visible={!!detail} animationType="slide" onRequestClose={() => setDetail(null)} statusBarTranslucent={false}>
      <SafeAreaView style={styles.root}>
        <View style={styles.detailTopBar}>
          <Text style={styles.detailTopTitle}>جزئیات حقوق و کسورات</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="بستن جزئیات" style={styles.detailClose} onPress={() => setDetail(null)}><Text style={styles.detailCloseText}>✕  بستن</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {detail && <>
            <View style={styles.detailHero}>
              <Text style={styles.detailHeroPeriod}>حقوق {faNum(`${detail.row.period_jy}/${String(detail.row.period_jm).padStart(2,'0')}`)}</Text>
              <Text style={styles.detailHeroName}>{detail.row.employee_name}</Text>
              <Text style={styles.detailHeroNote}>اطلاعات اعلامی شرکت · مبالغ به ریال</Text>
            </View>
            {(detail.row.warnings || []).map((warning,index)=><Text key={index} style={styles.error}>{warning}</Text>)}
            {detailGroups.map(group => {
              const items = (detail.fields || []).map((field,index)=>({field,label:detail.labels?.[index]||field,index}))
                .filter(({field,label})=>!hiddenDetailFields.has(String(field).toLowerCase()) && normalizeLabel(field)!=='ردیف' && normalizeLabel(label)!=='ردیف' && field!=='net' && normalizeLabel(label)!=='خالصپرداختی')
                .filter(({field,label})=>detailGroup(field,label)===group);
              if(!items.length)return null;
              return <View key={group} style={styles.detailSection}>
                <View style={styles.detailSectionHeader}><Text style={styles.detailSectionTitle}>{group}</Text><Text style={styles.detailSectionCount}>{faNum(items.length)} مورد</Text></View>
                <View style={styles.detailsGrid}>{items.map(({field,label,index})=><View style={[styles.detailCell,{width:detailColumns===3?'31.8%':'48.5%'}]} key={String(field)+index}>
                  <Text style={styles.detailTitle}>{label}</Text>
                  <Text style={styles.detailValue} numberOfLines={3} adjustsFontSizeToFit>{index<7?faNum(String(detail.row.data?.[field]??'—')):integerMoneyFields.has(field)||(/شب.?کاری/.test(String(label))&&/مبلغ/.test(String(label)))?moneyText(detail.row.data?.[field]):amount(detail.row.data?.[field],6)}</Text>
                </View>)}</View>
              </View>;
            })}
            <View style={styles.netCard}><Text style={styles.netTitle}>خالص پرداختی</Text><Text style={styles.netValue} adjustsFontSizeToFit numberOfLines={1}>{moneyText(detail.row.data?.net??detail.row.net)} ریال</Text></View>
          </>}
        </ScrollView>
      </SafeAreaView>
    </Modal>

    <Modal visible={!!slip} animationType="slide" onRequestClose={() => !issuing && setSlip(null)}>
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>پیش‌نمایش فیش حقوق A5 افقی</Text>
          <Text style={styles.note}>دریافت تصویر این ماه تا سه بار مجاز است. تصویر را پس از دریافت ذخیره کنید.</Text>
          {slip && payrollFontsReady && <View ref={slipRef} collapsable={false} style={{ backgroundColor: '#fff', width: screenWidth - 32 }}>
            <PayrollAccessSlip slip={slip} width={screenWidth - 32} />
          </View>}
          <TouchableOpacity disabled={issuing} style={[styles.button, issuing && styles.disabled]} onPress={saveIssuedSlip}><Text style={styles.buttonText}>{issuing ? 'در حال صدور…' : 'دریافت و ذخیره تصویر فیش'}</Text></TouchableOpacity>
          <TouchableOpacity disabled={issuing} style={[styles.button, { marginTop: 10, backgroundColor: C.slate }]} onPress={() => setSlip(null)}><Text style={styles.buttonText}>انصراف</Text></TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  detailTopBar:{minHeight:60,backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:C.line,paddingHorizontal:16,paddingVertical:9,flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between'},
  detailTopTitle:{fontFamily:FONT.bold,fontSize:16,color:C.ink,textAlign:'right',flexShrink:1},
  detailClose:{minHeight:42,paddingHorizontal:13,borderRadius:11,backgroundColor:'#e8f3ef',alignItems:'center',justifyContent:'center',marginLeft:12},
  detailCloseText:{fontFamily:FONT.bold,fontSize:13,color:C.brand},
  detailHero:{backgroundColor:C.brand,borderRadius:17,padding:18,marginBottom:16},
  detailHeroPeriod:{fontFamily:FONT.bold,color:'#e1f4ec',fontSize:14,textAlign:'right'},
  detailHeroName:{fontFamily:FONT.bold,color:'#fff',fontSize:19,textAlign:'right',marginTop:8},
  detailHeroNote:{fontFamily:FONT.regular,color:'#e1f4ec',fontSize:12,textAlign:'right',marginTop:8},
  detailSection:{marginBottom:18},
  detailSectionHeader:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',marginBottom:11,paddingHorizontal:2},
  detailSectionTitle:{fontFamily:FONT.bold,fontSize:16,color:C.ink},
  detailSectionCount:{fontFamily:FONT.regular,fontSize:11,color:C.slate},
  hero:{backgroundColor:C.brand,borderRadius:18,padding:18,marginBottom:14},
  heroTitle:{fontFamily:FONT.bold,fontSize:19,color:'#fff',textAlign:'right'},
  heroSubtitle:{fontFamily:FONT.bold,fontSize:13,color:'#e0f5ec',textAlign:'right',marginTop:7},
  heroDisclaimer:{fontFamily:FONT.regular,fontSize:11,lineHeight:20,color:'#e0f5ec',textAlign:'right',marginTop:10},
  filterPanel:{backgroundColor:'#fff',borderRadius:16,padding:14,borderWidth:1,borderColor:C.line,marginBottom:14},
  sectionTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:14,textAlign:'right',marginBottom:12},
  outlineButton:{flex:1,minHeight:46,padding:10,borderRadius:11,borderWidth:1,borderColor:C.brand,alignItems:'center',justifyContent:'center',backgroundColor:'#fff'},
  outlineButtonText:{fontFamily:FONT.bold,color:C.brand,textAlign:'center',fontSize:12},
  summaryPanel:{flexDirection:'row-reverse',gap:10,marginBottom:14},
  summaryCell:{flex:1,backgroundColor:'#e7f3ee',borderRadius:14,padding:13,minHeight:86,justifyContent:'space-between'},
  summaryLabel:{fontFamily:FONT.regular,fontSize:11,color:C.slate,textAlign:'right'},
  summaryNumber:{fontFamily:FONT.bold,fontSize:17,color:C.brand,textAlign:'right',marginTop:9},
  summaryUnit:{fontFamily:FONT.regular,fontSize:11},
  payrollCard:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:17,padding:15,marginBottom:12},
  payrollHeader:{flexDirection:'row-reverse',justifyContent:'space-between',alignItems:'center',gap:8},
  payrollPeriod:{fontFamily:FONT.bold,color:C.ink,fontSize:17},
  periodBadge:{fontFamily:FONT.regular,color:C.brand,fontSize:11,backgroundColor:'#e7f3ee',paddingHorizontal:9,paddingVertical:5,borderRadius:9},
  employeeName:{fontFamily:FONT.bold,fontSize:14,color:C.ink,textAlign:'right',marginTop:13},
  employeeRole:{fontFamily:FONT.regular,fontSize:12,color:C.slate,textAlign:'right',marginTop:4},
  payrollAmountBox:{backgroundColor:'#f3f8f6',borderRadius:12,padding:13,marginTop:13,marginBottom:12},
  payrollAmountLabel:{fontFamily:FONT.regular,fontSize:11,color:C.slate,textAlign:'right'},
  payrollAmount:{fontFamily:FONT.bold,fontSize:20,color:C.brand,textAlign:'right',marginTop:5},
  payrollActions:{gap:9},
  actionButton:{flex:0,width:'100%',borderRadius:11},
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
  netCard: { backgroundColor: '#fff4f4', borderWidth: 1.5, borderColor: '#dc2626', borderRadius: 14, marginTop: 16, padding: 18, alignItems: 'center' },
  netTitle: { fontFamily: FONT.bold, fontSize: 17, color: '#b91c1c', textAlign: 'center' },
  netValue: { fontFamily: FONT.bold, fontSize: 24, color: '#b91c1c', textAlign: 'center', marginTop: 8 },
  error: { fontFamily: FONT.regular, color: '#b42318', textAlign: 'right', paddingVertical: 12 },
  slipPaper: { width: '100%', aspectRatio: 210 / 148, padding: 9, backgroundColor: '#fff', borderWidth: 1, borderColor: '#999', justifyContent: 'space-between' },
  slipHeading: { fontFamily: FONT.bold, textAlign: 'center', fontSize: 13, color: '#111' },
  slipPerson: { fontFamily: FONT.bold, textAlign: 'center', fontSize: 10, color: '#111' },
  slipGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between', gap: 2 },
  slipCell: { width: '32.8%', borderWidth: 0.5, borderColor: '#aaa', padding: 2, flexDirection: 'row-reverse', justifyContent: 'space-between' },
  slipLabel: { fontFamily: FONT.regular, fontSize: 6.5, color: '#222', flexShrink: 1, textAlign: 'right' },
  slipNumber: { fontFamily: FONT.bold, fontSize: 7, color: '#111', textAlign: 'left', flexShrink: 1 },
  signatures: { flexDirection: 'row-reverse', justifyContent: 'space-around', paddingTop: 6 },
  signature: { fontFamily: FONT.bold, fontSize: 9, color: '#222' },
  legal: { fontFamily: FONT.bold, fontSize: 8, textAlign: 'center', color: '#b42318' },
  disabled: { opacity: 0.45 },
});
