import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, Modal, useWindowDimensions } from 'react-native';
import { postOrQueue, request } from '../api';
import { imageSource } from '../api';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { compressToDataUri } from '../img';
import { getAppConfig } from '../appconfig';
import * as Location from 'expo-location';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { faNum } from '../num';
import TaxiPlate from '../components/TaxiPlate';
import DetailPageHeader from '../components/DetailPageHeader';

export default function DriverScreen({ route, navigation }) {
  useLayoutEffect(() => { navigation.setOptions({ headerShown:false }); }, [navigation]);
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const compact = viewportWidth < 390;
  const portraitFrameWidth = Math.max(160, Math.min(viewportWidth - 32, (viewportHeight - 260) * 3 / 4));
  const params = route?.params || {};
  const rawDriver = params.driver;
  const driver = rawDriver && typeof rawDriver === 'object' ? rawDriver : {};
  const vehicle = params.vehicle && typeof params.vehicle === 'object' ? params.vehicle : {};
  const warnings = Array.isArray(params.warnings) ? params.warnings : [];
  const temp_lines = Array.isArray(params.temp_lines) ? params.temp_lines : [];
  const [lastAttendance, setLastAttendance] = useState(null);
  const [busy, setBusy] = useState(false);
  const [access, setAccess] = useState({ welfare: false, cultural: false });
  const [complaintAllowed, setComplaintAllowed] = useState(false);
  const [portrait, setPortrait] = useState(null);
  const [portraitDraft, setPortraitDraft] = useState(null);
  const [cropSource,setCropSource] = useState(null);
  const [cropZoom,setCropZoom] = useState(1);
  const [cropX,setCropX] = useState(0);
  const [cropY,setCropY] = useState(0);
  const [portraitConsent, setPortraitConsent] = useState(false);
  const [portraitBusy, setPortraitBusy] = useState(false);
  const [portraitLoading, setPortraitLoading] = useState(true);
  const [portraitError, setPortraitError] = useState('');
  const [portraitFullScreen, setPortraitFullScreen] = useState(false);
  const [portraitCameraVisible, setPortraitCameraVisible] = useState(false);
  const [portraitCameraReady, setPortraitCameraReady] = useState(false);
  const [portraitCameraFacing, setPortraitCameraFacing] = useState('back');
  const portraitCamera = useRef(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cropWidth = cropSource ? Math.max(3,Math.floor(Math.min(cropSource.width,cropSource.height*3/4)/cropZoom/3)*3) : 0;
  const cropHeight = cropWidth*4/3;
  const cropScale = cropWidth ? 240/cropWidth : 1;
  const cropOriginX = cropSource ? Math.round((cropSource.width-cropWidth)*(cropX+1)/2) : 0;
  const cropOriginY = cropSource ? Math.round((cropSource.height-cropHeight)*(cropY+1)/2) : 0;
  const hasDriver = !!(driver && (driver.id || driver.national_id || driver.national_code));
  useEffect(() => {
    getAppConfig().then((c) => setAccess({ welfare: !!c.can_welfare, cultural: !!c.can_cultural })).catch(() => {});
    request('/complaints/access', { noStore: true }).then((x) => setComplaintAllowed(!!x?.can_submit)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!driver.id) { setPortraitLoading(false); return; }
    let active = true;
    setPortraitLoading(true);
    request('/driver-photos/' + driver.id, { noStore: true, queueIfOffline: false })
      .then(data => { if (active) { setPortrait(data?.photo || null); setPortraitError(''); } })
      .catch(() => { if (active) setPortraitError('دریافت وضعیت تصویر ممکن نشد. دوباره تلاش کنید.'); })
      .finally(() => { if (active) setPortraitLoading(false); });
    return () => { active = false; };
  }, [driver.id]);
  const capturePortrait = async () => {
    if (portraitBusy || portraitCameraVisible) return;
    try {
      const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
      if (!permission?.granted) return Alert.alert('دسترسی دوربین', 'دسترسی به دوربین را در تنظیمات گوشی فعال کنید و دوباره تلاش کنید.');
      setPortraitCameraReady(false);
      setPortraitCameraFacing('back');
      setPortraitCameraVisible(true);
    } catch (error) { Alert.alert('دوربین', error?.message || 'آماده‌سازی دوربین انجام نشد.'); }
  };
  const takePortrait = async () => {
    if (!portraitCamera.current || !portraitCameraReady || portraitBusy) return;
    setPortraitBusy(true);
    try {
      const result = await portraitCamera.current.takePictureAsync({ quality: 0.75, base64: false, exif: false, skipProcessing: false });
      if (!result?.uri) throw new Error('دوربین تصویری برنگرداند؛ دوباره تلاش کنید.');
      const originalWidth = Number(result.width);
      const originalHeight = Number(result.height);
      if (!originalWidth || !originalHeight) throw new Error('ابعاد تصویر دوربین مشخص نیست؛ دوباره عکس بگیرید.');
      setCropSource({uri:result.uri,width:originalWidth,height:originalHeight});
      setCropX(0);setCropY(0);setCropZoom(1);
      setPortraitCameraVisible(false);
    } catch (error) { Alert.alert('تصویر پرسنلی', error?.message || 'ثبت تصویر ممکن نشد.'); }
    finally { setPortraitBusy(false); }
  };
  const applyPortraitCrop = async () => {
    if (!cropSource || portraitBusy) return;
    setPortraitBusy(true);
    try {
      const {width,height,uri}=cropSource;
      const baseWidth=Math.min(width,Math.floor(height*3/4));
      const baseHeight=Math.min(height,Math.floor(width*4/3));
      const cropWidth=Math.max(3,Math.floor(baseWidth/cropZoom/3)*3);
      const cropHeight=cropWidth*4/3;
      const originX=Math.round((width-cropWidth)*(cropX+1)/2);
      const originY=Math.round((height-cropHeight)*(cropY+1)/2);
      const cropped=await ImageManipulator.manipulateAsync(uri,[{crop:{originX,originY,width:cropWidth,height:cropHeight}}],{format:ImageManipulator.SaveFormat.JPEG,compress:.85});
      const source = cropped.uri;
      let compressed = null;
      for (const [width, quality] of [[480, 0.34], [400, 0.28], [320, 0.22]]) {
        compressed = await compressToDataUri(source, { maxW: width, maxH: 640, quality });
        if (compressed && Math.floor((compressed.length - compressed.indexOf(',') - 1) * 3 / 4) <= 120 * 1024) break;
      }
      if (!compressed || Math.floor((compressed.length - compressed.indexOf(',') - 1) * 3 / 4) > 120 * 1024) throw new Error('فشرده‌سازی تصویر به حجم مجاز انجام نشد. دوباره عکس بگیرید.');
      setPortraitDraft(compressed);
      setPortraitConsent(false);
      setCropSource(null);
    } catch (error) { Alert.alert('تصویر پرسنلی', error?.message || 'ثبت تصویر ممکن نشد.'); }
    finally { setPortraitBusy(false); }
  };
  const confirmPortrait = async () => {
    if (!portraitDraft || !portraitConsent || portraitBusy || !driver.id) return;
    setPortraitBusy(true);
    try {
      const saved = await request('/driver-photos/' + driver.id, { method: 'POST', body: { photo_data: portraitDraft, confirmed: true }, queueIfOffline: false, noStore: true, timeoutMs: 30000 });
      setPortrait(saved.photo); setPortraitDraft(null); setPortraitConsent(false);
      Alert.alert('ثبت تصویر', 'تصویر پرسنلی تاکسیران با موفقیت ذخیره شد.');
    } catch (error) { Alert.alert('ثبت تصویر ناموفق بود', error?.message || 'پس از اتصال به اینترنت دوباره تلاش کنید.'); }
    finally { setPortraitBusy(false); }
  };
  const deletePortrait = () => {
    if (!portrait || portraitBusy || !driver.id) return;
    Alert.alert('حذف تصویر پرسنلی', 'تصویر فعلی تاکسیران حذف می‌شود و تا ثبت تصویر جدید، خدمات راننده به‌جز ثبت تذکر غیرفعال خواهد بود. ادامه می‌دهید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'حذف تصویر', style: 'destructive', onPress: async () => {
        setPortraitBusy(true);
        try {
          await request('/driver-photos/' + driver.id, { method: 'DELETE', queueIfOffline: false, noStore: true });
          setPortrait(null); setPortraitDraft(null); setPortraitConsent(false); setPortraitFullScreen(false);
          Alert.alert('حذف شد', 'تصویر حذف شد. لطفاً تصویر جدید تاکسیران را ثبت کنید.');
        } catch (error) { Alert.alert('خطا در حذف تصویر', error?.message || 'دوباره تلاش کنید.'); }
        finally { setPortraitBusy(false); }
      } },
    ]);
  };
  const photoGate = () => {
    Alert.alert('ابتدا تصویر پرسنلی تاکسیران را ثبت کنید', 'عکس باید واضح و متعلق به راننده اصلی باشد. مسئولیت مغایرت تصویر با راننده بر عهده ثبت‌کننده است.', [
      { text: 'بعداً', style: 'cancel' },
      { text: 'رفتن به درج عکس', onPress: () => { if (!portraitDraft) capturePortrait(); } },
    ]);
  };
  const runDriverAction = (action) => {
    if (action.t === 'ثبت تذکر') return action.on();
    if (portraitLoading || portraitError) {
      return Alert.alert('بررسی تصویر پرسنلی', portraitError || 'لطفاً تا بررسی وضعیت تصویر پرسنلی صبر کنید.');
    }
    if (!portrait || portraitBusy || portraitDraft) return photoGate();
    return action.on();
  };
  const safeText = (v) => {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'string' || typeof v === 'number') return faNum(String(v));
    if (typeof v === 'boolean') return v ? 'بله' : 'خیر';
    return '';
  };
  const Row = ({ l, v }) => {
    const txt = safeText(v);
    return txt ? (
      <View style={s.detRow}><Text style={s.detL}>{l}</Text><Text style={s.detV}>{txt}</Text></View>
    ) : null;
  };

  if (!hasDriver) {
    return (
      <View style={{ flex: 1, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ fontFamily: FONT.bold, color: C.danger, textAlign: 'center' }}>اطلاعات راننده کامل دریافت نشد. لطفاً دوباره جستجو کنید.</Text>
        <TouchableOpacity style={[s.act, s.actPrimary, { marginTop: 16, width: 180 }]} onPress={() => navigation.goBack()}>
          <Text style={[s.actTxt, { color: '#fff' }]}>بازگشت به جستجو</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function registerAttendance() {
    if (busy) return;
    setBusy(true);
    try {
      let lat, lng;
      // ابتدا آخرین موقعیت معلوم (فوری)، سپس در صورت نبود، موقعیت با دقت متعادل و مهلت کوتاه
      try {
        const last = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
        if (last) { lat = last.coords.latitude; lng = last.coords.longitude; }
        else {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = pos.coords.latitude; lng = pos.coords.longitude;
        }
      } catch {}
      if (!driver.id) throw new Error('شناسه داخلی راننده دریافت نشده است. لطفاً دوباره جستجو کنید یا اطلاعات راننده را در سایت بررسی کنید.');
      const r = await postOrQueue('/attendance', { driver_id: driver.id, lat, lng });
      if (r.queued) Alert.alert('آفلاین', 'حضور ذخیره شد و هنگام اتصال به اینترنت ارسال می‌شود.');
      else { setLastAttendance(Date.now()); Alert.alert('ثبت شد', 'حضور راننده ثبت شد و در لیست حاضرین خط قرار گرفت.'); }
    } catch (e) { Alert.alert('خطا', e.message); }
    finally { setBusy(false); }
  }

  const ACTIONS = [
    { t: 'ثبت حضور', e: 'account-check-outline', primary: true, on: registerAttendance },
    { t: 'بدهی تاکسیران', e: 'cash-multiple', on: () => navigation.navigate('Debt', { driver }) },
    { t: 'چک‌لیست خودرو', e: 'clipboard-check-outline', on: () => navigation.navigate('Checklist', { driver }) },
    { t: 'ثبت تذکر', e: 'note-edit-outline', taxi: true, on: () => navigation.navigate('Notice', { driver }) },
    { t: 'گزارش حضور', e: 'calendar-check-outline', on: () => navigation.navigate('Attendance', { driver }) },
    { t: 'تذکرات قبلی', e: 'text-box-multiple-outline', on: () => navigation.navigate('PastNotices', { driver }) },
    { t: 'چک‌لیست‌های قبلی', e: 'clipboard-list-outline', on: () => navigation.navigate('PastChecklists', { driver }) },
    { t: 'پیامک‌های راننده', e: 'message-text-outline', on: () => navigation.navigate('DriverSms', { driver }) },
    ...(complaintAllowed ? [
      { t: 'ثبت شکایت', e: 'bullhorn-outline', on: () => navigation.navigate('Complaints', { driver }) },
      { t: 'سوابق شکایات', e: 'file-document-multiple-outline', on: () => navigation.navigate('Complaints', { driver, tab: 'submit' }) },
    ] : []),
    ...(access.welfare ? [{ t: 'رفاهیات راننده', e: 'gift-outline', on: () => navigation.navigate('Welfare', { driver }) }] : []),
    ...(access.cultural ? [{ t: 'فعالیت فرهنگی', e: 'palette-outline', on: () => navigation.navigate('Cultural', { driver }) }] : []),
  ];

  return (
    <>
      <Modal visible={!!cropSource} transparent animationType="fade" onRequestClose={()=>setCropSource(null)}>
        <View style={s.cropOverlay}><View style={s.cropDialog}>
          <Text style={s.cropTitle}>تنظیم کادر تصویر پرسنلی</Text>
          <Text style={s.cropHint}>صورت تاکسیران را داخل قاب عمودی ۳×۴ قرار دهید. با کلیدهای جهت و بزرگ‌نمایی کادر را تنظیم کنید.</Text>
          {cropSource&&<View style={s.cropFrame}><Image source={{uri:cropSource.uri}} resizeMode="stretch" style={{position:'absolute',width:cropSource.width*cropScale,height:cropSource.height*cropScale,left:-cropOriginX*cropScale,top:-cropOriginY*cropScale}}/><View pointerEvents="none" style={s.cropGuide}><View style={s.cropGuideCircle}/></View></View>}
          <View style={s.cropButtons}><TouchableOpacity accessibilityRole="button" accessibilityLabel="کادر به چپ" onPress={()=>setCropX(v=>Math.max(-1,v-.18))} style={s.cropControl}><MaterialCommunityIcons name="arrow-left" size={23} color={C.brand}/></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel="کادر به بالا" onPress={()=>setCropY(v=>Math.max(-1,v-.18))} style={s.cropControl}><MaterialCommunityIcons name="arrow-up" size={23} color={C.brand}/></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel="کادر به پایین" onPress={()=>setCropY(v=>Math.min(1,v+.18))} style={s.cropControl}><MaterialCommunityIcons name="arrow-down" size={23} color={C.brand}/></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel="کادر به راست" onPress={()=>setCropX(v=>Math.min(1,v+.18))} style={s.cropControl}><MaterialCommunityIcons name="arrow-right" size={23} color={C.brand}/></TouchableOpacity></View>
          <View style={s.cropButtons}><TouchableOpacity accessibilityRole="button" accessibilityLabel="کوچک‌نمایی" onPress={()=>setCropZoom(v=>Math.max(1,Math.round((v-.15)*100)/100))} style={s.cropControl}><MaterialCommunityIcons name="minus" size={22} color={C.brand}/></TouchableOpacity><Text style={s.cropZoomText}>بزرگ‌نمایی {faNum(Math.round(cropZoom*100))}٪</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="بزرگ‌نمایی" onPress={()=>setCropZoom(v=>Math.min(2,Math.round((v+.15)*100)/100))} style={s.cropControl}><MaterialCommunityIcons name="plus" size={22} color={C.brand}/></TouchableOpacity></View>
          <View style={s.portraitActions}><TouchableOpacity style={s.portraitSecondary} disabled={portraitBusy} onPress={()=>setCropSource(null)}><Text style={s.portraitSecondaryText}>انصراف</Text></TouchableOpacity><TouchableOpacity style={s.portraitButton} disabled={portraitBusy} onPress={applyPortraitCrop}><Text style={s.portraitButtonText}>{portraitBusy?'در حال آماده‌سازی…':'تأیید برش ۳×۴'}</Text></TouchableOpacity></View>
        </View></View>
      </Modal>
      <Modal visible={portraitCameraVisible} animationType="slide" onRequestClose={() => {if(!portraitBusy)setPortraitCameraVisible(false)}}>
        <View style={{flex:1,backgroundColor:'#081e1b'}}>
          <View style={{flex:1,alignItems:'center',justifyContent:'center',paddingTop:72,paddingBottom:158}}>
            <View style={{width:portraitFrameWidth,aspectRatio:3/4,borderRadius:12,borderWidth:2,borderColor:'#fff',overflow:'hidden',backgroundColor:'#102f2b'}}>
              {cameraPermission?.granted && <CameraView ref={portraitCamera} style={StyleSheet.absoluteFill} facing={portraitCameraFacing} mode="picture" active={portraitCameraVisible} onCameraReady={()=>setPortraitCameraReady(true)} onMountError={error=>{setPortraitCameraReady(false);Alert.alert('دوربین',error?.message||'راه‌اندازی دوربین ناموفق بود.')}}/>}
            </View>
          </View>
          <View style={{position:'absolute',top:48,left:16,right:16,flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between'}}>
            <TouchableOpacity accessibilityLabel="بستن دوربین" onPress={()=>{if(!portraitBusy)setPortraitCameraVisible(false)}} style={{padding:12,backgroundColor:'#102f2bc9',borderRadius:14}}><MaterialCommunityIcons name="close" size={26} color="#fff"/></TouchableOpacity>
            <Text style={{fontFamily:FONT.bold,color:'#fff',fontSize:16}}>تصویر پرسنلی تاکسیران</Text>
          </View>
          <View style={{position:'absolute',bottom:44,left:16,right:16,alignItems:'center',gap:16}}>
            <Text style={{color:'#fff',fontFamily:FONT.regular,textAlign:'center'}}>عکس پرسنلی ۳×۴؛ صورت در مرکز کادر و نور مناسب باشد.</Text>
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-evenly',width:'100%'}}>
              <TouchableOpacity accessibilityLabel="تغییر دوربین جلو و عقب" disabled={portraitBusy} onPress={()=>{setPortraitCameraReady(false);setPortraitCameraFacing(v=>v==='front'?'back':'front')}} style={{padding:14,backgroundColor:'#102f2bc9',borderRadius:14}}><MaterialCommunityIcons name="camera-flip-outline" size={26} color="#fff"/></TouchableOpacity>
              <TouchableOpacity accessibilityLabel="گرفتن تصویر پرسنلی" disabled={!portraitCameraReady||portraitBusy} onPress={takePortrait} style={{height:76,width:76,borderRadius:38,borderWidth:6,borderColor:'#fff',backgroundColor:portraitCameraReady&&!portraitBusy?'#0d7a5f':'#829b96',alignItems:'center',justifyContent:'center'}}>{portraitBusy?<ActivityIndicator/>:<MaterialCommunityIcons name="camera" size={32} color="#fff"/>}</TouchableOpacity>
              <View style={{width:54}}/>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={portraitFullScreen} transparent animationType="fade" onRequestClose={() => setPortraitFullScreen(false)}><View style={{flex:1,backgroundColor:'#000',justifyContent:'center',alignItems:'center'}}><TouchableOpacity onPress={() => setPortraitFullScreen(false)} style={{position:'absolute',top:50,right:24,zIndex:2,padding:12}} accessibilityLabel="بستن تصویر"><MaterialCommunityIcons name="close" color="#fff" size={30}/></TouchableOpacity>{(portraitDraft || portrait) && <Image source={portraitDraft?{uri:portraitDraft}:imageSource(portrait)} style={{width:'100%',height:'82%'}} resizeMode="contain" />}</View></Modal><ScrollView persistentScrollbar={true} style={{ backgroundColor: '#edf8f5' }} contentContainerStyle={{ padding: compact ? 10 : 16, paddingBottom: 56 }}>
      <DetailPageHeader title="اطلاعات تاکسیران" navigation={navigation}/>
      <View style={s.card}>
        <View style={[s.heroRow, compact && s.heroRowCompact]}>
          <View style={s.identity}>
            <View style={s.pf}>{portrait ? <Image source={imageSource(portrait)} style={s.portraitAvatar} /> : <MaterialCommunityIcons name="account-tie" size={25} color="#fff" />}</View>
            <View style={s.identityText}>
              <Text style={s.name} numberOfLines={2}>{safeText(driver.first_name)} {safeText(driver.last_name)}</Text>
              <Text style={s.meta}>کد ملی: {safeText(driver.national_id || driver.national_code)}</Text>
              {portrait && !portraitDraft && <Text style={s.photoReady}>✓ تصویر ثبت‌شده</Text>}
            </View>
          </View>
        </View>
        <View style={s.portraitCard}>
          <Text style={s.portraitTitle}>تصویر پرسنلی تاکسیران</Text>
          {portrait && !portraitDraft && <><View style={s.portraitPhotoFrame}><TouchableOpacity onPress={() => setPortraitFullScreen(true)} accessibilityRole="button" accessibilityLabel="نمایش تمام‌صفحه تصویر تاکسیران"><Image source={imageSource(portrait)} style={s.portraitPreview}/></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel="حذف تصویر پرسنلی" accessibilityHint="پیش از حذف، کادر تأیید نمایش داده می‌شود" disabled={portraitBusy} onPress={deletePortrait} style={[s.portraitOverlayIcon,s.portraitRemoveIcon]}><MaterialCommunityIcons name="close" size={19} color="#b4232b"/></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel="ویرایش تصویر پرسنلی" disabled={portraitBusy} onPress={capturePortrait} style={[s.portraitOverlayIcon,s.portraitEditIcon]}><MaterialCommunityIcons name="pencil-outline" size={19} color="#fff"/></TouchableOpacity></View><Text style={s.portraitHint}>برای نمایش تمام‌صفحه، تصویر را لمس کنید. برای تغییر تصویر، مداد پایین عکس را بزنید.</Text></>}
          {!portrait && !portraitDraft && <><Text style={s.portraitHint}>{portraitLoading ? 'در حال بررسی وضعیت تصویر…' : 'عکس واضح، روبه‌دوربین و متعلق به همین تاکسیران باشد.'}</Text>{!!portraitError && <Text style={s.portraitWarning}>{portraitError}</Text>}{!portraitLoading && <Text style={s.portraitWarning}>تا ثبت تصویر، همه خدمات تاکسیران به‌جز ثبت تذکر غیرفعال هستند.</Text>}<TouchableOpacity style={s.portraitButton} disabled={portraitBusy||portraitLoading} onPress={capturePortrait}><MaterialCommunityIcons name="camera-outline" size={21} color="#fff"/><Text style={s.portraitButtonText}>گرفتن عکس با دوربین</Text></TouchableOpacity></>}
          {!!portraitDraft && <><TouchableOpacity onPress={() => setPortraitFullScreen(true)} accessibilityLabel="نمایش تمام‌صفحه تصویر جدید"><Image source={{uri:portraitDraft}} style={s.portraitPreview}/></TouchableOpacity><TouchableOpacity accessibilityRole="checkbox" accessibilityState={{checked:portraitConsent}} onPress={() => setPortraitConsent(v=>!v)} style={s.consentRow}><MaterialCommunityIcons name={portraitConsent?'checkbox-marked':'checkbox-blank-outline'} size={23} color={C.brand}/><Text style={s.consentText}>تأیید می‌کنم تصویر واضح و متعلق به راننده اصلی است؛ مسئولیت مغایرت احتمالی با من است.</Text></TouchableOpacity><View style={s.portraitActions}><TouchableOpacity style={s.portraitSecondary} onPress={capturePortrait} disabled={portraitBusy}><Text style={s.portraitSecondaryText}>عکس دوباره</Text></TouchableOpacity><TouchableOpacity style={[s.portraitButton,(!portraitConsent||portraitBusy)&&{opacity:.45}]} onPress={confirmPortrait} disabled={!portraitConsent||portraitBusy}><Text style={s.portraitButtonText}>{portraitBusy?'در حال ثبت…':portrait?'تأیید و جایگزینی':'تأیید و ثبت تصویر'}</Text></TouchableOpacity></View></>}
        </View>
        {!!vehicle?.plate && <View style={{marginTop:16}}><TaxiPlate plate={vehicle.plate} compact={compact}/></View>}
        <View style={s.sectionHeader}><MaterialCommunityIcons name="card-account-details-outline" size={19} color={C.brand}/><Text style={s.sectionTitle}>مشخصات تاکسیران و خودرو</Text></View>
        {warnings.filter(Boolean).map((w, i) => {
          const wt = safeText(w) || safeText(w?.title) || safeText(w?.message) || safeText(w?.description);
          return wt ? <View style={s.warn} key={i}><Text style={s.warnTxt}>⚠ {wt}</Text></View> : null;
        })}
        <View style={{ marginTop: 10 }}>
          <Row l="نوع فعالیت راننده" v={vehicle?.activity_type || driver.driver_type} />
          <Row l="شیفت کاری" v={vehicle?.shift_fa} />
          {vehicle?.beneficiary_name ? <Row l="بهره‌بردار خودرو" v={vehicle?.beneficiary_name} /> : null}
          <Row l="وضعیت پروانه بهره‌برداری" v={driver.op_lic_status} />
          <Row l="اعتبار پروانه بهره‌برداری" v={driver.op_lic_expire} />
          <Row l="وضعیت پروانه تاکسیرانی" v={driver.taxi_lic_status} />
          <Row l="اعتبار پروانه تاکسیرانی" v={driver.taxi_lic_expire} />
          <Row l="خط محل فعالیت" v={vehicle?.line_code ? (vehicle?.line_code + (vehicle?.line_origin ? ' — ' + vehicle?.line_origin : '')) : null} />
          <Row l="کد در خط" v={vehicle?.line_code_in_line} />
          {temp_lines && temp_lines.length > 0 && temp_lines.map((t, idx) => (
            <View key={t?.id || idx} style={s.tempBadge}>
              <Text style={s.tempBadgeTxt}>🚕 راننده موقت در خط {safeText(t?.line_code)}{t?.line_code_in_line ? ` — کد در خط: ${safeText(t.line_code_in_line)}` : ''}</Text>
            </View>
          ))}
          <Row l="مدل خودرو" v={vehicle?.model_name} />
          <Row l="اعتبار معاینه فنی" v={vehicle?.tech_inspection_expire} />
          {vehicle?.inspection_status ? (
            <View style={s.detRow}><Text style={s.detL}>وضعیت معاینه فنی</Text>
              <Text style={[s.detV, { color: vehicle?.inspection_status === 'معتبر' ? C.ok : C.danger }]}>{vehicle?.inspection_status}</Text></View>
          ) : null}
          <Row l="اعتبار بیمه شخص ثالث" v={vehicle?.insurance_expire} />
          {vehicle?.insurance_status ? (
            <View style={s.detRow}><Text style={s.detL}>وضعیت بیمه شخص ثالث</Text>
              <Text style={[s.detV, { color: vehicle?.insurance_status === 'معتبر' ? C.ok : C.danger }]}>{vehicle?.insurance_status}</Text></View>
          ) : null}
        </View>
      </View>

      <View style={s.sectionHeader}><MaterialCommunityIcons name="view-dashboard-outline" size={20} color={C.brand}/><Text style={s.sectionTitle}>خدمات و عملیات</Text></View>
      <View style={s.acts}>
        {ACTIONS.map((a, i) => (
          <TouchableOpacity key={i} accessibilityRole="button" accessibilityLabel={a.t} accessibilityHint={a.t !== 'ثبت تذکر' && !portrait ? 'ابتدا تصویر پرسنلی تاکسیران را ثبت کنید' : undefined} accessibilityState={{disabled:!!(a.primary&&busy)}} activeOpacity={0.8} onPress={() => runDriverAction(a)} disabled={a.primary && busy}
            style={[s.act, a.primary && s.actPrimary, a.taxi && s.actTaxi, a.primary&&busy&&{opacity:0.6}]}>
            {a.primary && busy
              ? <ActivityIndicator color="#fff" />
              : <><View style={[s.actionIcon, a.primary && s.actionIconPrimary]}><MaterialCommunityIcons name={a.e} size={25} color={a.primary ? "#fff" : C.brand}/></View>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[s.actTxt, a.primary && { color: '#fff' }]}>{a.t}</Text></>}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView></>
  );
}

const s = StyleSheet.create({
  heroRow: { flexDirection:'row-reverse', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, backgroundColor:'#075f4e', borderRadius:19, padding:16, borderWidth:1, borderColor:'#25b58c' },
  heroRowCompact: { alignItems: 'stretch' },
  identity: { flexDirection: 'row-reverse', alignItems: 'center', flexGrow: 1, flexShrink: 1, minWidth: 165, gap: 9 },
  identityText: { flexShrink: 1, alignItems: 'flex-end' },
  sectionHeader: { flexDirection:'row-reverse', alignItems:'center', gap:8, marginTop:20, marginBottom:10, paddingBottom:10, borderBottomWidth:1, borderBottomColor:'#d2ece1' },
  sectionTitle: { fontFamily: FONT.bold, fontSize: 16, color:'#133d35', textAlign: 'right' },
  actionIcon: { width: 45, height: 45, borderRadius: 14, backgroundColor: '#e8f6f0', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionIconPrimary: { backgroundColor: 'rgba(255,255,255,.18)' },
  tempBadge: { backgroundColor: '#eef7ff', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginVertical: 4, borderWidth: 1, borderColor: '#bcd9f5' },
  tempBadgeTxt: { fontFamily: FONT.regular, color: '#1f6fd6', fontSize: 12.5, fontWeight: 'bold', textAlign: 'right' },
  card: { backgroundColor:'#fff', borderColor:'#bfe3d6', borderWidth:1, borderRadius:22, padding:15, marginTop:12, elevation:3, shadowColor:'#0c6b51', shadowOpacity:.09, shadowRadius:12 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  pf: { width:65, height:78, borderRadius:13, backgroundColor:'#08775c', alignItems:'center', justifyContent:'center', overflow:'hidden', borderWidth:2, borderColor:'#e8fff5' },
  portraitAvatar: { width:65, height:86, borderRadius:12 },
  portraitCard: { marginTop:16, backgroundColor:'#f1faf6', borderWidth:1, borderColor:'#bfe4d4', borderRadius:17, padding:14, gap:10 },
  portraitTitle: { fontFamily: FONT.bold, color: C.brand, fontSize: 15, textAlign: 'right' },
  portraitHint: { fontFamily: FONT.regular, color: C.slate, fontSize: 12, lineHeight: 22, textAlign: 'right' },
  portraitWarning: { fontFamily: FONT.bold, color: C.danger, textAlign: 'right', fontSize: 12 },
  portraitPreview: { width: 156, height: 208, borderRadius: 14, alignSelf: 'center', backgroundColor: '#E1E8E4' },
  portraitPhotoFrame: {position:'relative',width:156,height:208,alignSelf:'center',borderRadius:14,overflow:'hidden',borderWidth:2,borderColor:'#d4eadf',backgroundColor:'#e1e8e4'},
  portraitOverlayIcon: {position:'absolute',width:38,height:38,borderRadius:12,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(255,255,255,.85)',elevation:3},
  portraitRemoveIcon: {top:7,left:7,backgroundColor:'#fff3f3'},
  portraitEditIcon: {bottom:7,left:7,backgroundColor:C.brand},
  cropOverlay: {flex:1,backgroundColor:'rgba(4,25,20,.82)',alignItems:'center',justifyContent:'center',padding:12},
  cropDialog: {width:'100%',maxWidth:420,backgroundColor:'#fff',padding:14,borderRadius:22,alignItems:'center',gap:11},
  cropTitle: {fontFamily:FONT.bold,fontSize:17,color:C.brand,textAlign:'center'},
  cropHint: {fontFamily:FONT.regular,fontSize:11.5,color:C.slate,textAlign:'center',lineHeight:20},
  cropFrame: {width:240,height:320,position:'relative',overflow:'hidden',backgroundColor:'#dbe6e0',borderRadius:12,borderWidth:2,borderColor:C.brand},
  cropGuide: {position:'absolute',top:0,left:0,right:0,bottom:0,borderWidth:1,borderColor:'rgba(255,255,255,.8)',alignItems:'center',justifyContent:'center'},
  cropGuideCircle: {width:155,height:196,borderWidth:1,borderColor:'rgba(255,255,255,.7)',borderRadius:90},
  cropButtons: {flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10},
  cropControl: {width:44,height:44,borderRadius:12,backgroundColor:'#e7f5ee',borderWidth:1,borderColor:'#c7e6d9',alignItems:'center',justifyContent:'center'},
  cropZoomText: {fontFamily:FONT.bold,color:C.brand,fontSize:12,minWidth:126,textAlign:'center'},
  portraitSuccess: { fontFamily: FONT.regular, color: C.brand, fontSize: 12, textAlign: 'right', lineHeight: 21 },
  portraitButton: { minHeight: 48, minWidth: 0, borderRadius: 12, paddingHorizontal: 10, backgroundColor: C.brand, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7, flex: 1 },
  portraitButtonText: { fontFamily: FONT.bold, color: '#fff', fontSize: 12.5 },
  portraitActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  portraitSecondary: { minHeight: 48, minWidth: 0, flex: 1, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7 },
  portraitDelete: {backgroundColor:'#FFF8F8',borderColor:'#F1C9CD'},
  portraitDisabled: {opacity:0.5},
  portraitSecondaryText: { fontFamily: FONT.bold, fontSize: 12, color: C.brand },
  consentRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, minHeight: 48 },
  consentText: { flex: 1, fontFamily: FONT.regular, color: C.ink, fontSize: 11.5, textAlign: 'right', lineHeight: 20 },
  pfTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 18 },
  name: { fontFamily:FONT.bold, fontSize:18, color:'#fff', textAlign:'right' },
  meta: { fontFamily:FONT.regular, fontSize:12, color:'#d5f3e9', textAlign:'right' },
  photoReady: { alignSelf:'flex-end', marginTop:7, overflow:'hidden', borderRadius:12, backgroundColor:'rgba(48,205,127,.27)', paddingHorizontal:10, paddingVertical:4, color:'#d4ffe8', fontFamily:FONT.bold, fontSize:11 },
  warn: { backgroundColor: '#fde6ea', borderRadius: 11, padding: 9, marginTop: 12 },
  warnTxt: { color: C.danger, fontFamily: FONT.bold, fontSize: 12, textAlign: 'right' },
  detRow: { flexDirection:'row-reverse', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap', paddingVertical:11, paddingHorizontal:7, borderBottomWidth:1, borderBottomColor:'#e0eee8' },
  detL: { fontFamily: FONT.regular, color: C.muted, fontSize: 12.5 },
  detV: { fontFamily: FONT.bold, color: C.ink, fontSize: 12.5, textAlign: 'left', flexShrink: 1, marginLeft: 8 },
  acts: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  act: { width:'47%', minHeight:110, backgroundColor:'#fff', borderColor:'#bce3d4', borderWidth:1,
    borderRadius:18, padding:12, alignItems:'center', justifyContent:'center', shadowColor:'#0b644c', shadowOpacity:.09, shadowRadius:9, elevation:3 },
  actPrimary: { backgroundColor: C.brand, borderColor: C.brand },
  actTaxi: { backgroundColor: C.taxi, borderColor: C.taxi },
  actEm: { fontSize: 22, marginBottom: 4 },
  actTxt: { fontFamily: FONT.bold, fontSize: 12.5, color: C.ink, width: '100%', textAlign: 'center' },
});
