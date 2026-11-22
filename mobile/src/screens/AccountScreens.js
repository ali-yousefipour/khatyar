import AccountFormHeader from '../components/AccountFormHeader';
import { FieldInput } from './CustomFieldsScreen';
import {profileFieldState,profileSchemaCustomFields} from '../userProfileRules';
import { normalizeIranianDigits, validateNationalId, validateUserInput } from '../identityBankingValidation';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ScrollView, PanResponder, Modal } from 'react-native';
import * as Application from 'expo-application';
import { request, imageSource } from '../api';
import { useAuth } from '../auth';
import { faNum } from '../num';
import ImageViewer from '../components/ImageViewer';
import PersonalPhotoCapture from '../PersonalPhotoCapture';
import {playSound} from '../soundFx';
import {readProfilePhotoCache,cacheProfilePhoto} from '../profilePhotoCache';
import JDatePicker from '../components/JDatePicker';
import { C as CC, FONT } from '../theme';
import { captureRef } from 'react-native-view-shot';

function parseJDate(value) {
  if (!value) return null;
  const parts = String(value).replace(/[\\/.]/g, '-').split('-').map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((x) => !Number.isFinite(x))) return null;
  return { jy: parts[0], jm: parts[1], jd: parts[2] };
}
function cleanJDateLabel(value) {
  if (!value) return '';
  return faNum(String(value).replace(/[\\.]/g, '/').replace(/-/g, '/'));
}

export function ChangePasswordScreen({ navigation }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!current && !next) { navigation.goBack(); return; }
    if (next.length < 6) return Alert.alert('توجه', 'رمز جدید حداقل ۶ کاراکتر باشد.');
    setBusy(true);
    try { await request('/admin/change-password', { method: 'POST', body: { current, next } }); Alert.alert('انجام شد', 'رمز عبور تغییر کرد.'); navigation.goBack(); }
    catch (e) { Alert.alert('خطا', e.message); } finally { setBusy(false); }
  }
  return (
    <ScrollView style={{backgroundColor:CC.paper}} contentContainerStyle={s.formContent} keyboardShouldPersistTaps="handled">
      <AccountFormHeader section="امنیت حساب" title="تغییر رمز عبور" description="رمز فعلی و رمز جدید خود را وارد کنید. رمز جدید باید حداقل ۶ نویسه داشته باشد." />
      <View style={s.card}>
        <Text style={s.label}>رمز فعلی</Text><TextInput accessibilityLabel="رمز فعلی" autoComplete="current-password" style={s.input} value={current} onChangeText={setCurrent} secureTextEntry />
        <Text style={s.label}>رمز جدید</Text><TextInput accessibilityLabel="رمز جدید" autoComplete="new-password" style={s.input} value={next} onChangeText={setNext} secureTextEntry />
        <TouchableOpacity accessibilityRole="button" accessibilityState={{disabled:busy,busy}} style={s.btn} onPress={submit} disabled={busy}><Text style={s.btnTxt}>{busy?'در حال ذخیره…':'ذخیرهٔ رمز جدید'}</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function SignaturePad({ value, onChange }) {
  const [signatureFullscreen, setSignatureFullscreen] = useState(false);
  const [points, setPoints] = useState([]);
  const normalPadRef = useRef(null);
  const fullscreenPadRef = useRef(null);
  const lastPoint = useRef(null);
  const drawingRef = useRef(false);

  const createPanResponder = (fullscreen) => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event) => {
      const { locationX, locationY } = event.nativeEvent;
      const point = { x: Math.max(0, locationX), y: Math.max(0, locationY) };
      drawingRef.current = true;
      lastPoint.current = point;
      setPoints((current) => [...current, point]);
    },
    onPanResponderMove: (event) => {
      if (!drawingRef.current) return;
      const { locationX, locationY } = event.nativeEvent;
      const next = { x: Math.max(0, locationX), y: Math.max(0, locationY) };
      const prev = lastPoint.current;
      if (!prev) { lastPoint.current = next; return; }
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 1.5) return;
      const steps = Math.max(1, Math.ceil(distance / (fullscreen ? 2.5 : 2.5)));
      const segment = [];
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        segment.push({ x: prev.x + dx * t, y: prev.y + dy * t });
      }
      lastPoint.current = next;
      setPoints((current) => [...current, ...segment]);
    },
    onPanResponderRelease: () => {
      drawingRef.current = false;
      lastPoint.current = null;
    },
    onPanResponderTerminate: () => {
      drawingRef.current = false;
      lastPoint.current = null;
    },
  });

  const normalPan = useRef(createPanResponder(false)).current;
  const fullscreenPan = useRef(createPanResponder(true)).current;

  const clearSignature = () => {
    drawingRef.current = false;
    lastPoint.current = null;
    setPoints([]);
    onChange(null);
  };

  const openFullscreen = () => {
    lastPoint.current = null;
    drawingRef.current = false;
    setSignatureFullscreen(true);
  };

  const saveSignature = async () => {
    if (!points.length) {
      Alert.alert('امضا', 'ابتدا امضای خود را رسم کنید.');
      return;
    }
    const target = signatureFullscreen ? fullscreenPadRef.current : normalPadRef.current;
    if (!target) {
      Alert.alert('خطا', 'محل ثبت امضا آماده نیست. دوباره تلاش کنید.');
      return;
    }
    try {
      const uri = await captureRef(target, { format: 'png', quality: 1, result: 'data-uri' });
      onChange(uri);
      setSignatureFullscreen(false);
      Alert.alert('امضا', 'امضا آماده ذخیره است.');
    } catch (e) {
      Alert.alert('خطا', 'ذخیره تصویر امضا انجام نشد. دوباره تلاش کنید.');
    }
  };

  const renderPoints = (keyPrefix) => points.map((point, index) => (
    <View key={`${keyPrefix}-${index}`} pointerEvents="none" style={[s.signatureDot, { left: point.x - 2, top: point.y - 2 }]} />
  ));

  return (
    <View style={s.signatureBox}>
      <Text style={s.zoneTitle}>امضای پرسنلی</Text>
      <Text style={s.zoneHint}>امضای خود را با انگشت داخل کادر رسم کنید. این امضا در چاپ گزارش‌ها درج می‌شود.</Text>
      {value && !points.length ? <Image source={{ uri: value }} style={s.signaturePreview} resizeMode="contain" /> : null}

      <TouchableOpacity activeOpacity={0.8} style={s.signatureFullscreenBtn} onPress={openFullscreen}>
        <Text style={s.signatureFullscreenTxt}>✎ ثبت امضا در حالت تمام‌صفحه</Text>
      </TouchableOpacity>

      <View ref={normalPadRef} collapsable={false} style={s.signaturePad} {...normalPan.panHandlers}>
        {renderPoints('normal')}
      </View>

      <Modal
        visible={signatureFullscreen}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => setSignatureFullscreen(false)}
      >
        <View style={s.signatureModal}>
          <View style={s.signatureModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.signatureModalTitle}>ثبت امضا</Text>
              <Text style={s.signatureModalHint}>امضای خود را با انگشت روی صفحه رسم کنید.</Text>
            </View>
            <TouchableOpacity activeOpacity={0.8} style={s.signatureModalClose} onPress={() => setSignatureFullscreen(false)}>
              <Text style={s.signatureModalCloseTxt}>×</Text>
            </TouchableOpacity>
          </View>

          <View ref={fullscreenPadRef} collapsable={false} style={s.signaturePadFull} {...fullscreenPan.panHandlers}>
            {renderPoints('fullscreen')}
          </View>

          <View style={s.signatureModalActions}>
            <TouchableOpacity activeOpacity={0.82} style={[s.btn, s.signatureModalAction, s.signatureClearBtn]} onPress={clearSignature}>
              <Text style={s.btnTxt}>پاک کردن</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.82} style={[s.btn, s.signatureModalAction]} onPress={saveSignature}>
              <Text style={s.btnTxt}>ثبت امضا</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity activeOpacity={0.82} style={s.signatureBackBtn} onPress={() => setSignatureFullscreen(false)}>
            <Text style={s.signatureBackTxt}>بازگشت بدون ثبت</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <View style={s.signatureActions}>
        <TouchableOpacity activeOpacity={0.82} style={[s.btn, s.signatureAction]} onPress={saveSignature}>
          <Text style={s.btnTxt}>ثبت امضا</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.82} style={[s.btn, s.signatureAction, s.signatureClearBtn]} onPress={clearSignature}>
          <Text style={s.btnTxt}>پاک کردن</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function EditProfileScreen({ navigation, vehicleAction }) {
  const [p, setP] = useState(null);
  const [busy, setBusy] = useState(false);
  const [zoneOpts, setZoneOpts] = useState(null);
  const [zoneId, setZoneId] = useState(null);
  const [zoneChief, setZoneChief] = useState(null);
  const [zoneInspectors, setZoneInspectors] = useState([]);
  const [isAdminStaff, setIsAdminStaff] = useState(false);
  const [loadingZ, setLoadingZ] = useState(false);
  const [inspectors, setInspectors] = useState([]);
  const [birthPickerOpen, setBirthPickerOpen] = useState(false);
  const [nationalTouched,setNationalTouched] = useState(false);
  const [originalProfile,setOriginalProfile] = useState(null);
  const [extraFields,setExtraFields] = useState([]);
  const [extraValues,setExtraValues] = useState({});
  const [originalExtraValues,setOriginalExtraValues] = useState({});
  const [formInfo,setFormInfo] = useState(null);
  const [extraError,setExtraError] = useState('');
  useEffect(() => {
    request('/me/full-profile', { noStore: true }).then(profile=>{setP(profile);setOriginalProfile(profile);}).catch(() => setP({}));
    Promise.all([request('/my/custom-fields',{noStore:true}),request('/my/user-profile-form',{noStore:true}).catch(()=>null)])
      .then(([list,form])=>{
        setFormInfo(form);
        const raw=Array.isArray(list)?list:[];
        const configured=profileSchemaCustomFields(form?.schema);
        const byId=new Map(raw.map(x=>[Number(x.id),x]));
        const ordered=configured.filter(x=>byId.has(Number(x.custom_field_id)))
          .map(x=>({...byId.get(Number(x.custom_field_id)),profile_definition:x}));
        const remaining=raw.filter(x=>!configured.some(y=>Number(y.custom_field_id)===Number(x.id)));
        setExtraFields([...ordered,...remaining]);
        const values={};raw.forEach(x=>{if(x.value!=null)values[x.id]=x.value;});
        setExtraValues(values);setOriginalExtraValues(values);
      }).catch(e=>setExtraError(e.message||'دریافت فیلدهای تکمیلی ناموفق بود'));

    request('/me/zone-options').then((z) => {
      setZoneOpts(z);
      if (z.current) { setZoneId(z.current.zone_id || null); setInspectors(z.current.inspector_ids || []); }
    }).catch(() => setZoneOpts({ enabled: false }));
  }, []);
  useEffect(() => {
    if (!zoneId) { setZoneChief(null); setZoneInspectors([]); return; }
    setLoadingZ(true);
    request('/me/zone-inspectors?zone_id=' + zoneId).then((r) => {
      setZoneChief(r.chief || null); setZoneInspectors(r.inspectors || []); setIsAdminStaff(!!r.is_admin_staff);
    }).catch(() => { setZoneChief(null); setZoneInspectors([]); }).finally(() => setLoadingZ(false));
  }, [zoneId]);
  if (!p) return <View style={s.center}><Text style={s.muted}>در حال بارگذاری…</Text></View>;
  const set = (k, v) => { if(p.profile_edit_allowed===false)return; setP({ ...p, [k]: v }); };
  const profileReadOnly=p.profile_edit_allowed===false||formInfo?.profile_edit_allowed===false;
  const valuesForRules={...p,...Object.fromEntries(Object.entries(extraValues).map(([id,value])=>['cf_'+id,value]))};
  const systemDefinitions=(formInfo?.schema?.sections||[]).flatMap(section=>section.fields||[]);
  const systemFieldState=key=>{
    const definition=systemDefinitions.find(f=>f.key===key&&f.binding==='system');
    return definition?profileFieldState(definition,valuesForRules):{visible:true,enabled:true,readonly:false,required:false};
  };
  const extraVisible=extraFields.filter(field=>profileFieldState(field.profile_definition||field,valuesForRules).visible);
  const systemCanEdit=key=>!profileReadOnly&&systemFieldState(key).visible&&systemFieldState(key).enabled&&!systemFieldState(key).readonly;
  const extraEditable=field=>!profileReadOnly&&!!field.user_editable&&
    !profileFieldState(field.profile_definition||field,valuesForRules).readonly;
  const toggleInspector = (id) => { if(profileReadOnly)return; setInspectors((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]); };
  const notFoundMsg = () => Alert.alert('بازرس پیدا نشد', 'اگر بازرس شما در فهرست نیست، لطفاً با بازرس خود تماس بگیرید و با ایشان هماهنگ کنید که ابتدا منطقه و مسئول بالادستی خود را در برنامه انتخاب کند تا نامش به فهرست بازرسین این منطقه اضافه شود. سپس این صفحه را دوباره بررسی کنید.');
  async function save() {
    if(p?.profile_edit_allowed===false){Alert.alert('فقط مشاهده','مدیر سامانه امکان ویرایش اطلاعات پرسنلی را غیرفعال کرده است.');return;}
    const national=normalizeIranianDigits(p?.national_code||'');
    const validation=validateUserInput({national_code:national});
    if(national && !validation.valid){
      setNationalTouched(true);
      Alert.alert('کد ملی نامعتبر',validation.errors[0]||'کد ملی نامعتبر است');
      return;
    }
    setBusy(true);
    try {
      const allowedSystem=['email','mobile','address','national_code','marital_status','children_count','birth_date'];
      const changed={};
      for(const key of allowedSystem){
        const value=key==='national_code'?(normalizeIranianDigits(p.national_code||'')||null):p[key]??null;
        const before=key==='national_code'?(normalizeIranianDigits(originalProfile?.national_code||'')||null):originalProfile?.[key]??null;
        const state=systemFieldState(key);
        if(String(value??'')!==String(before??'')&&state.visible&&state.enabled&&!state.readonly)changed[key]=value;
      }
      for(const field of extraFields){
        const key='cf_'+field.id,val=extraValues[field.id];
        if(!extraEditable(field)||!profileFieldState(field.profile_definition||field,valuesForRules).visible)continue;
        if(String(val??'')!==String(originalExtraValues[field.id]??''))changed[key]=val??'';
      }
      if(Object.keys(changed).length){
        await request('/me/complete-profile',{method:'PUT',queueIfOffline:false,
          body:{form_version:Number(formInfo?.version)||0,values:changed}});
      }
      // The signature is a separate media attribute and remains on its existing protected route.
      if(p.signature_data!==originalProfile?.signature_data){
        await request('/me/profile',{method:'PUT',queueIfOffline:false,body:{signature_data:p.signature_data||null}});
      }
      if (zoneOpts?.enabled) {
        await request('/me/zone-select', { method: 'POST', body: { zone_id: zoneId, inspector_ids: inspectors, chief_inspector_id: zoneChief?.id || null } }).catch(() => {});
      }
      Alert.alert('ذخیره شد', 'اطلاعات شما به‌روزرسانی شد.'); navigation.goBack();
    } catch (e) { Alert.alert('خطا', e.message); } finally { setBusy(false); }
  }
  return (
    <ScrollView style={{ backgroundColor: CC.paper }} contentContainerStyle={s.formContent} keyboardShouldPersistTaps="handled">
      <AccountFormHeader section="حساب کاربری" title="ویرایش اطلاعات من" description="اطلاعات تماس، مشخصات فردی و اطلاعات سازمانی خود را مرور و به‌روز کنید." />
      {profileReadOnly&&<Text accessibilityRole="alert" style={s.muted}>ویرایش اطلاعات توسط مدیر سامانه غیرفعال شده است؛ اطلاعات فعلاً فقط برای مشاهده هستند.</Text>}
      {vehicleAction}
      <Text style={s.label}>نام</Text>
      <TextInput style={[s.input, s.ro]} value={`${p.first_name || ''} ${p.last_name || ''}`} editable={false} />
      {systemFieldState('email').visible&&<Text style={s.label}>ایمیل</Text>}
      <TextInput editable={systemCanEdit('email')} style={s.input} value={p.email || ''} onChangeText={(v) => set('email', v)} keyboardType="email-address" autoCapitalize="none" />
      {systemFieldState('mobile').visible&&<Text style={s.label}>موبایل</Text>}
      <TextInput editable={systemCanEdit('mobile')} style={s.input} value={p.mobile || ''} onChangeText={(v) => set('mobile', v)} keyboardType="phone-pad" />
      {systemFieldState('national_code').visible&&<Text style={s.label}>کد ملی</Text>}
      <TextInput editable={systemCanEdit('national_code')} style={[s.input, s.nationalInput]} value={p.national_code || ''} onChangeText={(v) => {setNationalTouched(false);set('national_code', normalizeIranianDigits(v));}} onBlur={() => setNationalTouched(true)} keyboardType="number-pad" maxLength={32} placeholder="کد ملی ۱۰ رقمی" placeholderTextColor={CC.muted} />
      {nationalTouched && !!p.national_code && <Text accessibilityRole="alert" style={{color:validateNationalId(p.national_code).valid?CC.muted:'#b91c1c',textAlign:'right',marginTop:4}}>{validateNationalId(p.national_code).valid?'✓ ساختار کد ملی معتبر است؛ هویت صاحب آن تأیید نشده است.':validateNationalId(p.national_code).errors[0]}</Text>}
      {systemFieldState("birth_date").visible&&<Text style={s.label}>تاریخ تولد</Text>}
      <TouchableOpacity style={[s.input, s.dateInput]} disabled={!systemCanEdit("birth_date")} onPress={() => setBirthPickerOpen(true)}>
        <Text style={p.birth_date ? s.dateTxt : s.datePlaceholder}>{p.birth_date ? cleanJDateLabel(p.birth_date) : 'انتخاب تاریخ تولد'}</Text>
      </TouchableOpacity>
      <JDatePicker visible={birthPickerOpen} initial={parseJDate(p.birth_date) || null} minYear={1300} maxYear={1410} onClose={() => setBirthPickerOpen(false)} onSelect={(d) => set('birth_date', `${d.jy}-${String(d.jm).padStart(2, '0')}-${String(d.jd).padStart(2, '0')}`)} />
      {systemFieldState('address').visible&&<Text style={s.label}>آدرس</Text>}
      <TextInput editable={systemCanEdit('address')} style={[s.input, { height: 70, textAlignVertical: 'top' }]} multiline value={p.address || ''} onChangeText={(v) => set('address', v)} />
      {systemFieldState("marital_status").visible&&<Text style={s.label}>وضعیت تأهل</Text>}
      {systemFieldState("marital_status").visible&&<View style={{ flexDirection: 'row-reverse', gap: 8 }}>
        {['مجرد', 'متأهل'].map((m) => <TouchableOpacity key={m} style={[s.chip, p.marital_status === m && s.chipOn]} disabled={!systemCanEdit("marital_status")} onPress={() => set('marital_status', m)}><Text style={[s.chipTxt, p.marital_status === m && { color: '#fff' }]}>{m}</Text></TouchableOpacity>)}
      </View>}
      {systemFieldState('children_count').visible&&<Text style={s.label}>تعداد فرزند</Text>}
      <TextInput editable={systemCanEdit('children_count')} style={s.input} value={String(p.children_count || '')} onChangeText={(v) => set('children_count', v.replace(/[^0-9]/g, ''))} keyboardType="numeric" />
      <View style={{marginTop:18,paddingVertical:12,borderTopWidth:1,borderColor:CC.line}}>
        <Text style={s.supplementaryTitle}>اطلاعات جامع پرسنلی — فیلدهای تکمیلی</Text>
        {!!extraError&&<Text accessibilityRole="alert" style={{color:'#b91c1c',textAlign:'right',marginTop:8}}>{extraError}</Text>}
        {extraVisible.map(field=>{
          const state=profileFieldState(field.profile_definition||field,valuesForRules);
          const editable=extraEditable(field)&&state.enabled;
          return <View key={field.id} style={{marginTop:12}}>
            <Text style={s.label}>{field.label}{state.required&&editable?' *':''}{!editable?' (فقط نمایش)':''}</Text>
            {editable?<FieldInput field={field} value={extraValues[field.id]??''}
              onChange={value=>setExtraValues(prev=>({...prev,[field.id]:value}))}/>:
              <Text style={[s.input,s.ro]}>{String(extraValues[field.id]??'—').replace(/\\|/g,'، ')}</Text>}
          </View>;
        })}
        {extraVisible.length===0&&<Text style={s.muted}>فیلد تکمیلی دیگری برای نمایش وجود ندارد.</Text>}
      </View>
      {zoneOpts?.enabled && !profileReadOnly && (
        <View style={s.zoneBox}>
          <Text style={s.zoneTitle}>منطقه و بازرسان</Text>
          <Text style={s.label}>۱) ابتدا منطقهٔ خود را انتخاب کنید</Text>
          <View style={s.chipWrap}>
            {(zoneOpts.zones || []).map((z) => <TouchableOpacity key={z.id} style={[s.chip, zoneId === z.id && s.chipOn]} onPress={() => { setZoneId(z.id); setInspectors([]); }}><Text style={[s.chipTxt, zoneId === z.id && { color: '#fff' }]}>{z.name}</Text></TouchableOpacity>)}
            {(!zoneOpts.zones || !zoneOpts.zones.length) && <Text style={s.muted}>منطقه‌ای تعریف نشده است.</Text>}
          </View>
          {zoneId && (loadingZ ? <Text style={[s.muted, { marginTop: 12 }]}>در حال بارگذاری بازرسین منطقه…</Text> : (
            <>
              {zoneChief && <View style={s.chiefBox}><Text style={s.chiefLabel}>★ {isAdminStaff ? 'مسئول بالادست شما (پیش‌فرض)' : 'سربازرس این منطقه'}</Text><Text style={s.chiefName}>{zoneChief.name}{zoneChief.role_title ? ` (${zoneChief.role_title})` : ''}</Text><Text style={s.chiefHint}>{isAdminStaff ? 'به‌عنوان نیروی اداری، بالادست شما به‌صورت پیش‌فرض رییس اداره بازرسی است. در صورت تمایل می‌توانید یک نیروی اداری دیگر را به‌عنوان بالادست انتخاب کنید.' : 'سربازرس منطقه به‌صورت خودکار تعیین شده و به مسئولین بالادست شما اضافه می‌شود.'}</Text></View>}
              <Text style={[s.label, { marginTop: 14 }]}>{isAdminStaff ? '۲) در صورت تمایل، نیروی اداری دیگری را به‌عنوان بالادست انتخاب کنید (اختیاری)' : '۲) بازرس(های) خود را از فهرست بازرسین این منطقه انتخاب کنید'}</Text>
              <Text style={s.zoneHint}>{isAdminStaff ? 'اگر انتخاب نکنید، رییس اداره بازرسی بالادست شما خواهد بود.' : 'می‌توانید بیش از یک بازرس انتخاب کنید.'}</Text>
              <View style={s.chipWrap}>
                {zoneInspectors.filter((ins) => !zoneChief || ins.id !== zoneChief.id).map((ins) => <TouchableOpacity key={ins.id} style={[s.chip, inspectors.includes(ins.id) && s.chipOn]} onPress={() => toggleInspector(ins.id)}><Text style={[s.chipTxt, inspectors.includes(ins.id) && { color: '#fff' }]}>{ins.name}{ins.role_title ? ` (${ins.role_title})` : ''}</Text></TouchableOpacity>)}
                {!isAdminStaff && <TouchableOpacity style={[s.chip, s.chipNotFound]} onPress={notFoundMsg}><Text style={[s.chipTxt, { color: '#b91c1c' }]}>بازرس من در فهرست نیست…</Text></TouchableOpacity>}
              </View>
              {zoneInspectors.length === 0 && <Text style={[s.muted, { marginTop: 6 }]}>هنوز بازرسی برای این منطقه ثبت نشده است. اگر بازرس شما در فهرست نیست، گزینهٔ بالا را لمس کنید.</Text>}
            </>
          ))}
          <Text style={s.zoneHint}>این انتخاب‌ها به‌صورت خودکار در چارت سازمانی و منطقه‌بندی نیروها اعمال می‌شوند.</Text>
        </View>
      )}
      {!profileReadOnly&&<SignaturePad value={p.signature_data || null} onChange={(v) => set('signature_data', v)} />}
      {!profileReadOnly&&<TouchableOpacity style={[s.btn, busy && { opacity: 0.6 }]} disabled={busy} onPress={save}><Text style={s.btnTxt}>{busy ? 'در حال ذخیره…' : 'ذخیرهٔ اطلاعات'}</Text></TouchableOpacity>}
    </ScrollView>
  );
}

export function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  const [photo, setPhoto] = useState(user?.photo || null);
  const [busy, setBusy] = useState(false);
  const [photoCaptureOpen, setPhotoCaptureOpen] = useState(false);
  const [lines, setLines] = useState([]);
  const [linesOpen, setLinesOpen] = useState(false);
  const [viewPhoto, setViewPhoto] = useState(false);

  useEffect(() => { request('/my/lines').then(setLines).catch(() => setLines([])); }, []);
  useEffect(()=>{let active=true;(async()=>{const saved=await readProfilePhotoCache(user?.id);if(active&&saved?.uri)setPhoto(saved.uri);
    try{const profile=await request('/me/full-profile',{noStore:true,timeoutMs:10000});if(profile?.photo){const uri=await cacheProfilePhoto(user?.id,profile.photo);if(active&&uri)setPhoto(uri)}}catch{}
  })();return()=>{active=false}},[user?.id]);

  async function saveProfilePhoto(dataUri) {
    if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:image/')) {
      Alert.alert('خطا', 'تصویر گرفته‌شده معتبر نیست. دوباره تلاش کنید.');
      return;
    }
    setPhotoCaptureOpen(false);
    setBusy(true);
    try {
      const local=await cacheProfilePhoto(user?.id,dataUri,{force:true});
      if(local)setPhoto(local);
      const up = await request('/me/photo', { method: 'POST', body: { photo: dataUri },queueIfOffline:true,timeoutMs:60000 });
      if(up?.queued){Alert.alert('در صف ارسال','تصویر سلفی در گوشی ذخیره و در صف ارسال قرار گرفت. پس از اتصال اینترنت، عکس به سرور ارسال می‌شود.');return;}
      if(up?.path){const uri=await cacheProfilePhoto(user?.id,'/api/media?path='+encodeURIComponent(up.path),{force:true});if(uri)setPhoto(uri);}
      Alert.alert('ذخیره شد', 'عکس پرسنلی جدید ثبت شد.');
    } catch (e) {
      Alert.alert('خطا', e.message || 'ثبت عکس ناموفق بود.');
    } finally {
      setBusy(false);
    }
  }

  if (photoCaptureOpen) {
    return <PersonalPhotoCapture facing="front" systemCameraFirst compressOnConfirm title="تغییر عکس پرسنلی" instruction="لطفاً تصویر سلفی خود را بگیرید" uniformNotice={false} onCapture={saveProfilePhoto} onCancel={() => setPhotoCaptureOpen(false)} />;
  }

  return (
    <ScrollView persistentScrollbar={true} style={s.profileScroll} contentContainerStyle={s.profileContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <AccountFormHeader section="حساب من" title="حساب کاربری" description="مشخصات فردی، امنیت حساب و خدمات شخصی را مدیریت کنید." />
      <View style={s.card}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="نمایش عکس پرسنلی" disabled={!photo} onPress={() => photo && setViewPhoto(true)}>
            {photo ? <Image source={imageSource(photo)} style={s.avatar} /> : <View style={s.avatarPh}><Text style={s.avatarTxt}>{(user?.name || '؟')[0]}</Text></View>}
          </TouchableOpacity>
          <View style={{flex:1,minWidth:0}}><Text accessibilityRole="header" style={s.name}>{user?.name}</Text><Text style={s.role}>{user?.role}</Text></View>
        </View>
        <TouchableOpacity style={s.photoBtn} onPress={() => {playSound('presenceSelfie').catch(()=>{});setPhotoCaptureOpen(true);}} disabled={busy}>
          <Text style={s.photoBtnTxt}>گرفتن عکس پرسنلی (سلفی)</Text>
        </TouchableOpacity>
      </View>

      <View style={s.accountSection}>
        <Text style={s.accountSectionTitle}>مدیریت حساب و خدمات من</Text>
        <AccountAction icon="✏️" title="ویرایش اطلاعات من" description="اطلاعات شخصی و سازمانی خود را ویرایش کنید" onPress={() => navigation.navigate('EditProfile')} />
        <AccountAction icon="🔑" title="تغییر رمز عبور" description="رمز ورود حساب خود را تغییر دهید" onPress={() => navigation.navigate('ChangePassword')} />
        <AccountAction icon="💵" title="فیش‌های حقوقی من" description="مشاهده و پیگیری فیش‌های حقوقی" onPress={() => navigation.navigate('SalarySlips')} />
        <AccountAction icon="📋" title="گزارش‌های من و گردش آن‌ها" description="گزارش‌های ارسال‌شده و وضعیت آن‌ها" onPress={() => navigation.navigate('Reports')} />
        <AccountAction icon="💳" title="اشتراک گروهی و انفرادی" description="مشاهده و مدیریت اشتراک برنامه" onPress={() => navigation.navigate('Subscription')} />
      </View>

      <Text style={[s.label, { fontFamily: FONT.bold, color: CC.ink }]}>خطوط زیر نظر شما</Text>
      {lines.length === 0 ? (
        <Text style={{ color: CC.muted, fontFamily: FONT.regular, textAlign: 'right', marginBottom: 6 }}>خطی به شما اختصاص نیافته است.</Text>
      ) : (
        <>
          <TouchableOpacity onPress={() => setLinesOpen(o => !o)} style={s.linesHead}>
            <Text style={{ fontFamily: FONT.bold, color: CC.ink, textAlign: 'right' }}>خطوط مجاز برای شما ({faNum(lines.length)})</Text>
            <Text style={{ color: CC.brand, fontFamily: FONT.bold }}>{linesOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {linesOpen && lines.map((l) => (
            <View key={l.id} style={s.lineCard}>
              <Text style={s.lineTitle}>{faNum(l.code)} — {l.origin}{l.destination ? ' ← ' + l.destination : ''}</Text>
              <View style={s.lineStats}>
                {[["ناوگان",l.fleet_count],["راننده اصلی",l.primary_driver_count],["راننده کمکی",l.helper_driver_count]].map(([label,count])=><View key={label} style={s.lineStat}><Text style={s.lineStatNumber}>{count==null?'—':faNum(count)}</Text><Text style={s.lineStatLabel}>{label}</Text></View>)}
              </View>
            </View>
          ))}
        </>
      )}

      <Text style={{ textAlign: 'center', color: CC.muted, fontFamily: FONT.regular, fontSize: 12, marginTop: 18 }}>نسخهٔ برنامه: {faNum(Application.nativeApplicationVersion || '—')}</Text>
      <Text style={{ textAlign: 'center', color: CC.muted, fontFamily: FONT.regular, fontSize: 11, marginTop: 4, marginBottom: 6 }}>شرکت مبین شات مشهد</Text>
      <ImageViewer visible={viewPhoto} uri={photo} onClose={() => setViewPhoto(false)} />
    </ScrollView>
  );
}

function AccountAction({ icon, title, description, onPress }) {
  return (
    <TouchableOpacity style={s.accountAction} activeOpacity={0.82} onPress={onPress}>
      <View style={s.accountIcon}><Text style={s.accountIconText}>{icon}</Text></View>
      <View style={s.accountActionText}>
        <Text style={s.accountActionTitle}>{title}</Text>
        <Text style={s.accountActionDesc}>{description}</Text>
      </View>
      <Text style={s.accountArrow}>‹</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  formContent: { width:'100%', maxWidth:600, alignSelf:'center', padding:16, paddingBottom:56 },
  wrap: { flex: 1, backgroundColor: CC.paper, padding: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: CC.paper },
  muted: { color: CC.muted, fontFamily: FONT.regular },
  label: { fontFamily: FONT.regular, color: CC.muted, fontSize: 13, marginBottom: 6, marginTop: 8, textAlign: 'right' },
  input: { backgroundColor: '#fff', borderColor: '#d0e1da', borderWidth: 1, borderRadius: 16, minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, textAlign: 'right', fontFamily: FONT.regular, color: CC.ink, fontSize: 16 },
  nationalInput: { minHeight: 58, width: '100%', fontSize: 19, letterSpacing: 2, textAlign: 'center', writingDirection: 'ltr', paddingHorizontal: 18 },
  supplementaryBtn: { marginTop: 18, marginBottom: 8, minHeight: 72, borderRadius: 20, borderWidth: 1, borderColor: '#cfe3d9', backgroundColor: '#edf7f2', paddingHorizontal: 17, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  supplementaryTitle: { fontFamily: FONT.bold, color: CC.ink, textAlign: 'right', fontSize: 15 },
  supplementaryHint: { fontFamily: FONT.regular, color: CC.muted, textAlign: 'right', fontSize: 12, marginTop: 3 },
  supplementaryArrow: { fontFamily: FONT.bold, color: CC.brand, fontSize: 28 },
  ro: { backgroundColor: '#f0f2f7', color: CC.muted },
  dateInput: { justifyContent: 'center', minHeight: 48 },
  dateTxt: { fontFamily: FONT.bold, color: CC.ink, textAlign: 'right' },
  datePlaceholder: { fontFamily: FONT.regular, color: CC.muted, textAlign: 'right' },
  btn: { backgroundColor: CC.brand, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 18 },
  btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 },
  card: { backgroundColor: '#075b4d', borderRadius: 23, padding: 20, marginBottom: 17,elevation:3 },
  avatar: { width: 64, height: 64, borderRadius: 16 },
  avatarPh: { width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 24 },
  name: { color: '#fff', fontFamily: FONT.bold, fontSize: 17, textAlign: 'right' },
  role: { color: '#fff', opacity: 0.85, fontFamily: FONT.regular, textAlign: 'right', marginTop: 2 },
  photoBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 9, alignItems: 'center', marginTop: 12 },
  photoBtnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 13 },
  accountSection: { marginBottom: 18 },
  accountSectionTitle: { color: CC.brand, fontFamily: FONT.bold, fontSize: 15, textAlign: 'right', marginBottom: 9, paddingHorizontal: 3 },
  accountAction: { backgroundColor: '#fff', borderColor: '#dce9e5', borderWidth: 1, borderRadius: 19, padding: 15, marginBottom: 11, flexDirection: 'row-reverse', alignItems: 'center',elevation:1 },
  accountIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: CC.soft, alignItems: 'center', justifyContent: 'center', marginLeft: 11 },
  accountIconText: { fontSize: 19 },
  accountActionText: { flex: 1, minWidth: 0 },
  accountActionTitle: { color: CC.ink, fontFamily: FONT.bold, fontSize: 14, textAlign: 'right' },
  accountActionDesc: { color: CC.muted, fontFamily: FONT.regular, fontSize: 11.5, lineHeight: 18, textAlign: 'right', marginTop: 3 },
  accountArrow: { color: CC.brand, fontSize: 27, marginRight: 5 },
  settingsCard: { backgroundColor: '#fff', borderColor: CC.line, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14 },
  settingRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  settingTxt: { fontFamily: FONT.bold, color: CC.ink, fontSize: 14 },
  sizeBtn: { backgroundColor: '#eef1f7', borderRadius: 9, paddingVertical: 6, paddingHorizontal: 12 },
  sizeBtnTxt: { fontFamily: FONT.bold, color: CC.ink, fontSize: 12 },
  linesHead: { backgroundColor: '#fff', borderColor: CC.line, borderWidth: 1, borderRadius: 11, padding: 13, marginBottom: 8, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  lineCard: { backgroundColor: '#fff', borderColor: CC.line, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  lineTitle: { fontFamily: FONT.bold, color: CC.ink, textAlign: 'right', fontSize: 14, lineHeight: 24, marginBottom: 10 },
  lineStats: { flexDirection: 'row-reverse', gap: 7 },
  lineStat: { flex: 1, minWidth: 0, backgroundColor: '#f0f7f4', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 4, alignItems: 'center' },
  lineStatNumber: { fontFamily: FONT.bold, color: CC.brand, fontSize: 17 },
  lineStatLabel: { fontFamily: FONT.regular, color: CC.muted, fontSize: 10.5, textAlign: 'center', marginTop: 2 },
  chip: { backgroundColor: '#eef2f8', borderWidth: 1, borderColor: CC.line, borderRadius: 99, paddingVertical: 8, paddingHorizontal: 16 },
  chipOn: { backgroundColor: CC.brand, borderColor: CC.brand },
  chipTxt: { fontFamily: FONT.regular, color: CC.slate, fontSize: 13 },
  chipWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chipChief: { backgroundColor: '#c98a00', borderColor: '#c98a00' },
  chipNotFound: { backgroundColor: '#fef2f2', borderColor: '#fca5a5', borderStyle: 'dashed' },
  chiefBox: { marginTop: 14, padding: 12, backgroundColor: '#fff8e6', borderRadius: 10, borderWidth: 1, borderColor: '#f0d98a' },
  chiefLabel: { fontFamily: FONT.bold, color: '#9a6b00', fontSize: 13, textAlign: 'right' },
  chiefName: { fontFamily: FONT.bold, color: CC.ink, fontSize: 15, textAlign: 'right', marginTop: 4 },
  chiefHint: { fontFamily: FONT.regular, color: CC.muted, fontSize: 11, textAlign: 'right', marginTop: 4 },
  zoneBox: { marginTop: 18, padding: 14, backgroundColor: '#f7f9fc', borderRadius: 12, borderWidth: 1, borderColor: CC.line },
  zoneTitle: { fontFamily: FONT.bold, color: CC.ink, fontSize: 15, textAlign: 'right', marginBottom: 8 },
  zoneHint: { fontFamily: FONT.regular, color: CC.muted, fontSize: 11.5, textAlign: 'right', marginTop: 12 },
  signatureBox: { marginTop: 18, padding: 14, backgroundColor: '#f7f9fc', borderRadius: 12, borderWidth: 1, borderColor: CC.line },
  signaturePad: { height: 190, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: CC.line, marginTop: 10, overflow: 'hidden' },
  signatureDot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: '#111827' },
  signaturePreview: { height: 100, width: '100%', backgroundColor: '#fff', borderRadius: 10, marginTop: 10 },
  signatureFullscreenBtn: { minHeight: 48, marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: CC.brand, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  signatureFullscreenTxt: { fontFamily: FONT.bold, color: CC.brand, fontSize: 14 },
  signatureModal: { flex: 1, backgroundColor: CC.paper, padding: 14, paddingTop: 18 },
  signatureModalHeader: { minHeight: 56, flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10 },
  signatureModalTitle: { fontFamily: FONT.bold, color: CC.ink, fontSize: 19, textAlign: 'right' },
  signatureModalHint: { fontFamily: FONT.regular, color: CC.muted, fontSize: 12, textAlign: 'right', marginTop: 4 },
  signatureModalClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e8edf5', alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  signatureModalCloseTxt: { fontFamily: FONT.bold, color: CC.ink, fontSize: 30, lineHeight: 32 },
  signaturePadFull: { flex: 1, minHeight: 180, backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, borderColor: CC.line, overflow: 'hidden' },
  signatureModalActions: { flexDirection: 'row-reverse', gap: 10 },
  signatureModalAction: { flex: 1, marginTop: 12, minHeight: 52, justifyContent: 'center' },
  signatureClearBtn: { backgroundColor: '#6b7280' },
  signatureBackBtn: { minHeight: 44, marginTop: 8, alignItems: 'center', justifyContent: 'center' },
  signatureBackTxt: { fontFamily: FONT.bold, color: CC.muted, fontSize: 13 },
  signatureActions: { flexDirection: 'row-reverse', gap: 8 },
  signatureAction: { flex: 1, marginTop: 10 },
  profileScroll: { flex: 1, backgroundColor: CC.paper },
  profileContent: { width:'100%', maxWidth:600, alignSelf:'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
});
