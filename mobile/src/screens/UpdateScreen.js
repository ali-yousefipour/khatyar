import React, { useEffect, useMemo, useState } from 'react';
import { Alert, AppState, DeviceEventEmitter, NativeModules, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C, FONT } from '../theme';
import { downloadAndInstallUpdate } from '../updater';

const { KhatyarUpdater } = NativeModules;
function bytes(n) { n=Number(n)||0; if(n<1024)return `${n} B`; if(n<1048576)return `${(n/1024).toFixed(1)} KB`; if(n<1073741824)return `${(n/1048576).toFixed(1)} MB`; return `${(n/1073741824).toFixed(2)} GB`; }

export default function UpdateScreen({ info, onRecheck }) {
  const [busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[downloaded,setDownloaded]=useState(0),[total,setTotal]=useState(0),[status,setStatus]=useState('آماده دانلود'),[permission,setPermission]=useState(false);
  const fileName=useMemo(()=>`KhatYar-v${String(info?.latest||'update').replace(/[^0-9A-Za-z._-]/g,'_')}.apk`,[info?.latest]);
  useEffect(()=>{
    const tryPendingInstall=async()=>{try{if(KhatyarUpdater?.installPending)await KhatyarUpdater.installPending();}catch(_) {}};
    const subs=[
      DeviceEventEmitter.addListener('khatyarUpdaterProgress',e=>{setBusy(true);setProgress(Math.max(0,Math.min(1,Number(e?.progress)||0)));setDownloaded(Number(e?.downloaded)||0);setTotal(Number(e?.total)||0);setStatus('در حال دانلود نسخه جدید… در صورت قطع اینترنت، ادامه دانلود از بخش دریافت‌شده انجام می‌شود.');}),
      DeviceEventEmitter.addListener('khatyarUpdaterComplete',()=>{setBusy(false);setProgress(1);setStatus('دانلود کامل شد؛ در حال اجرای نصب‌کننده…');}),
      DeviceEventEmitter.addListener('khatyarUpdaterInstallStarted',()=>{setBusy(false);setPermission(false);setStatus('نصب‌کننده اندروید باز شد.');}),
      DeviceEventEmitter.addListener('khatyarUpdaterInstallPermission',e=>{setBusy(false);setPermission(true);setStatus('اجازه نصب از این منبع لازم است؛ پس از بازگشت به برنامه نصب ادامه می‌یابد.');Alert.alert('اجازه نصب لازم است',e?.message||'اجازه نصب برنامه از این منبع را فعال کنید. پس از بازگشت به خطیار، نصب به‌صورت خودکار ادامه می‌یابد.');}),
      DeviceEventEmitter.addListener('khatyarUpdaterInstallError',e=>{setBusy(false);setStatus('نصب خودکار انجام نشد؛ فایل در Downloads باقی است.');Alert.alert('نصب خودکار انجام نشد',e?.message||'فایل APK در Downloads ذخیره شده و می‌توانید آن را دستی نصب کنید.');}),
      DeviceEventEmitter.addListener('khatyarUpdaterError',e=>{setBusy(false);setStatus('دانلود متوقف شد؛ با زدن دکمه دوباره، دانلود از محل قطع‌شده ادامه پیدا می‌کند.');Alert.alert('دانلود متوقف شد',e?.message||'اتصال اینترنت قطع شد. فایل ناقص حفظ شده و دانلود بعدی از همان نقطه ادامه می‌یابد.')})
    ];
    const subApp=AppState.addEventListener('change',state=>{if(state==='active')tryPendingInstall();});
    tryPendingInstall();
    return ()=>{subs.forEach(s=>{try{s.remove()}catch(_){}});try{subApp.remove()}catch(_) {}};
  },[]);
  async function download(){
    if(!info?.url){Alert.alert('به‌روزرسانی','آدرس فایل به‌روزرسانی در سرور تنظیم نشده است.');return;}
    if(!KhatyarUpdater?.downloadApk){Alert.alert('به‌روزرسانی','ماژول دانلود درون‌برنامه‌ای در این نسخه موجود نیست.');return;}
    setBusy(true);setPermission(false);setStatus('در حال شروع/ادامه دانلود…');
    try{await downloadAndInstallUpdate(info);}catch(error){setBusy(false);setStatus(error?.message||'دانلود ناموفق بود.');Alert.alert('خطای به‌روزرسانی',error?.message||'فایل APK قابل دریافت نیست.');}
  }
  const pct=Math.round(progress*100);
  return <ScrollView style={s.page} contentContainerStyle={s.wrap} showsVerticalScrollIndicator={false}>
    <MaterialCommunityIcons name="cellphone-arrow-down" size={52} color={C.brand} accessible={false} />
    <Text style={s.title}>به‌روزرسانی لازم است</Text>
    <Text style={s.msg}>نسخه جدید داخل برنامه دانلود می‌شود. در صورت قطع موقت اینترنت، فایل ناقص حذف نمی‌شود و پس از برقراری اتصال، دانلود از همان نقطه ادامه پیدا می‌کند. پس از دانلود کامل، APK در Downloads ذخیره و نصب‌کننده اندروید اجرا می‌شود.</Text>
    <Text style={s.ver}>نسخه فعلی: {info?.current}  |  نسخه جدید: {info?.latest}</Text>
    {!!info?.notes && <Text style={s.notes}>{info.notes}</Text>}
    {!info?.url && <Text style={s.note}>لینک APK در سرور ثبت نشده یا معتبر نیست. برای اصلاح، به تنظیمات نسخه در پنل مدیریت مراجعه کنید.</Text>}
    <View accessibilityLiveRegion="polite" style={s.box}>
      {busy || progress > 0 ? <><View style={s.track}><View style={[s.fill,{width:`${pct}%`}]}/></View><View style={s.row}><Text style={s.small}>{pct}%</Text><Text style={s.small}>{bytes(downloaded)}{total?` از ${bytes(total)}`:''}</Text></View></> : null}
      <Text style={s.status}>{status}</Text>
    </View>
    <TouchableOpacity accessibilityRole="button" accessibilityState={{disabled:busy||!info?.url}} style={[s.btn,(!info?.url||busy)&&{opacity:0.55}]} onPress={download} disabled={busy||!info?.url}><Text style={s.btnTxt}>{busy?'در حال دانلود…':'دانلود / ادامه دانلود و نصب'}</Text></TouchableOpacity>
    <Text style={s.location}>محل ذخیره نهایی: حافظه داخلی › Downloads › {fileName}</Text>
    {permission&&<Text style={s.note}>مجوز نصب را فعال کنید و به خطیار برگردید؛ نصب خودکار ادامه خواهد یافت.</Text>}
    <TouchableOpacity accessibilityRole="button" style={s.ghost} onPress={onRecheck} disabled={busy}><Text style={s.ghostTxt}>بعد از نصب، بررسی مجدد</Text></TouchableOpacity>
  </ScrollView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:C.paper},wrap:{flexGrow:1,alignItems:'center',justifyContent:'center',padding:24,paddingBottom:44},title:{fontFamily:FONT.bold,color:C.ink,fontSize:22,marginTop:8,marginBottom:14,textAlign:'center'},msg:{fontFamily:FONT.regular,color:C.muted,fontSize:14,textAlign:'center',lineHeight:24,marginBottom:12},ver:{fontFamily:FONT.regular,color:C.ink,fontSize:13,marginBottom:18,textAlign:'center'},notes:{fontFamily:FONT.regular,color:C.ink,fontSize:13,lineHeight:22,textAlign:'right',backgroundColor:'#fff',borderRadius:12,borderWidth:1,borderColor:C.line,padding:14,width:'100%',marginBottom:14},box:{width:'100%',maxWidth:360,marginBottom:16,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:14,padding:14},track:{height:12,borderRadius:8,backgroundColor:'#e5e7eb',overflow:'hidden'},fill:{height:'100%',borderRadius:8,backgroundColor:C.brand},row:{flexDirection:'row',justifyContent:'space-between',marginTop:7},small:{fontFamily:FONT.regular,color:C.ink,fontSize:12},status:{fontFamily:FONT.regular,color:C.muted,fontSize:13,textAlign:'center',marginTop:8,lineHeight:21},btn:{backgroundColor:C.brand,borderRadius:13,paddingVertical:14,paddingHorizontal:24,marginBottom:8,width:'100%',maxWidth:360,minHeight:50,alignItems:'center',justifyContent:'center'},btnTxt:{fontFamily:FONT.bold,color:'#fff',fontSize:15},ghost:{paddingVertical:13,paddingHorizontal:20,minHeight:48,justifyContent:'center'},ghostTxt:{fontFamily:FONT.regular,color:C.brand,fontSize:14},location:{fontFamily:FONT.regular,color:C.muted,fontSize:11,textAlign:'center',marginTop:8},note:{fontFamily:FONT.regular,color:C.taxi,fontSize:12,marginTop:12,textAlign:'center'}});
