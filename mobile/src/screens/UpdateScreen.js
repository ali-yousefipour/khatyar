import React, { useEffect, useMemo, useState } from 'react';
import { Alert, DeviceEventEmitter, NativeModules, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';

const { KhatyarUpdater } = NativeModules;
function bytes(n) { n=Number(n)||0; if(n<1024)return `${n} B`; if(n<1048576)return `${(n/1024).toFixed(1)} KB`; if(n<1073741824)return `${(n/1048576).toFixed(1)} MB`; return `${(n/1073741824).toFixed(2)} GB`; }

export default function UpdateScreen({ info, onRecheck }) {
  const [busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[downloaded,setDownloaded]=useState(0),[total,setTotal]=useState(0),[status,setStatus]=useState('آماده دانلود'),[permission,setPermission]=useState(false);
  const fileName=useMemo(()=>`KhatYar-v${String(info?.latest||'update').replace(/[^0-9A-Za-z._-]/g,'_')}.apk`,[info?.latest]);
  useEffect(()=>{
    const subs=[
      DeviceEventEmitter.addListener('khatyarUpdaterProgress',e=>{setProgress(Math.max(0,Math.min(1,Number(e?.progress)||0)));setDownloaded(Number(e?.downloaded)||0);setTotal(Number(e?.total)||0);setStatus('در حال دانلود نسخه جدید…');}),
      DeviceEventEmitter.addListener('khatyarUpdaterComplete',e=>{setBusy(false);setProgress(1);setStatus('دانلود کامل شد؛ در حال اجرای نصب‌کننده…');}),
      DeviceEventEmitter.addListener('khatyarUpdaterInstallStarted',()=>{setBusy(false);setStatus('نصب‌کننده اندروید باز شد.');}),
      DeviceEventEmitter.addListener('khatyarUpdaterInstallPermission',e=>{setBusy(false);setPermission(true);setStatus('اجازه نصب از این منبع لازم است.');Alert.alert('اجازه نصب لازم است',e?.message||'اجازه نصب برنامه از این منبع را فعال کنید؛ فایل دانلودشده در Downloads باقی می‌ماند.');}),
      DeviceEventEmitter.addListener('khatyarUpdaterInstallError',e=>{setBusy(false);setStatus('نصب خودکار انجام نشد؛ فایل در Downloads باقی است.');Alert.alert('نصب خودکار انجام نشد',e?.message||'فایل APK در Downloads ذخیره شده و می‌توانید آن را دستی نصب کنید.');}),
      DeviceEventEmitter.addListener('khatyarUpdaterError',e=>{setBusy(false);setStatus('دانلود ناموفق بود.');Alert.alert('خطا در به‌روزرسانی',e?.message||'دانلود فایل به‌روزرسانی انجام نشد.');})
    ]; return ()=>subs.forEach(s=>{try{s.remove()}catch(_){}});
  },[]);
  async function download(){
    if(!info?.url){Alert.alert('به‌روزرسانی','آدرس فایل به‌روزرسانی در سرور تنظیم نشده است.');return;}
    if(!KhatyarUpdater?.downloadApk){Alert.alert('به‌روزرسانی','ماژول دانلود درون‌برنامه‌ای در این نسخه موجود نیست.');return;}
    setBusy(true);setPermission(false);setProgress(0);setDownloaded(0);setTotal(0);setStatus('در حال شروع دانلود…');
    try{await KhatyarUpdater.downloadApk(info.url,fileName);}catch(_){setBusy(false);}
  }
  const pct=Math.round(progress*100);
  return <View style={s.wrap}>
    <Text style={s.icon}>⬆</Text>
    <Text style={s.title}>به‌روزرسانی لازم است</Text>
    <Text style={s.msg}>نسخه جدید مستقیماً داخل برنامه دانلود می‌شود، در پوشه Downloads گوشی ذخیره می‌ماند و پس از پایان دانلود نصب‌کننده اندروید اجرا می‌شود.</Text>
    <Text style={s.ver}>نسخه فعلی: {info?.current}  |  نسخه جدید: {info?.latest}</Text>
    {busy&&<View style={s.box}><View style={s.track}><View style={[s.fill,{width:`${pct}%`}]}/></View><View style={s.row}><Text style={s.small}>{pct}%</Text><Text style={s.small}>{bytes(downloaded)}{total?` از ${bytes(total)}`:''}</Text></View><Text style={s.status}>{status}</Text></View>}
    <TouchableOpacity style={s.btn} onPress={download} disabled={busy}><Text style={s.btnTxt}>{busy?'در حال دانلود…':'دانلود و نصب نسخه جدید'}</Text></TouchableOpacity>
    <Text style={s.location}>محل ذخیره: حافظه داخلی › Downloads › {fileName}</Text>
    {permission&&<Text style={s.note}>پس از فعال‌سازی اجازه نصب، فایل APK دانلودشده را از Downloads اجرا کنید.</Text>}
    <TouchableOpacity style={s.ghost} onPress={onRecheck} disabled={busy}><Text style={s.ghostTxt}>بعد از نصب، بررسی مجدد</Text></TouchableOpacity>
  </View>;
}
const s=StyleSheet.create({wrap:{flex:1,backgroundColor:C.paper,alignItems:'center',justifyContent:'center',padding:24},icon:{fontSize:54,marginBottom:8,color:C.brand},title:{fontFamily:FONT.bold,color:C.ink,fontSize:20,marginBottom:12,textAlign:'center'},msg:{fontFamily:FONT.regular,color:C.muted,fontSize:14,textAlign:'center',lineHeight:24,marginBottom:12},ver:{fontFamily:FONT.regular,color:C.ink,fontSize:13,marginBottom:18,textAlign:'center'},box:{width:'100%',maxWidth:360,marginBottom:16},track:{height:12,borderRadius:8,backgroundColor:'#e5e7eb',overflow:'hidden'},fill:{height:'100%',borderRadius:8,backgroundColor:C.brand},row:{flexDirection:'row',justifyContent:'space-between',marginTop:7},small:{fontFamily:FONT.regular,color:C.ink,fontSize:12},status:{fontFamily:FONT.regular,color:C.muted,fontSize:12,textAlign:'center',marginTop:8},btn:{backgroundColor:C.brand,borderRadius:13,paddingVertical:14,paddingHorizontal:34,marginBottom:8,minWidth:250,alignItems:'center'},btnTxt:{fontFamily:FONT.bold,color:'#fff',fontSize:15},ghost:{paddingVertical:10,paddingHorizontal:20},ghostTxt:{fontFamily:FONT.regular,color:C.brand,fontSize:14},location:{fontFamily:FONT.regular,color:C.muted,fontSize:11,textAlign:'center',marginTop:8},note:{fontFamily:FONT.regular,color:C.taxi,fontSize:12,marginTop:12,textAlign:'center'}});
