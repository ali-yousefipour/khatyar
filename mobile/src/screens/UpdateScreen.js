import React, { useEffect, useMemo, useState } from 'react';
import { Alert, AppState, DeviceEventEmitter, NativeModules, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C, FONT } from '../theme';

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
    try{await KhatyarUpdater.downloadApk(info.url,fileName);}catch(_){setBusy(false);}
  }
  const pct=Math.round(progress*100);
  return <View style={s.wrap}>
    <Text style={s.icon}>⬆</Text>
    <Text style={s.title}>به‌روزرسانی لازم است</Text>
    <Text style={s.msg}>نسخه جدید داخل برنامه دانلود می‌شود. در صورت قطع موقت اینترنت، فایل ناقص حذف نمی‌شود و پس از برقراری اتصال، دانلود از همان نقطه ادامه پیدا می‌کند. پس از دانلود کامل، APK در Downloads ذخیره و نصب‌کننده اندروید اجرا می‌شود.</Text>
    <Text style={s.ver}>نسخه فعلی: {info?.current}  |  نسخه جدید: {info?.latest}</Text>
    {busy&&<View style={s.box}><View style={s.track}><View style={[s.fill,{width:`${pct}%`}]}/></View><View style={s.row}><Text style={s.small}>{pct}%</Text><Text style={s.small}>{bytes(downloaded)}{total?` از ${bytes(total)}`:''}</Text></View><Text style={s.status}>{status}</Text></View>}
    <TouchableOpacity style={s.btn} onPress={download} disabled={busy}><Text style={s.btnTxt}>{busy?'در حال دانلود…':'دانلود / ادامه دانلود و نصب'}</Text></TouchableOpacity>
    <Text style={s.location}>محل ذخیره نهایی: حافظه داخلی › Downloads › {fileName}</Text>
    {permission&&<Text style={s.note}>مجوز نصب را فعال کنید و به خطیار برگردید؛ نصب خودکار ادامه خواهد یافت.</Text>}
    <TouchableOpacity style={s.ghost} onPress={onRecheck} disabled={busy}><Text style={s.ghostTxt}>بعد از نصب، بررسی مجدد</Text></TouchableOpacity>
  </View>;
}
const s=StyleSheet.create({wrap:{flex:1,backgroundColor:C.paper,alignItems:'center',justifyContent:'center',padding:24},icon:{fontSize:54,marginBottom:8,color:C.brand},title:{fontFamily:FONT.bold,color:C.ink,fontSize:20,marginBottom:12,textAlign:'center'},msg:{fontFamily:FONT.regular,color:C.muted,fontSize:14,textAlign:'center',lineHeight:24,marginBottom:12},ver:{fontFamily:FONT.regular,color:C.ink,fontSize:13,marginBottom:18,textAlign:'center'},box:{width:'100%',maxWidth:360,marginBottom:16},track:{height:12,borderRadius:8,backgroundColor:'#e5e7eb',overflow:'hidden'},fill:{height:'100%',borderRadius:8,backgroundColor:C.brand},row:{flexDirection:'row',justifyContent:'space-between',marginTop:7},small:{fontFamily:FONT.regular,color:C.ink,fontSize:12},status:{fontFamily:FONT.regular,color:C.muted,fontSize:12,textAlign:'center',marginTop:8},btn:{backgroundColor:C.brand,borderRadius:13,paddingVertical:14,paddingHorizontal:34,marginBottom:8,minWidth:250,alignItems:'center'},btnTxt:{fontFamily:FONT.bold,color:'#fff',fontSize:15},ghost:{paddingVertical:10,paddingHorizontal:20},ghostTxt:{fontFamily:FONT.regular,color:C.brand,fontSize:14},location:{fontFamily:FONT.regular,color:C.muted,fontSize:11,textAlign:'center',marginTop:8},note:{fontFamily:FONT.regular,color:C.taxi,fontSize:12,marginTop:12,textAlign:'center'}});
