import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { C, FONT } from '../theme';
import { getCrashReports, copyCrashReport, shareCrashReport, sendCrashReport, deleteCrashReport, formatCrashReport } from '../crashReporter';

export default function CrashReportsScreen() {
  const [items, setItems] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const load = React.useCallback(async () => { const rows = await getCrashReports(); setItems(rows); setSelected(s => rows.find(x => x.id === s?.id) || rows[0] || null); }, []);
  React.useEffect(() => { load(); }, [load]);
  const act = async (fn, ok) => { try { setBusy(true); await fn(); if (ok) Alert.alert('انجام شد', ok); await load(); } catch (e) { Alert.alert('خطا', e?.message || 'عملیات انجام نشد'); } finally { setBusy(false); } };
  return <View style={s.root}>
    <ScrollView contentContainerStyle={s.pad}>
      <Text style={s.note}>گزارش‌های خطای JavaScript و خطاهای رابط کاربری روی دستگاه ذخیره می‌شوند. برای کرش‌های کاملاً Native ممکن است Logcat همچنان لازم باشد.</Text>
      {!items.length && <Text style={s.empty}>گزارش خطایی ثبت نشده است.</Text>}
      {items.map(x => <TouchableOpacity key={x.id} style={[s.card, selected?.id===x.id&&s.active]} onPress={()=>setSelected(x)}>
        <Text style={s.id}>{x.id}</Text><Text style={s.small}>{x.created_at}</Text><Text style={s.msg} numberOfLines={2}>{x.message}</Text>
        <Text style={s.state}>{x.sent_at ? 'ارسال‌شده' : 'ارسال‌نشده'}</Text>
      </TouchableOpacity>)}
      {selected && <>
        <Text style={s.title}>جزئیات گزارش</Text>
        <View style={s.detail}><Text selectable style={s.detailText}>{formatCrashReport(selected)}</Text></View>
        <View style={s.row}>
          <TouchableOpacity disabled={busy} style={s.btn} onPress={()=>act(()=>copyCrashReport(selected),'متن خطا کپی شد.')}><Text style={s.btnTxt}>کپی متن</Text></TouchableOpacity>
          <TouchableOpacity disabled={busy} style={s.btn} onPress={()=>act(()=>shareCrashReport(selected))}><Text style={s.btnTxt}>اشتراک‌گذاری</Text></TouchableOpacity>
        </View>
        <TouchableOpacity disabled={busy||!!selected.sent_at} style={[s.btn,s.full,selected.sent_at&&s.disabled]} onPress={()=>act(()=>sendCrashReport(selected),'گزارش به سرور ارسال شد.')}><Text style={s.btnTxt}>ارسال به سرور</Text></TouchableOpacity>
        <TouchableOpacity disabled={busy} style={[s.btn,s.full,s.danger]} onPress={()=>Alert.alert('حذف گزارش','این گزارش حذف شود؟',[{text:'خیر'},{text:'بله',onPress:()=>act(()=>deleteCrashReport(selected.id))}])}><Text style={s.btnTxt}>حذف گزارش</Text></TouchableOpacity>
      </>}
    </ScrollView>
  </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:C.paper},pad:{padding:16,paddingBottom:40},note:{fontFamily:FONT.regular,textAlign:'right',lineHeight:22,color:C.ink,marginBottom:12},empty:{fontFamily:FONT.regular,textAlign:'center',marginTop:30,color:C.muted},card:{borderWidth:1,borderColor:'#ddd',borderRadius:12,padding:12,marginBottom:10,backgroundColor:'#fff'},active:{borderColor:C.brand,borderWidth:2},id:{fontFamily:FONT.bold,textAlign:'right',color:C.ink},small:{fontFamily:FONT.regular,textAlign:'right',fontSize:11,color:C.muted,marginTop:4},msg:{fontFamily:FONT.regular,textAlign:'right',marginTop:6,color:C.ink},state:{fontFamily:FONT.bold,textAlign:'right',fontSize:12,color:C.brand,marginTop:6},title:{fontFamily:FONT.bold,textAlign:'right',fontSize:17,marginVertical:12,color:C.ink},detail:{backgroundColor:'#111',borderRadius:10,padding:12},detailText:{fontFamily:FONT.regular,color:'#fff',fontSize:12,textAlign:'left'},row:{flexDirection:'row-reverse',gap:8,marginTop:12},btn:{flex:1,backgroundColor:C.brand,borderRadius:10,padding:12,alignItems:'center'},full:{marginTop:10,flex:0},danger:{backgroundColor:'#9b1c1c'},disabled:{opacity:.5},btnTxt:{fontFamily:FONT.bold,color:'#fff'}});
