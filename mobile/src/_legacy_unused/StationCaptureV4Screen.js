import React,{useEffect,useMemo,useState}from'react';import{Alert,ActivityIndicator,Image,Linking,ScrollView,StyleSheet,Text,TextInput,TouchableOpacity,View,Modal}from'react-native';import*as Location from'expo-location';import*as ImagePicker from'expo-image-picker';import{WebView}from'react-native-webview';import{request,imageSource}from'../api';import{C,FONT}from'../theme';
const fa=n=>String(n??'').replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const fmt=dt=>{try{return new Intl.DateTimeFormat('fa-IR-u-ca-persian',{dateStyle:'short',timeStyle:'medium',timeZone:'Asia/Tehran'}).format(new Date(String(dt).replace(' ','T')+'+03:30'))}catch(_){return dt||'—'}};
const mapHtml=(lat,lng)=>`<!doctype html><html dir="rtl"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0}#hint{position:fixed;z-index:9999;top:8px;left:8px;right:8px;background:#fff;padding:8px;border-radius:8px;text-align:center;font:13px sans-serif;box-shadow:0 1px 5px #777}</style></head><body><div id="hint">نشانگر را بکشید یا روی نقشه ضربه بزنید</div><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const m=L.map('map').setView([${lat},${lng}],17);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(m);const p=L.marker([${lat},${lng}],{draggable:true}).addTo(m);function send(){const x=p.getLatLng();window.ReactNativeWebView.postMessage(JSON.stringify({latitude:x.lat,longitude:x.lng,manual:true}))}p.on('dragend',send);m.on('click',e=>{p.setLatLng(e.latlng);send()});</script></body></html>`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// حداکثر دقت قابل قبول GPS (متر) — باید با محدودیت سمت سرور (station-wizard-api.php) همسان باشد.
const MAX_ACCURACY_M=20;
// حداکثر تعداد تلاش برای گرفتن یک فیکس دقیق، و مکث بین هر تلاش تا گیرندهٔ GPS
// فرصت بهبود دقت را داشته باشد (تلاش‌های پشت‌سرهم بدون مکث معمولاً همان فیکس کش‌شده را برمی‌گردانند).
const GPS_MAX_ATTEMPTS=6;
const GPS_ATTEMPT_DELAY_MS=700;

export default function StationCaptureV4Screen({route,navigation}){
  const editId=Number(route?.params?.stationId||0);
  const[busy,setBusy]=useState(true),[allowed,setAllowed]=useState(false),[step,setStep]=useState(0),[types,setTypes]=useState([]),[lines,setLines]=useState([]),[nearest,setNearest]=useState([]),[line,setLine]=useState(null),[search,setSearch]=useState(''),[missing,setMissing]=useState(false),[missingName,setMissingName]=useState('');
  const[gps,setGps]=useState(null); // {latitude,longitude,accuracy,method}
  const[signs,setSigns]=useState([]); // {type_id,title,photo_path,newPhoto,displaySrc}
  const[locationPhotoNew,setLocationPhotoNew]=useState(null); // data:image;base64,... — فقط وقتی این جلسه عکس تازه گرفته شود
  const[locationPhotoExistingSrc,setLocationPhotoExistingSrc]=useState(null); // منبع تصویر قبلاً ثبت‌شده (فقط حالت ویرایش)
  const[address,setAddress]=useState(''),[saving,setSaving]=useState(false);
  const[locating,setLocating]=useState(false),[gpsAttempt,setGpsAttempt]=useState(0),[gpsBestAccuracy,setGpsBestAccuracy]=useState(null);
  const[typeModal,setTypeModal]=useState(false),[manualMap,setManualMap]=useState(false),[editing,setEditing]=useState(null);

  useEffect(()=>{let active=true;(async()=>{try{
    const[items,t,l]=await Promise.all([request('/my/app-items',{noStore:true}),request('/station-wizard-api.php?op=types',{noStore:true}),request('/station-wizard-api.php?op=lines',{noStore:true})]);
    if(!active)return;
    const ok=Array.isArray(items?.items)&&items.items.includes('StationCapture');
    setAllowed(ok);setTypes(Array.isArray(t)?t:[]);setLines(Array.isArray(l)?l:[]);
    if(!ok)throw Error('دسترسی «ثبت موقعیت و تصویر خطوط» برای شما فعال نیست.');
    if(editId){
      const d=await request(`/station-wizard-api.php?op=detail&id=${editId}`,{noStore:true});
      if(active&&d){
        setEditing(d);
        setLine({id:d.line_id,code:d.line_code,origin:d.origin,destination:d.destination});
        setGps({latitude:Number(d.latitude),longitude:Number(d.longitude),accuracy:d.accuracy_m,method:'gps'});
        setAddress(d.physical_address||'');
        // عکس‌های قبلاً ثبت‌شده فقط از طریق endpoint احرازهویت‌شدهٔ تصویر قابل نمایش‌اند
        // (مسیر خام سرور با .htaccess مسدود است)؛ اینجا صرفاً برای پیش‌نمایش استفاده می‌شود
        // و در صورت عدم گرفتن عکس تازه، در ارسال نهایی دوباره فرستاده نمی‌شود.
        setLocationPhotoExistingSrc(imageSource(`/api/station-image.php?station_id=${editId}`));
        setSigns((d.signs||[]).map(x=>({type_id:x.sign_type_id,title:x.title,photo_path:x.photo_path||'',newPhoto:null,displaySrc:imageSource(`/api/station-image.php?sign_id=${x.id}`)})));
      }
    }
  }catch(e){if(active)Alert.alert('خطیار',e.message||'دریافت اطلاعات ناموفق بود')}finally{if(active)setBusy(false)}})();return()=>{active=false}},[editId]);

  const loadNearest=async(lat,lng)=>{try{const r=await request(`/station-wizard-api.php?op=nearest-lines&lat=${lat}&lng=${lng}`,{noStore:true});setNearest(Array.isArray(r)?r:[])}catch(_){setNearest([])}};

  const getGps=async()=>{
    setLocating(true);setGpsAttempt(0);setGpsBestAccuracy(null);
    try{
      let p=await Location.getForegroundPermissionsAsync();
      if(p.status!=='granted')p=await Location.requestForegroundPermissionsAsync();
      if(p.status!=='granted'){Alert.alert('دسترسی GPS','مجوز موقعیت لازم است.',[{text:'تنظیمات',onPress:()=>Linking.openSettings()},{text:'لغو',style:'cancel'}]);return}
      if(!(await Location.hasServicesEnabledAsync())){Alert.alert('GPS خاموش است','GPS گوشی را روشن کنید.');return}
      let best=null;
      for(let i=0;i<GPS_MAX_ATTEMPTS;i++){
        setGpsAttempt(i+1);
        const x=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Highest,mayShowUserSettingsDialog:true});
        const acc=Number(x.coords.accuracy??999);
        if(!best||acc<Number(best.coords.accuracy??999)){best=x;setGpsBestAccuracy(acc)}
        if(acc<=8)break;
        if(i<GPS_MAX_ATTEMPTS-1)await sleep(GPS_ATTEMPT_DELAY_MS);
      }
      if(!best)return;
      const a=Number(best.coords.accuracy||999);
      setGps({latitude:best.coords.latitude,longitude:best.coords.longitude,accuracy:a,method:'gps'});
      await loadNearest(best.coords.latitude,best.coords.longitude);
      if(a>MAX_ACCURACY_M){
        Alert.alert('دقت GPS پایین است',`دقت GPS به‌دست‌آمده ${fa(Math.round(a))} متر است و بیشتر از حداکثر مجاز (${fa(MAX_ACCURACY_M)} متر) است. کمی جابه‌جا شوید یا فضای باز پیدا کنید و دوباره تلاش کنید، یا موقعیت را دستی روی نقشه تعیین کنید.`,[{text:'ثبت دستی',onPress:()=>setManualMap(true)},{text:'تلاش دوباره',onPress:getGps}]);
      }
    }catch(e){Alert.alert('GPS',e.message||'دریافت موقعیت انجام نشد')}finally{setLocating(false)}
  };
  useEffect(()=>{if(!busy&&!editId)getGps()},[busy,editId]);

  // عکس همیشه با base64 گرفته می‌شود تا مستقیماً به‌صورت data URI به سرور
  // ارسال شود؛ ارسال مسیر خام فایل دستگاه (file://...) توسط سرور قابل ذخیره نیست.
  const pickPhoto=async cb=>{
    const p=await ImagePicker.requestCameraPermissionsAsync();
    if(p.status!=='granted'){Alert.alert('دوربین','اجازه دسترسی به دوربین لازم است.');return}
    const r=await ImagePicker.launchCameraAsync({mediaTypes:['images'],quality:.78,base64:true,exif:false,allowsEditing:false});
    if(!r.canceled&&r.assets?.[0]?.base64)cb(`data:image/jpeg;base64,${r.assets[0].base64}`);
  };
  const addSign=()=>{if(!types.length){Alert.alert('تابلو','نوع تابلو فعالی تعریف نشده است.');return}setTypeModal(true)};
  const chooseType=t=>{setTypeModal(false);setTimeout(()=>pickPhoto(dataUri=>{setSigns(s=>[...s,{type_id:t.id,title:t.title,photo_path:'',newPhoto:dataUri,displaySrc:{uri:dataUri}}]);}),150)};
  const retakeSign=i=>pickPhoto(dataUri=>setSigns(s=>s.map((x,n)=>n===i?{...x,newPhoto:dataUri,displaySrc:{uri:dataUri}}:x)));
  const removeSign=i=>setSigns(s=>s.filter((_,n)=>n!==i));

  const locationPhotoDisplay=locationPhotoNew?{uri:locationPhotoNew}:locationPhotoExistingSrc;
  const hasLocationPhoto=!!locationPhotoNew||!!locationPhotoExistingSrc;

  const canNext=useMemo(()=>{
    if(step===0)return !!gps;
    if(step===1)return !!line||missing&&!!missingName.trim();
    if(step===2)return signs.length>0&&signs.every(x=>x.newPhoto||x.photo_path);
    if(step===3)return hasLocationPhoto;
    if(step===4)return !!address.trim();
    return true;
  },[step,gps,line,missing,missingName,signs,hasLocationPhoto,address]);
  const next=()=>{if(!canNext){Alert.alert('تکمیل مرحله','برای ادامه، همه موارد الزامی این مرحله را تکمیل کنید.');return}setStep(s=>Math.min(5,s+1))};
  const back=()=>setStep(s=>Math.max(0,s-1));
  const onMapMessage=e=>{try{const x=JSON.parse(e.nativeEvent.data);setGps(g=>({...(g||{}),latitude:Number(x.latitude),longitude:Number(x.longitude),accuracy:null,method:'manual'}));loadNearest(Number(x.latitude),Number(x.longitude));setManualMap(false)}catch(_) {}};

  const save=async()=>{
    if(!canNext){Alert.alert('اطلاعات ناقص','تمام مراحل الزامی را تکمیل کنید.');return}
    setSaving(true);
    try{
      const body={
        station_id:editId||0,
        line_id:missing?0:Number(line?.id||0),
        line_missing:missing,
        missing_line_name:missingName.trim(),
        latitude:gps.latitude,
        longitude:gps.longitude,
        accuracy_m:gps.accuracy,
        location_method:gps.method,
        physical_address:address.trim(),
        // فقط وقتی عکس تازه‌ای در همین جلسه گرفته شده ارسال می‌شود؛ در غیر این صورت
        // null فرستاده می‌شود تا سرور تصویر قبلاً ذخیره‌شده را حفظ کند (ویرایش بدون تغییر عکس).
        location_photo:locationPhotoNew||null,
        signs:signs.map(x=>({type_id:x.type_id,photo:x.newPhoto||null,photo_path:x.photo_path||''})),
      };
      if(missing){body.line_name=missingName.trim();}
      const r=await request('/station-wizard-api.php?op=save',{method:'POST',body});
      if(!r?.ok)throw Error(r?.error||'ثبت انجام نشد');
      Alert.alert('ثبت موفق','اطلاعات ایستگاه با موفقیت ثبت شد.',[{text:'باشه',onPress:()=>navigation.goBack()}]);
    }catch(e){Alert.alert('خطا',e.message||'ثبت اطلاعات ناموفق بود')}finally{setSaving(false)}
  };

  const stepTitle=['موقعیت ایستگاه','انتخاب خط','تابلوهای ایستگاه','تصویر محل ایستگاه','آدرس محل','تأیید نهایی'][step];
  if(busy)return <View style={s.center}><ActivityIndicator size="large" color={C.brand}/><Text style={s.muted}>در حال آماده‌سازی ثبت ایستگاه…</Text></View>;

  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <View style={s.progress}>
      <Text style={s.stepNo}>مرحله {fa(step+1)} از {fa(6)}</Text>
      <Text style={s.title}>{stepTitle}</Text>
      <View style={s.bar}><View style={[s.barOn,{width:`${((step+1)/6)*100}%`}]}/></View>
    </View>

    {step===0&&<View style={s.card}>
      <Text style={s.h2}>موقعیت را با دقت بالا ثبت کنید</Text>
      {gps?<Text style={s.info}>عرض: {fa(Number(gps.latitude).toFixed(7))}  طول: {fa(Number(gps.longitude).toFixed(7))}{gps.accuracy?`  دقت: ${fa(Number(gps.accuracy).toFixed(1))} متر`:''}</Text>:<Text style={s.muted}>در حال دریافت موقعیت دقیق…</Text>}
      {locating&&<View style={s.gpsProgress}>
        <ActivityIndicator size="small" color={C.brand}/>
        <Text style={s.muted}>تلاش {fa(gpsAttempt)} از {fa(GPS_MAX_ATTEMPTS)}{gpsBestAccuracy!=null?` — بهترین دقت تاکنون: ${fa(Math.round(gpsBestAccuracy))} متر`:''}</Text>
      </View>}
      <TouchableOpacity style={s.primary} onPress={getGps} disabled={locating}><Text style={s.primaryTxt}>{locating?'در حال دریافت…':'دریافت موقعیت دقیق'}</Text></TouchableOpacity>
      {gps&&Number(gps.accuracy)>MAX_ACCURACY_M?<TouchableOpacity style={s.secondary} onPress={()=>setManualMap(true)}><Text style={s.secondaryTxt}>تعیین دستی موقعیت روی نقشه</Text></TouchableOpacity>:null}
      {manualMap&&gps?<View style={s.mapBox}><WebView originWhitelist={['*']} source={{html:mapHtml(gps.latitude,gps.longitude)}} onMessage={onMapMessage}/></View>:null}
    </View>}

    {step===1&&<View style={s.card}>
      <Text style={s.h2}>۵ خط نزدیک به موقعیت</Text>
      {nearest.slice(0,5).map(x=><TouchableOpacity key={x.id} style={[s.lineRow,line?.id===x.id&&s.selected]} onPress={()=>{setMissing(false);setLine(x)}}>
        <View><Text style={s.lineTitle}>{x.code||'خط'}</Text><Text style={s.muted}>{x.origin||''}{x.destination?` تا ${x.destination}`:''} · {fa(Math.round(Number(x.distance_m||0)))} متر</Text></View>
        <Text>انتخاب</Text>
      </TouchableOpacity>)}
      <Text style={s.h2}>سایر خطوط</Text>
      <TextInput value={search} onChangeText={setSearch} placeholder="جستجوی کد یا نام خط" placeholderTextColor="#888" style={s.input}/>
      {lines.filter(x=>!search||`${x.code||''} ${x.origin||''} ${x.destination||''}`.includes(search)).slice(0,20).map(x=><TouchableOpacity key={`all-${x.id}`} style={[s.lineRow,line?.id===x.id&&s.selected]} onPress={()=>{setMissing(false);setLine(x)}}>
        <Text style={s.lineTitle}>{x.code||'خط'} {x.origin&&x.destination?`— ${x.origin} تا ${x.destination}`:''}</Text>
        <Text>انتخاب</Text>
      </TouchableOpacity>)}
      <TouchableOpacity style={[s.missingBtn,missing&&s.selected]} onPress={()=>{setMissing(true);setLine(null)}}><Text style={s.lineTitle}>خط در لیست وجود ندارد یا غیرفعال است</Text></TouchableOpacity>
      {missing&&<TextInput value={missingName} onChangeText={setMissingName} placeholder="عنوان خط را وارد کنید" style={s.input}/>}
    </View>}

    {step===2&&<View style={s.card}>
      <Text style={s.h2}>تابلوهای ایستگاه</Text>
      <TouchableOpacity style={s.addBtn} onPress={addSign}><Text style={s.addTxt}>＋ افزودن تابلو ایستگاه</Text></TouchableOpacity>
      {signs.map((x,i)=><View key={i} style={s.sign}>
        <Text style={s.lineTitle}>{x.title||'تابلو'}</Text>
        {(x.newPhoto||x.displaySrc)?<Image source={x.newPhoto?{uri:x.newPhoto}:x.displaySrc} style={s.photo}/>:null}
        <View style={{flexDirection:'row-reverse',gap:14,marginTop:8}}>
          <TouchableOpacity onPress={()=>retakeSign(i)}><Text style={s.retake}>گرفتن مجدد عکس</Text></TouchableOpacity>
          <TouchableOpacity onPress={()=>removeSign(i)}><Text style={s.remove}>حذف تابلو</Text></TouchableOpacity>
        </View>
      </View>)}
      <Text style={s.muted}>پس از هر عکس، برای افزودن تابلوی دیگر دوباره دکمه افزودن تابلو را بزنید؛ در صورت اتمام به مرحله بعد بروید.</Text>
    </View>}

    {step===3&&<View style={s.card}>
      <Text style={s.h2}>تصویر محل ایستگاه</Text>
      {locationPhotoDisplay?<Image source={locationPhotoDisplay} style={s.bigPhoto}/>:null}
      <TouchableOpacity style={s.primary} onPress={()=>pickPhoto(setLocationPhotoNew)}><Text style={s.primaryTxt}>{hasLocationPhoto?'تصویربرداری مجدد':'باز کردن دوربین و تصویربرداری'}</Text></TouchableOpacity>
      <Text style={s.muted}>گرفتن و تأیید تصویر برای ادامه الزامی است.</Text>
    </View>}

    {step===4&&<View style={s.card}>
      <Text style={s.h2}>آدرس محل ایستگاه</Text>
      <TextInput value={address} onChangeText={setAddress} placeholder="آدرس کامل محل ایستگاه را وارد کنید" multiline numberOfLines={5} textAlignVertical="top" style={[s.input,s.address]}/>
      <Text style={s.muted}>نیازی به درج جداگانه نام خیابان نیست.</Text>
    </View>}

    {step===5&&<View style={s.card}>
      <Text style={s.h2}>بررسی نهایی</Text>
      <Text style={s.review}>موقعیت: {gps?`${fa(Number(gps.latitude).toFixed(7))}، ${fa(Number(gps.longitude).toFixed(7))}`:'—'}</Text>
      <Text style={s.review}>خط: {missing?missingName:(line?.code||'—')}</Text>
      <Text style={s.review}>تابلوها: {fa(signs.length)} عدد</Text>
      {signs.map((x,i)=><View key={i} style={s.reviewSign}>
        <Text style={s.review}>{x.title||'تابلو'}</Text>
        {(x.newPhoto||x.displaySrc)?<Image source={x.newPhoto?{uri:x.newPhoto}:x.displaySrc} style={s.photo}/>:null}
      </View>)}
      <Text style={s.review}>تصویر محل: {hasLocationPhoto?'تأیید شده':'ثبت نشده'}</Text>
      {locationPhotoDisplay?<Image source={locationPhotoDisplay} style={s.bigPhoto}/>:null}
      <Text style={s.review}>آدرس: {address}</Text>
      <Text style={s.review}>زمان: {fmt(new Date().toISOString())}</Text>
    </View>}

    <View style={s.nav}>
      {step>0?<TouchableOpacity style={s.secondary} onPress={back}><Text style={s.secondaryTxt}>مرحله قبل</Text></TouchableOpacity>:null}
      {step<5?<TouchableOpacity style={[s.primary,{flex:1,opacity:canNext?1:.5}]} onPress={next} disabled={!canNext}><Text style={s.primaryTxt}>مرحله بعد</Text></TouchableOpacity>:<TouchableOpacity style={[s.primary,{flex:1}]} onPress={save} disabled={saving}><Text style={s.primaryTxt}>{saving?'در حال ثبت…':'تأیید و ثبت نهایی'}</Text></TouchableOpacity>}
    </View>

    <Modal visible={typeModal} transparent animationType="slide" onRequestClose={()=>setTypeModal(false)}>
      <View style={s.modalBg}><View style={s.modal}>
        <Text style={s.h2}>نوع تابلو را انتخاب کنید</Text>
        {types.map(t=><TouchableOpacity key={t.id} style={s.typeRow} onPress={()=>chooseType(t)}><Text style={s.lineTitle}>{t.title}</Text></TouchableOpacity>)}
        <TouchableOpacity style={s.secondary} onPress={()=>setTypeModal(false)}><Text style={s.secondaryTxt}>انصراف</Text></TouchableOpacity>
      </View></View>
    </Modal>
  </ScrollView>;
}

const s=StyleSheet.create({page:{flex:1,backgroundColor:C.paper},content:{padding:12,paddingBottom:30},center:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:C.paper},progress:{backgroundColor:'#fff',borderRadius:16,padding:15,marginBottom:10,borderWidth:1,borderColor:C.line},stepNo:{fontFamily:FONT.regular,color:C.muted,fontSize:12,textAlign:'right'},title:{fontFamily:FONT.bold,color:C.ink,fontSize:19,textAlign:'right',marginTop:4},bar:{height:7,backgroundColor:'#e9edf2',borderRadius:5,marginTop:12,overflow:'hidden'},barOn:{height:7,backgroundColor:C.brand},card:{backgroundColor:'#fff',borderRadius:16,padding:15,borderWidth:1,borderColor:C.line,marginBottom:10},h2:{fontFamily:FONT.bold,color:C.ink,fontSize:15,textAlign:'right',marginBottom:10},muted:{fontFamily:FONT.regular,color:C.muted,fontSize:12,textAlign:'right',lineHeight:21},info:{fontFamily:FONT.regular,color:C.ink,fontSize:12,textAlign:'right',lineHeight:22},gpsProgress:{flexDirection:'row-reverse',alignItems:'center',gap:8,marginTop:10},primary:{backgroundColor:C.brand,borderRadius:12,paddingVertical:13,paddingHorizontal:16,alignItems:'center',justifyContent:'center',marginTop:10},primaryTxt:{color:'#fff',fontFamily:FONT.bold,fontSize:13,textAlign:'center'},secondary:{backgroundColor:'#fff',borderWidth:1,borderColor:C.brand,borderRadius:12,paddingVertical:12,paddingHorizontal:15,alignItems:'center',justifyContent:'center',marginTop:10},secondaryTxt:{color:C.brand,fontFamily:FONT.bold,fontSize:13,textAlign:'center'},mapBox:{height:300,marginTop:12,borderRadius:12,overflow:'hidden'},lineRow:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',padding:12,borderWidth:1,borderColor:C.line,borderRadius:12,marginBottom:8},selected:{borderColor:C.brand,backgroundColor:'#fff8d8'},lineTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:13,textAlign:'right'},input:{borderWidth:1,borderColor:C.line,borderRadius:12,padding:12,fontFamily:FONT.regular,textAlign:'right',color:C.ink,marginBottom:10},address:{minHeight:120},missingBtn:{padding:12,borderWidth:1,borderColor:C.line,borderRadius:12,marginTop:4},addBtn:{borderWidth:1,borderColor:C.brand,borderRadius:12,padding:13,alignItems:'center'},addTxt:{fontFamily:FONT.bold,color:C.brand,fontSize:14},sign:{borderWidth:1,borderColor:C.line,borderRadius:12,padding:10,marginTop:10,alignItems:'flex-end'},photo:{width:160,height:120,borderRadius:10,marginTop:8},bigPhoto:{width:'100%',height:220,borderRadius:12,marginTop:8},retake:{fontFamily:FONT.bold,color:C.brand,fontSize:12},remove:{fontFamily:FONT.bold,color:'#b42318',fontSize:12},review:{fontFamily:FONT.regular,color:C.ink,fontSize:13,textAlign:'right',lineHeight:24},reviewSign:{borderTopWidth:1,borderColor:C.line,marginTop:8,paddingTop:8},nav:{flexDirection:'row-reverse',gap:8,marginTop:2},modalBg:{flex:1,backgroundColor:'rgba(0,0,0,.5)',justifyContent:'flex-end'},modal:{backgroundColor:'#fff',padding:18,borderTopLeftRadius:20,borderTopRightRadius:20,maxHeight:'80%'},typeRow:{padding:14,borderWidth:1,borderColor:C.line,borderRadius:12,marginBottom:8,alignItems:'flex-end'}});
