import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput, Image, Linking, RefreshControl } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { request, imageSource } from '../api';
import { faNum } from '../num';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';
import ImageViewer from '../components/ImageViewer';
import CompanyPayrollHistory from './CompanyPayrollHistory';
import JDatePicker from '../components/JDatePicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const TY = { annual: 'مرخصی استحقاقی', sick: 'مرخصی استعلاجی', mission: 'ماموریت', overtime: 'اضافه‌کار', manual: 'تردد دستی' };

// کارتابل تأیید درخواست‌ها
const normalizeJ = (value) => String(value || '').replace(/[۰-۹]/g, (x) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(x))).replace(/\//g, '-').slice(0, 10);
function InboxDate({ label, value, onChange }) {
  const [visible, setVisible] = useState(false);
  return <View style={{flex:1}}>
    <Text style={inboxStyle.label}>{label}</Text>
    <TouchableOpacity accessibilityRole="button" style={inboxStyle.dateButton} onPress={()=>setVisible(true)}>
      <MaterialCommunityIcons name="calendar-month-outline" size={19} color={C.brand}/>
      <Text style={inboxStyle.dateText}>{value ? faNum(value.replace(/-/g,'/')) : 'انتخاب تاریخ'}</Text>
    </TouchableOpacity>
    <JDatePicker visible={visible} onClose={()=>setVisible(false)} initial={null} onSelect={(d)=>onChange(`${d.jy}-${String(d.jm).padStart(2,'0')}-${String(d.jd).padStart(2,'0')}`)}/>
  </View>;
}
export function RequestInboxScreen() {
  const [rows, setRows] = useState(null);
  const [note, setNote] = useState({});
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expanded, setExpanded] = useState({});
  const load = useCallback(async () => {
    try {
      setError('');
      const result = await request('/my/request-inbox', { noStore:true, forceNetwork:true, queueIfOffline:false });
      const items = Array.isArray(result) ? result : (result?.rows || result?.requests || result?.data);
      if (!Array.isArray(items)) throw new Error('پاسخ کارتابل ساختار معتبر ندارد.');
      setRows(items);
    } catch (e) { setError(e?.message || 'دریافت کارتابل ناموفق بود.'); setRows((old)=>old || []); }
  }, []);
  useFocusEffect(useCallback(()=>{load();},[load]));
  const refresh = async()=>{setRefreshing(true);try{await load();}finally{setRefreshing(false);}};
  const filtered = (rows || []).filter((r)=>{
    const name = String(r.requester || r.requester_name || r.user_name || '').toLocaleLowerCase('fa');
    const date = normalizeJ(r.the_date || r.from_jdate || r.created_jdate || r.created_at);
    return (!search.trim() || name.includes(search.trim().toLocaleLowerCase('fa'))) &&
      (typeFilter==='all' || r.type===typeFilter) && (!from || date >= from) && (!to || date <= to);
  }).sort((a,b)=>normalizeJ(b.created_jdate || b.created_at || b.the_date || b.from_jdate).localeCompare(normalizeJ(a.created_jdate || a.created_at || a.the_date || a.from_jdate)));
  const decide = async (id, decision) => {
    if (decision === 'reject' && !(note[id] || '').trim()) {
      Alert.alert('دلیل رد لازم است', 'برای رد درخواست، دلیل را در کادر یادداشت بنویسید.');
      return;
    }
    setBusy(id);
    try {
      await request(`/requests/${id}/decide`, { method: 'POST', body: { decision, note: note[id] || '' } });
      Alert.alert('انجام شد', decision === 'approve' ? 'درخواست تأیید شد.' : 'درخواست رد شد.');
      await load();
    } catch (e) { Alert.alert('خطا', e.message); }
    finally { setBusy(0); }
  };
  return <ScrollView style={{backgroundColor:C.paper}} contentContainerStyle={{padding:14,paddingBottom:50}}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.brand}/>}>
    <View style={inboxStyle.heading}><View style={{flex:1}}><Text style={inboxStyle.title}>کارتابل تأیید درخواست‌ها</Text><Text style={inboxStyle.subtitle}>بررسی و تصمیم‌گیری درباره درخواست‌های ارجاع‌شده</Text></View><View style={inboxStyle.count}><Text style={inboxStyle.countText}>{faNum((rows||[]).length)}</Text></View></View>
    <View style={inboxStyle.filterCard}>
      <View style={inboxStyle.searchBox}><MaterialCommunityIcons name="magnify" size={23} color={C.muted}/><TextInput style={inboxStyle.searchInput} value={search} onChangeText={setSearch} placeholder="جستجوی نام ارسال‌کننده..." placeholderTextColor={C.muted}/>{search ? <TouchableOpacity onPress={()=>setSearch('')}><MaterialCommunityIcons name="close-circle" size={20} color={C.muted}/></TouchableOpacity> : null}</View>
      <Text style={inboxStyle.label}>نوع درخواست</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection:'row-reverse',gap:7,paddingVertical:3}}>
        {[['all','همه'],...Object.entries(TY)].map(([key,label])=><TouchableOpacity key={key} onPress={()=>setTypeFilter(key)} style={[inboxStyle.chip,typeFilter===key&&inboxStyle.chipActive]}><Text style={[inboxStyle.chipText,typeFilter===key&&{color:'#fff'}]}>{label}</Text></TouchableOpacity>)}
      </ScrollView>
      <View style={{flexDirection:'row-reverse',gap:9}}><InboxDate label="از تاریخ" value={from} onChange={setFrom}/><InboxDate label="تا تاریخ" value={to} onChange={setTo}/></View>
      <View style={{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',marginTop:13}}><Text style={inboxStyle.resultText}>{faNum(filtered.length)} درخواست یافت شد</Text><TouchableOpacity onPress={()=>{setSearch('');setTypeFilter('all');setFrom('');setTo('');}}><Text style={inboxStyle.clearText}>پاک کردن فیلترها</Text></TouchableOpacity></View>
    </View>
    {error ? <View style={inboxStyle.error}><Text style={inboxStyle.errorText}>{error}</Text><TouchableOpacity onPress={load}><Text style={inboxStyle.clearText}>تلاش مجدد</Text></TouchableOpacity></View> : null}
    {rows===null ? <ActivityIndicator color={C.brand}/> : filtered.length===0 ? <View style={inboxStyle.empty}><MaterialCommunityIcons name="clipboard-check-outline" size={45} color={C.muted}/><Text style={inboxStyle.emptyTitle}>{rows.length ? 'درخواستی مطابق فیلترها پیدا نشد' : 'درخواستی در کارتابل شما نیست'}</Text><Text style={inboxStyle.subtitle}>{rows.length ? 'فیلترها را تغییر دهید.' : 'درخواست‌های ارجاع‌شده برای تأیید در این بخش نمایش داده می‌شوند.'}</Text></View> : filtered.map((r)=>{
      const open=expanded[r.id] !== false;
      return <View key={r.id} style={inboxStyle.card}>
        <TouchableOpacity onPress={()=>setExpanded(p=>({...p,[r.id]:!open}))} style={{flexDirection:'row-reverse',alignItems:'center',gap:10}}>
          <View style={inboxStyle.avatar}><MaterialCommunityIcons name="account-outline" size={23} color={C.brand}/></View>
          <View style={{flex:1}}><Text style={inboxStyle.name}>{r.requester || r.requester_name || r.user_name || 'نام ارسال‌کننده نامشخص'}</Text><Text style={inboxStyle.subtitle}>{TY[r.type] || r.type} {r.unit==='hourly'?'· ساعتی':r.unit==='daily'?'· روزانه':''}</Text></View>
          <MaterialCommunityIcons name={open?'chevron-up':'chevron-down'} size={24} color={C.muted}/>
        </TouchableOpacity>
        <Text style={inboxStyle.meta}>{faNum(r.the_date || r.from_jdate || '—')}{r.to_jdate && r.to_jdate !== r.from_jdate ? ` تا ${faNum(r.to_jdate)}` : ''}{r.from_time ? ` · ${faNum(r.from_time)} تا ${faNum(r.to_time)}` : ''}{r.in_time ? ` · ورود ${faNum(r.in_time)} · خروج ${faNum(r.out_time || '—')}` : ''}</Text>
        {open ? <>
          {r.minutes ? <Text style={inboxStyle.meta}>مدت: {faNum(Math.floor(r.minutes/60))} ساعت و {faNum(r.minutes%60)} دقیقه</Text> : null}
          {r.reason ? <View style={inboxStyle.reasonBox}><Text style={inboxStyle.reason}>{r.reason}</Text></View> : null}
          {(r.selfie_url || r.selfie_data) ? <Image source={imageSource(r.selfie_url || r.selfie_data)} style={s.selfie}/> : null}
          {r.attachment_name ? <Text style={[inboxStyle.meta,{color:C.brand}]}>پیوست: {r.attachment_name}</Text> : null}
          <TextInput style={s.note} multiline value={note[r.id]||''} onChangeText={(t)=>setNote(n=>({...n,[r.id]:t}))} placeholder="یادداشت تأیید یا دلیل رد درخواست..." placeholderTextColor={C.muted}/>
          <View style={{flexDirection:'row-reverse',gap:9,marginTop:12}}><TouchableOpacity style={[s.ok,{minHeight:48,justifyContent:'center'},busy===r.id&&{opacity:.5}]} disabled={busy===r.id} onPress={()=>decide(r.id,'approve')}><Text style={s.okT}>تأیید درخواست</Text></TouchableOpacity><TouchableOpacity style={[s.no,{minHeight:48,justifyContent:'center'},busy===r.id&&{opacity:.5}]} disabled={busy===r.id} onPress={()=>decide(r.id,'reject')}><Text style={s.noT}>رد درخواست</Text></TouchableOpacity></View>
        </> : null}
      </View>;
    })}
  </ScrollView>;
}
const inboxStyle=StyleSheet.create({
 heading:{flexDirection:'row-reverse',alignItems:'center',gap:12,marginBottom:14},
 title:{fontFamily:FONT.bold,fontSize:18,color:C.ink,textAlign:'right'},
 subtitle:{fontFamily:FONT.regular,fontSize:12,color:C.muted,textAlign:'right',marginTop:5,lineHeight:20},
 count:{backgroundColor:'#e3f3ed',width:48,height:48,borderRadius:15,alignItems:'center',justifyContent:'center'},
 countText:{fontFamily:FONT.bold,fontSize:19,color:C.brand},
 filterCard:{backgroundColor:'#fff',borderRadius:18,padding:13,borderWidth:1,borderColor:C.line,marginBottom:15},
 searchBox:{flexDirection:'row-reverse',alignItems:'center',borderWidth:1,borderColor:C.line,borderRadius:13,paddingHorizontal:12,minHeight:50,backgroundColor:C.paper},
 searchInput:{flex:1,fontFamily:FONT.regular,color:C.ink,textAlign:'right',paddingHorizontal:9,fontSize:13},
 label:{fontFamily:FONT.bold,color:C.ink,textAlign:'right',fontSize:12,marginTop:13,marginBottom:7},
 chip:{paddingHorizontal:12,paddingVertical:10,borderRadius:12,borderWidth:1,borderColor:C.line,backgroundColor:'#f7f9fb'},
 chipActive:{backgroundColor:C.brand,borderColor:C.brand},
 chipText:{fontFamily:FONT.bold,fontSize:12,color:C.ink},
 dateButton:{backgroundColor:'#f7f9fb',borderColor:C.line,borderWidth:1,borderRadius:12,paddingHorizontal:10,minHeight:48,flexDirection:'row-reverse',alignItems:'center',gap:5},
 dateText:{fontFamily:FONT.regular,fontSize:12,color:C.ink,flex:1,textAlign:'right'},
 resultText:{fontFamily:FONT.bold,color:C.slate,fontSize:12},
 clearText:{fontFamily:FONT.bold,color:C.brand,fontSize:12},
 card:{backgroundColor:'#fff',borderRadius:18,padding:15,borderWidth:1,borderColor:C.line,marginBottom:11},
 avatar:{width:42,height:42,borderRadius:14,backgroundColor:'#e9f5f0',justifyContent:'center',alignItems:'center'},
 name:{fontFamily:FONT.bold,color:C.ink,fontSize:14,textAlign:'right'},
 meta:{fontFamily:FONT.regular,color:C.muted,fontSize:12,textAlign:'right',marginTop:10,lineHeight:20},
 reasonBox:{backgroundColor:'#f5f7fa',borderRadius:11,padding:12,marginTop:10},
 reason:{fontFamily:FONT.regular,color:C.slate,fontSize:13,textAlign:'right',lineHeight:22},
 empty:{alignItems:'center',backgroundColor:'#fff',borderRadius:18,padding:30,borderWidth:1,borderColor:C.line},
 emptyTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:14,marginTop:12,textAlign:'center'},
 error:{backgroundColor:'#fff1f1',padding:14,borderRadius:12,marginBottom:12},
 errorText:{fontFamily:FONT.regular,color:C.danger,fontSize:12,textAlign:'right',marginBottom:8}
});

// خلاصهٔ کارکرد ماهانهٔ من
export function WorkSummaryScreen() {
  const [data, setData] = useState(undefined);
  const [ym, setYm] = useState(null);
  const [slip, setSlip] = useState(null);
  const [company, setCompany] = useState({});
  const [loadError, setLoadError] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    setData(undefined);
    setLoadError('');
    request('/my/work-summary', { noStore: true }).then((r) => {
      if (!active) return;
      setData(r.data ? { ...r.data, through_jdate: r.through_jdate } : null);
      setYm([r.year, r.month]);
    }).catch((e) => {
      if (!active) return;
      setData(null);
      setLoadError(e.message || 'دریافت کارکرد ناموفق بود.');
    });
    request('/my/payslip', { noStore: true }).then((r) => { if (active) setSlip(r); }).catch(() => {});
    request('/my/company-info', { noStore: true }).then((r) => { if (active) setCompany(r); }).catch(() => {});
    return () => { active = false; };
  }, []));
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
  const groups = [
    {title:'اضافه‌کار و مازاد حضور',icon:'clock-plus-outline',items:[['اضافه‌کار',data?.overtime,C.ok],['مازاد حضور',data?.surplus,C.slate],['مازاد تبدیل‌شده به اضافه‌کار',data?.adjusted_ot,C.ok]]},
    {title:'کسری و تأخیر',icon:'clock-alert-outline',items:[['کسری کار',data?.shortage,C.danger],['غیبت',data?.absent_min,C.danger],['تأخیر ورود',data?.late_in,C.danger],['تعجیل خروج',data?.early_out,C.danger]]},
    {title:'کارکرد ویژه',icon:'calendar-clock-outline',items:[['شب‌کاری',data?.night],['جمعه‌کاری',data?.friday],['تعطیل‌کاری',data?.holiday],['تردد دستی',data?.manual_min]]},
    {title:'مرخصی و مأموریت',icon:'calendar-account-outline',items:[['مرخصی استحقاقی',data?.annual_min],['مرخصی استعلاجی',data?.sick_min],['مأموریت',data?.mission_min]]}
  ];
  return (
    <ScrollView persistentScrollbar style={{backgroundColor:C.paper}} contentContainerStyle={{padding:14,paddingBottom:56}}>
      <View style={s.workHero}>
        <View style={s.workHeroHeading}><MaterialCommunityIcons name="chart-timeline-variant" size={27} color="#fff"/><Text style={s.workHeroTitle}>گزارش کارکرد من</Text></View>
        <Text style={s.workHeroMonth}>{ym ? `${J[ym[1]-1]} ${faNum(ym[0])}` : 'ماه جاری'}</Text>
        {data?.through_jdate ? <Text style={s.workHeroThrough}>محاسبه تا {faNum(String(data.through_jdate).replace(/-/g,'/'))}</Text> : null}
      </View>
      {data ? <>
        <View style={s.workPrimaryGrid}>
          {[['روزهای حضور',`${faNum(data.present_days||0)} روز`,'calendar-check-outline'],['کارکرد',hm(data.worked),'clock-check-outline'],['موظفی',hm(data.expected),'calendar-clock'],['اضافه‌کار',hm(data.overtime),'clock-plus-outline']].map(([label,value,icon])=><View key={label} style={s.workPrimaryCard}><View style={s.workPrimaryCardHead}><MaterialCommunityIcons name={icon} size={20} color={C.brand}/><Text style={s.workPrimaryLabel}>{label}</Text></View><Text style={s.workPrimaryValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text></View>)}
        </View>
        <View style={s.workNotice}><MaterialCommunityIcons name="information-outline" size={19} color={C.brand}/><Text style={s.workNoticeText}>{['auto','floating'].includes(data.shift_type)?'کسر کار روز جاری برای شیفت‌های بدون ساعت‌بندی پس از پایان روز نهایی می‌شود.':'کسر کار روز جاری فقط بر پایه زمان سپری‌شده از بازه‌های شیفت محاسبه می‌شود.'}</Text></View>
        {groups.map((group)=><View key={group.title} style={s.workGroup}>
          <View style={s.workGroupHeading}><MaterialCommunityIcons name={group.icon} size={21} color={C.brand}/><Text style={s.workGroupTitle}>{group.title}</Text></View>
          {group.items.map(([label,value,color])=><View key={label} style={s.workMetricRow}><Text style={s.workMetricLabel}>{label}</Text><Text style={[s.workMetricValue,color&&{color}]}>{hm(value)}</Text></View>)}
        </View>)}
      </> : <View style={s.workGroup}><Text style={s.muted}>{loadError||'برای این ماه شیفت یا ترددی ثبت نشده است.'}</Text></View>}
      {slip && (slip.gross > 0 || slip.net > 0) ? <View style={s.workGroup}>
        <View style={s.workGroupHeading}><MaterialCommunityIcons name="receipt-text-outline" size={21} color={C.brand}/><Text style={s.workGroupTitle}>فیش حقوقی</Text></View>
        {Object.entries(slip.earnings||{}).filter(([,v])=>v).map(([k,v])=><View key={k} style={s.workMetricRow}><Text style={s.workMetricLabel}>{k}</Text><Text style={[s.workMetricValue,{color:C.ok}]}>{money(v)} ریال</Text></View>)}
        <View style={s.workMetricRow}><Text style={s.workMetricLabel}>جمع دریافتی</Text><Text style={s.workMetricValue}>{money(slip.gross)} ریال</Text></View>
        {Object.entries(slip.deductions||{}).filter(([,v])=>v).map(([k,v])=><View key={k} style={s.workMetricRow}><Text style={s.workMetricLabel}>{k}</Text><Text style={[s.workMetricValue,{color:C.danger}]}>{money(v)} ریال</Text></View>)}
        <View style={s.workNetRow}><Text style={s.workNetLabel}>خالص پرداختی</Text><Text style={s.workNetValue}>{money(slip.net)} ریال</Text></View>
        <TouchableOpacity style={s.printBtn} onPress={printSlip}><Text style={s.printBtnTxt}>دریافت فیش PDF / اشتراک‌گذاری</Text></TouchableOpacity>
      </View> : null}
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
  workHero:{backgroundColor:C.brand,borderRadius:19,padding:19,marginBottom:13},
  workHeroHeading:{flexDirection:'row-reverse',alignItems:'center',gap:9},
  workHeroTitle:{fontFamily:FONT.bold,color:'#fff',fontSize:16},
  workHeroMonth:{fontFamily:FONT.bold,color:'#fff',fontSize:23,textAlign:'right',marginTop:12},
  workHeroThrough:{fontFamily:FONT.regular,color:'#e3f5ef',fontSize:12,textAlign:'right',marginTop:7},
  workPrimaryGrid:{flexDirection:'row-reverse',flexWrap:'wrap',justifyContent:'space-between',gap:10,marginBottom:12},
  workPrimaryCard:{width:'48%',minWidth:0,backgroundColor:'#fff',borderRadius:16,padding:14,borderWidth:1,borderColor:C.line,minHeight:112,justifyContent:'space-between'},
  workPrimaryCardHead:{flexDirection:'row-reverse',alignItems:'center',gap:7},
  workPrimaryLabel:{fontFamily:FONT.regular,color:C.slate,fontSize:12,textAlign:'right',flexShrink:1},
  workPrimaryValue:{fontFamily:FONT.bold,color:C.brand,fontSize:23,textAlign:'right',marginTop:10},
  workNotice:{flexDirection:'row-reverse',gap:8,alignItems:'flex-start',backgroundColor:'#e8f5f0',borderRadius:13,padding:12,marginBottom:13},
  workNoticeText:{flex:1,fontFamily:FONT.regular,color:C.slate,fontSize:11,lineHeight:19,textAlign:'right'},
  workGroup:{backgroundColor:'#fff',borderRadius:17,padding:14,borderWidth:1,borderColor:C.line,marginBottom:12},
  workGroupHeading:{flexDirection:'row-reverse',alignItems:'center',gap:8,paddingBottom:12,borderBottomWidth:1,borderBottomColor:'#e9edf0'},
  workGroupTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:14,textAlign:'right'},
  workMetricRow:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',gap:10,paddingVertical:12,borderBottomWidth:1,borderBottomColor:'#f0f2f4'},
  workMetricLabel:{fontFamily:FONT.regular,color:C.slate,fontSize:12,flex:1,textAlign:'right'},
  workMetricValue:{fontFamily:FONT.bold,color:C.ink,fontSize:14,textAlign:'left'},
  workNetRow:{backgroundColor:'#fff0f1',borderRadius:12,padding:13,flexDirection:'row-reverse',justifyContent:'space-between',alignItems:'center',gap:10,marginTop:12},
  workNetLabel:{fontFamily:FONT.bold,color:C.danger,fontSize:13},
  workNetValue:{fontFamily:FONT.bold,color:C.danger,fontSize:18},
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper },
  muted: { fontFamily: FONT.regular, color: C.muted, fontSize: 13, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.line, shadowColor: '#17352f', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  cardT: { fontFamily: FONT.bold, color: C.ink, fontSize: 14 },
  req: { fontFamily: FONT.bold, color: C.brand, fontSize: 13 },
  meta: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, textAlign: 'right', marginTop: 5 },
  reason: { fontFamily: FONT.regular, color: C.slate, fontSize: 13, textAlign: 'right', marginTop: 6 },
  selfie: { width: 90, height: 120, borderRadius: 8, marginTop: 8, alignSelf: 'flex-end' },
  note: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, borderRadius: 9, padding: 9, fontFamily: FONT.regular, fontSize: 13, textAlign: 'right', color: C.ink, marginTop: 10 },
  ok: { flex: 1, backgroundColor: C.brand, borderRadius: 13, paddingVertical: 13, alignItems: 'center' },
  okT: { color: '#fff', fontFamily: FONT.bold, fontSize: 14 },
  no: { flex: 1, backgroundColor: '#fdeef0', borderRadius: 13, paddingVertical: 13, alignItems: 'center' },
  noT: { color: C.danger, fontFamily: FONT.bold, fontSize: 14 },
  month: { fontFamily: FONT.bold, fontSize: 18, color: C.ink, textAlign: 'center', marginBottom: 14 },
  summaryThrough: { fontFamily: FONT.bold, fontSize: 12, color: C.brand, textAlign: 'center', marginTop: -7, marginBottom: 7 },
  summaryHint: { fontFamily: FONT.regular, fontSize: 11, lineHeight: 18, color: C.muted, textAlign: 'center', marginBottom: 12 },
  slipTitle: { fontFamily: FONT.bold, fontSize: 16, color: C.ink, textAlign: 'center', marginBottom: 10, marginTop: 6 },
  printBtn: { backgroundColor: C.brand, borderRadius: 13, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  printBtnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 14 },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 14, borderRadius: 14, marginBottom: 7, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line },
  rowL: { fontFamily: FONT.regular, color: C.slate, fontSize: 14 },
  rowV: { fontFamily: FONT.bold, color: C.ink, fontSize: 15 },
});


// فیش‌های حقوقی PDF پیوست‌شده توسط مدیر
export function SalarySlipsScreen() {
  const [tab, setTab] = useState('attachments');
  return <View style={{flex:1,backgroundColor:C.paper}}><View accessibilityRole="tablist" style={{flexDirection:'row-reverse',padding:12,gap:8}}>{[['attachments','فیش‌های پیوستی'],['company','وضعیت حقوق ماهانه']].map(([key,label])=><TouchableOpacity key={key} accessibilityRole="tab" accessibilityState={{selected:tab===key}} onPress={()=>setTab(key)} style={{flex:1,minHeight:48,padding:12,borderRadius:10,backgroundColor:tab===key?C.brand:'#e8edf2',justifyContent:'center'}}><Text style={{fontFamily:FONT.bold,textAlign:'center',color:tab===key?'#fff':C.ink}}>{label}</Text></TouchableOpacity>)}</View>{tab==='company'?<CompanyPayrollHistory/>:<SalarySlipAttachmentsScreen/>}</View>;
}
function SalarySlipAttachmentsScreen() {
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
    const ext = r.file_type === 'image' ? (r.mime_type === 'image/png' ? 'png' : 'jpg') : 'pdf';
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
  return <View style={{flex:1,backgroundColor:C.paper}}><ScrollView persistentScrollbar={true} style={{ backgroundColor:C.paper }} contentContainerStyle={{ padding:16 }}>
    {err ? <View style={{backgroundColor:'#fde9e7',borderRadius:12,padding:14,marginTop:10}}>
        <Text style={{color:'#b04a42',fontFamily:s.cardT.fontFamily,textAlign:'center'}}>{err}</Text>
        <Text style={[s.muted,{textAlign:'center',marginTop:6,fontSize:12}]}>ابتدا اتصال اینترنت را بررسی کنید. در صورت خطای دسترسی، مدیر سامانه باید آیتم «فیش حقوقی» را برای سمت شما فعال کند.</Text>
        <TouchableOpacity accessibilityRole="button" onPress={load} style={{minHeight:48,justifyContent:'center',alignItems:'center',backgroundColor:C.brand,borderRadius:12,marginTop:12}}><Text style={{color:'#fff',fontFamily:FONT.bold}}>تلاش دوباره</Text></TouchableOpacity>
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
