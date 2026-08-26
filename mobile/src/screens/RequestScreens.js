import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput, Image, Linking } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { request, imageSource } from '../api';
import { faNum } from '../num';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';
import ImageViewer from '../components/ImageViewer';

const TY = { annual: 'مرخصی استحقاقی', sick: 'مرخصی استعلاجی', mission: 'ماموریت', overtime: 'اضافه‌کار', manual: 'تردد دستی' };

// کارتابل تأیید درخواست‌ها
export function RequestInboxScreen() {
  const [rows, setRows] = useState(null);
  const [note, setNote] = useState({});
  const [busy, setBusy] = useState(0);
  const load = () => request('/my/request-inbox').then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const decide = async (id, decision) => {
    // هنگام رد، دلیل اجباری است تا فرستنده بداند چرا رد شده
    if (decision === 'reject' && !(note[id] || '').trim()) {
      Alert.alert('دلیل رد لازم است', 'برای رد درخواست، لطفاً دلیل را در کادر یادداشت بنویسید تا برای درخواست‌دهنده نمایش داده شود.');
      return;
    }
    setBusy(id);
    try {
      await request(`/requests/${id}/decide`, { method: 'POST', body: { decision, note: note[id] || '' } });
      Alert.alert('انجام شد', decision === 'approve' ? 'درخواست تأیید شد.' : 'درخواست رد شد.');
      load();
    } catch (e) { Alert.alert('خطا', e.message); }
    finally { setBusy(0); }
  };

  if (!rows) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;
  if (!rows.length) return <Text style={[s.muted, { padding: 24 }]}>درخواستی در کارتابل شما نیست.</Text>;

  return (
    <ScrollView style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: 14 }}>
      {rows.map((r) => (
        <View key={r.id} style={s.card}>
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
            <Text style={s.cardT}>{TY[r.type] || r.type} {r.unit === 'hourly' ? '(ساعتی)' : r.unit === 'daily' ? '(روزانه)' : ''}</Text>
            <Text style={s.req}>{r.requester}</Text>
          </View>
          <Text style={s.meta}>{r.the_date || r.from_jdate}{r.to_jdate && r.to_jdate !== r.from_jdate ? ` تا ${r.to_jdate}` : ''}{r.from_time ? `  ${r.from_time}–${r.to_time}` : ''}{r.in_time ? `  ورود ${r.in_time} خروج ${r.out_time || '—'}` : ''}</Text>
          {r.minutes ? <Text style={s.meta}>مدت: {Math.floor(r.minutes / 60)} ساعت و {r.minutes % 60} دقیقه</Text> : null}
          {r.reason ? <Text style={s.reason}>{r.reason}</Text> : null}
          {(r.selfie_url || r.selfie_data) ? <Image source={imageSource(r.selfie_url || r.selfie_data)} style={s.selfie} /> : null}
          {r.attachment_name ? <Text style={[s.meta, { color: C.brand }]}>📎 {r.attachment_name}</Text> : null}
          <TextInput style={s.note} value={note[r.id] || ''} onChangeText={(t) => setNote((n) => ({ ...n, [r.id]: t }))} placeholder="یادداشت (برای رد، دلیل الزامی است)…" placeholderTextColor={C.muted} />
          <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 8 }}>
            <TouchableOpacity style={[s.ok, busy === r.id && { opacity: 0.6 }]} disabled={busy === r.id} onPress={() => decide(r.id, 'approve')}><Text style={s.okT}>تأیید</Text></TouchableOpacity>
            <TouchableOpacity style={[s.no, busy === r.id && { opacity: 0.6 }]} disabled={busy === r.id} onPress={() => decide(r.id, 'reject')}><Text style={s.noT}>رد</Text></TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// خلاصهٔ کارکرد ماهانهٔ من
export function WorkSummaryScreen() {
  const [data, setData] = useState(undefined);
  const [ym, setYm] = useState(null);
  const [slip, setSlip] = useState(null);
  const [company, setCompany] = useState({});
  const load = () => {
    request('/my/work-summary').then((r) => { setData(r.data); setYm([r.year, r.month]); }).catch(() => setData(null));
    request('/my/payslip').then(setSlip).catch(() => {});
    request('/my/company-info').then(setCompany).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  const hm = (m) => faNum(`${Math.floor((m || 0) / 60)}:${String((m || 0) % 60).padStart(2, '0')}`);
  const money = (n) => faNum(Number(n || 0).toLocaleString());
  const J = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

  const buildHtml = () => {
    const comp = company.company || 'شرکت';
    const mlabel = ym ? `${J[ym[1] - 1]} ${ym[0]}` : '';
    const rows = (obj, cls) => Object.entries(obj || {}).filter(([, v]) => v).map(([k, v]) => `<tr><td>${k}</td><td class="${cls}">${money(v)}</td></tr>`).join('');
    return `<!doctype html><html dir="rtl" lang="fa"><head><meta charset="utf-8">
<style>
@import url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css');
*{font-family:Vazirmatn,Tahoma,sans-serif;box-sizing:border-box}
body{margin:0;padding:20px;color:#1a2b3c}
.sheet{border:2px solid #0d7a5f;border-radius:14px;overflow:hidden}
.head{background:#0d7a5f;color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center}
.head h1{margin:0;font-size:19px}.head .c{font-size:12px;text-align:left;opacity:.95}
.title{text-align:center;font-size:16px;font-weight:700;padding:12px;background:#e7f3ee;color:#0d7a5f}
.meta{display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;padding:12px 20px;font-size:12px;border-bottom:1px dashed #cbd5e1}
.meta b{color:#0d7a5f}
.work{padding:9px 20px;font-size:11px;color:#475569;background:#f8fafc;display:flex;gap:14px;flex-wrap:wrap}
.cols{display:flex;flex-wrap:wrap}.col{flex:1;min-width:240px;padding:12px 20px}
.col h3{margin:0 0 6px;font-size:13px;border-bottom:2px solid #0d7a5f;padding-bottom:5px}
table{width:100%;border-collapse:collapse;font-size:12px}td{padding:6px 4px;border-bottom:1px solid #eef1f4}
.earn{color:#0d7a5f;text-align:left}.ded{color:#d63b54;text-align:left}
.sum td{font-weight:700;border-top:2px solid #0d7a5f}
.net{background:#0d7a5f;color:#fff;text-align:center;padding:14px;font-size:17px;font-weight:700}
.foot{padding:10px 20px;font-size:10px;color:#64748b;text-align:center}
</style></head><body><div class="sheet">
<div class="head"><h1>${comp}</h1><div class="c">${company.address ? company.address + '<br>' : ''}${company.phone ? 'تلفن: ' + company.phone : ''}</div></div>
<div class="title">فیش حقوقی ${mlabel}</div>
<div class="meta"><span>نام: <b>${company.name || '-'}</b></span><span>ماه: <b>${mlabel}</b></span><span>نرخ ساعت: <b>${money(slip ? slip.hour_rate : 0)}</b> ریال</span></div>
<div class="work"><span>کارکرد: ${slip ? slip.worked_h : 0} ساعت</span><span>اضافه‌کار: ${slip ? slip.ot_h : 0} ساعت</span><span>شب‌کاری: ${slip ? slip.night_h : 0}</span><span>جمعه‌کاری: ${slip ? slip.friday_h : 0}</span><span>تعطیل‌کاری: ${slip ? slip.holiday_h : 0}</span></div>
<div class="cols">
<div class="col"><h3>دریافتی‌ها</h3><table>${rows(slip && slip.earnings, 'earn')}<tr class="sum"><td>جمع دریافتی</td><td class="earn">${money(slip ? slip.gross : 0)}</td></tr></table></div>
<div class="col"><h3>کسورات</h3><table>${rows(slip && slip.deductions, 'ded')}<tr class="sum"><td>جمع کسورات</td><td class="ded">${money(slip ? slip.total_deduct : 0)}</td></tr></table></div>
</div>
<div class="net">خالص پرداختی: ${money(slip ? slip.net : 0)} ریال</div>
<div class="foot">این فیش به‌صورت سیستمی صادر شده است.</div>
</div></body></html>`;
  };
  const printSlip = async () => {
    try {
      const { uri } = await Print.printToFileAsync({ html: buildHtml() });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'فیش حقوقی' });
      else await Print.printAsync({ html: buildHtml() });
    } catch (e) { Alert.alert('خطا', 'تولید فیش ممکن نشد. ' + (e.message || '')); }
  };

  if (data === undefined) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;
  return (
    <ScrollView style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
      {ym && <Text style={s.month}>{J[ym[1] - 1]} {ym[0]}</Text>}
      {!data ? <Text style={[s.muted, { marginTop: 20 }]}>برای این ماه شیفت یا ترددی ثبت نشده است.</Text> : (
        <View>
          <Row l="روزهای حضور" v={`${faNum(data.present_days || 0)} روز`} />
          <Row l="کارکرد" v={hm(data.worked)} hl />
          <Row l="موظفی" v={hm(data.expected)} />
          <Row l="اضافه‌کار" v={hm(data.overtime)} color={C.ok} />
          <Row l="مازاد حضور" v={hm(data.surplus)} color={C.danger} />
          <Row l="مازاد تبدیل‌شده به اضافه‌کار" v={hm(data.adjusted_ot)} color={C.ok} />
          <Row l="کسری کار" v={hm(data.shortage)} color={C.danger} />
          <Row l="شب‌کاری" v={hm(data.night)} />
          <Row l="جمعه‌کاری" v={hm(data.friday)} />
          <Row l="تعطیل‌کاری" v={hm(data.holiday)} />
          <Row l="مرخصی استحقاقی" v={hm(data.annual_min)} />
          <Row l="مرخصی استعلاجی" v={hm(data.sick_min)} />
          <Row l="ماموریت" v={hm(data.mission_min)} />
          <Row l="تأخیر ورود" v={hm(data.late_in)} color={C.danger} />
          <Row l="تعجیل خروج" v={hm(data.early_out)} color={C.danger} />
          <Row l="تردد دستی" v={hm(data.manual_min)} />
        </View>
      )}
      {slip && (slip.gross > 0 || slip.net > 0) ? (
        <View style={{ marginTop: 18 }}>
          <Text style={s.slipTitle}>فیش حقوقی</Text>
          {Object.entries(slip.earnings || {}).filter(([, v]) => v).map(([k, v]) => <Row key={k} l={k} v={`${money(v)} ﷼`} color={C.ok} />)}
          <Row l="جمع دریافتی" v={`${money(slip.gross)} ﷼`} hl />
          {Object.entries(slip.deductions || {}).filter(([, v]) => v).map(([k, v]) => <Row key={k} l={k} v={`−${money(v)} ﷼`} color={C.danger} />)}
          <View style={[s.row, { backgroundColor: '#e7f3ee', borderColor: C.brand }]}>
            <Text style={[s.rowL, { fontFamily: FONT.bold }]}>خالص پرداختی</Text>
            <Text style={[s.rowV, { color: C.brand, fontSize: 16 }]}>{money(slip.net)} ﷼</Text>
          </View>
          <TouchableOpacity style={s.printBtn} onPress={printSlip}><Text style={s.printBtnTxt}>🖨 دریافت فیش PDF / اشتراک‌گذاری</Text></TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}
function Row({ l, v, hl, color }) {
  return (
    <View style={[s.row, hl && { backgroundColor: '#e7f3ee' }]}>
      <Text style={s.rowL}>{l}</Text>
      <Text style={[s.rowV, color && { color }]}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },
  muted: { fontFamily: FONT.regular, color: C.muted, fontSize: 13, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.line },
  cardT: { fontFamily: FONT.bold, color: C.ink, fontSize: 14 },
  req: { fontFamily: FONT.bold, color: C.brand, fontSize: 13 },
  meta: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, textAlign: 'right', marginTop: 5 },
  reason: { fontFamily: FONT.regular, color: C.slate, fontSize: 13, textAlign: 'right', marginTop: 6 },
  selfie: { width: 90, height: 120, borderRadius: 8, marginTop: 8, alignSelf: 'flex-end' },
  note: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, borderRadius: 9, padding: 9, fontFamily: FONT.regular, fontSize: 13, textAlign: 'right', color: C.ink, marginTop: 10 },
  ok: { flex: 1, backgroundColor: C.brand, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  okT: { color: '#fff', fontFamily: FONT.bold, fontSize: 14 },
  no: { flex: 1, backgroundColor: '#fdeef0', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  noT: { color: C.danger, fontFamily: FONT.bold, fontSize: 14 },
  month: { fontFamily: FONT.bold, fontSize: 18, color: C.ink, textAlign: 'center', marginBottom: 14 },
  slipTitle: { fontFamily: FONT.bold, fontSize: 16, color: C.ink, textAlign: 'center', marginBottom: 10, marginTop: 6 },
  printBtn: { backgroundColor: C.brand, borderRadius: 13, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  printBtnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 14 },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 14, borderRadius: 10, marginBottom: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line },
  rowL: { fontFamily: FONT.regular, color: C.slate, fontSize: 14 },
  rowV: { fontFamily: FONT.bold, color: C.ink, fontSize: 15 },
});


// فیش‌های حقوقی PDF پیوست‌شده توسط مدیر
export function SalarySlipsScreen() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [viewerUri, setViewerUri] = useState(null);
  const load = () => { setErr(null); request('/my/salary-slips').then((r)=>setRows(r.rows||[])).catch((e)=>{ setRows([]); setErr(e.message || 'دریافت فیش‌های حقوقی ناموفق بود.'); }); };
  useEffect(()=>{ load(); }, []);
  const fileUrl = (r) => {
    const { apiBase } = require('../config');
    return apiBase().replace(/\/api$/, '') + r.download_url;
  };
  const safeName = (r) => {
    const ext = r.file_type === 'image' ? (String(r.file_name||'').toLowerCase().endsWith('.png') ? 'png' : 'jpg') : 'pdf';
    return `salary-slip-${r.period_jy || ''}-${String(r.period_jm || '').padStart(2,'0')}-${r.id}.${ext}`;
  };
  const openSlip = async (r) => {
    if (r.file_type === 'image') { setViewerUri(fileUrl(r)); return; }
    try { await Linking.openURL(fileUrl(r)); }
    catch (e) { Alert.alert('خطا', 'باز کردن فایل ممکن نشد.'); }
  };
  const saveSlip = async (r) => {
    try {
      const dir = `${FileSystem.documentDirectory}salary_slips/`;
      const info = await FileSystem.getInfoAsync(dir);
      if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const target = dir + safeName(r);
      const result = await FileSystem.downloadAsync(fileUrl(r), target);
      if (result.status < 200 || result.status >= 300) throw new Error(`HTTP ${result.status}`);
      Alert.alert('ذخیره شد', 'فیش حقوقی داخل حافظه برنامه ذخیره شد.', [
        { text: 'باشه' },
        { text: 'اشتراک‌گذاری', onPress: async()=>{ if(await Sharing.isAvailableAsync()) await Sharing.shareAsync(target,{mimeType:r.mime_type||undefined,dialogTitle:'فیش حقوقی'}); } }
      ]);
    } catch (e) { Alert.alert('خطا', 'ذخیره فیش ممکن نشد. ' + (e.message || '')); }
  };
  if (rows === null) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;
  return <View style={{flex:1,backgroundColor:C.paper}}><ScrollView style={{ backgroundColor:C.paper }} contentContainerStyle={{ padding:16 }}>
    {err ? <View style={{backgroundColor:'#fde9e7',borderRadius:12,padding:14,marginTop:10}}>
        <Text style={{color:'#b04a42',fontFamily:s.cardT.fontFamily,textAlign:'center'}}>{err}</Text>
        <Text style={[s.muted,{textAlign:'center',marginTop:6,fontSize:12}]}>اگر مطمئن هستید فیش برایتان ثبت شده، این خطا معمولاً یعنی دسترسی «فیش حقوقی» برای سمت شما در تنظیمات فعال نیست — با مدیر سیستم هماهنگ کنید.</Text>
      </View>
    : !rows.length ? <Text style={[s.muted,{textAlign:'center',marginTop:30}]}>هنوز فیش حقوقی برای شما پیوست نشده است.</Text> : rows.map((r)=>(
      <View key={r.id} style={s.card}>
        <Text style={s.cardT}>{r.title || 'فیش حقوقی'}</Text>
        <Text style={s.meta}>ماه: {faNum(r.period_label || '')}</Text>
        <Text style={s.meta}>فایل: {r.file_name || (r.file_type === 'image' ? 'salary-slip.jpg' : 'salary-slip.pdf')}</Text>
        {r.file_type === 'image' ? <Image source={{uri:fileUrl(r)}} style={{width:'100%',height:220,borderRadius:10,marginTop:10,resizeMode:'contain',backgroundColor:'#f7f8fa'}} /> : null}
        <View style={{flexDirection:'row-reverse',gap:8,marginTop:10}}>
          <TouchableOpacity style={[s.printBtn,{flex:1,marginTop:0}]} onPress={()=>openSlip(r)}><Text style={s.printBtnTxt}>{r.file_type === 'image' ? 'مشاهده تصویر' : 'مشاهده PDF'}</Text></TouchableOpacity>
          <TouchableOpacity style={[s.printBtn,{flex:1,marginTop:0,backgroundColor:C.slate}]} onPress={()=>saveSlip(r)}><Text style={s.printBtnTxt}>ذخیره در برنامه</Text></TouchableOpacity>
        </View>
      </View>
    ))}
  </ScrollView><ImageViewer visible={!!viewerUri} uri={viewerUri} onClose={()=>setViewerUri(null)} /></View>;
}
