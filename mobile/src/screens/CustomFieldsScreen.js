import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { request } from '../api';
import { validateIban,validateAccount,normalizeIranianDigits,bankCodeFromName } from '../identityBankingValidation';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';
import {profileFieldState,profileSchemaCustomFields,profileCanEdit} from '../userProfileRules';

// تبدیل تاریخ شمسی ساده: ورودی متنی YYYY-MM-DD (کاربر شمسی وارد می‌کند)
function JDateInput({ value, onChange }) {
  return (
    <TextInput
      style={s.input}
      value={value || ''}
      onChangeText={onChange}
      placeholder="مثلاً 1370-05-21 (شمسی)"
      placeholderTextColor={C.muted}
      keyboardType="numbers-and-punctuation"
    />
  );
}

export function FieldInput({ field, value, onChange, onBlur }) {
  const opts = (field.options || '').split('|').filter(Boolean);
  if (field.ftype === 'textarea')
    return <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} multiline value={value || ''} onChangeText={onChange} placeholderTextColor={C.muted} />;
  if (field.ftype === 'number')
    return <TextInput style={s.input} keyboardType="numeric" value={String(value??'')} onChangeText={onChange} onBlur={onBlur} placeholderTextColor={C.muted} />;
  if (['mobile','phone','national_id','account','iban','card'].includes(field.ftype))
    return <TextInput style={s.input} keyboardType="phone-pad" value={String(value??'')} onChangeText={onChange} onBlur={onBlur} placeholderTextColor={C.muted} />;
  if (field.ftype === 'email')
    return <TextInput style={s.input} keyboardType="email-address" autoCapitalize="none" value={String(value??'')} onChangeText={onChange} onBlur={onBlur} />;
  if (field.ftype === 'calculated') return <Text style={s.roVal}>{String(value??'—')}</Text>;
  if (['heading','description','divider'].includes(field.ftype))return <Text style={s.sectionT}>{field.description||field.label||''}</Text>;
  if (['image','file'].includes(field.ftype))return <Text style={s.muted}>بارگذاری این نوع مدرک در نسخه فعلی برنامه پشتیبانی نمی‌شود؛ برای ثبت به مدیر سامانه مراجعه کنید.</Text>;
  if (field.ftype === 'date')
    return <JDateInput value={value} onChange={onChange} />;
  if (field.ftype === 'checkbox' || field.ftype === 'boolean')
    return (
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
        <Switch value={value === '1' || value === true} onValueChange={(v) => onChange(v ? '1' : '0')} trackColor={{ true: C.brand }} />
        <Text style={s.txt}>{value === '1' || value === true ? 'بله' : 'خیر'}</Text>
      </View>
    );
  if (field.ftype === 'select' || field.ftype === 'radio')
    return (
      <View style={s.chips}>
        {opts.map((o) => {
          const on = value === o;
          return (
            <TouchableOpacity key={o} style={[s.chip, on && s.chipOn]} onPress={() => onChange(o)}>
              <Text style={[s.chipTxt, on && s.chipTxtOn]}>{o}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  if (field.ftype === 'multiselect') {
    const sel = (value || '').split('|').filter(Boolean);
    return (
      <View style={s.chips}>
        {opts.map((o) => {
          const on = sel.includes(o);
          return (
            <TouchableOpacity key={o} style={[s.chip, on && s.chipOn]} onPress={() => {
              const ns = on ? sel.filter((x) => x !== o) : [...sel, o];
              onChange(ns.join('|'));
            }}>
              <Text style={[s.chipTxt, on && s.chipTxtOn]}>{o}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }
  return <TextInput style={s.input} value={value || ''} onChangeText={onChange} onBlur={onBlur} placeholderTextColor={C.muted} />;
}

function bankingFieldKind(field){
  const name=String(field.fkey||'')+' '+String(field.label||'');
  if(/شبا|\biban\b|\bsheba\b|\bshaba\b/i.test(name))return 'iban';
  if(/شماره\s*حساب|account[_ -]?number|bank[_ -]?account/i.test(name))return 'account';
  return null;
}
function bankValidation(field,value,allFields,vals){
  const kind=bankingFieldKind(field);
  if(!kind||!String(value??'').trim())return null;
  if(kind==='account')return validateAccount(value);
  const bankField=allFields.find(f=>/نام\s*بانک|bank[_ -]?name|^بانک$/.test(String(f.fkey||'')+' '+String(f.label||'')));
  const selected=String(vals[bankField?.id]||'');
  return validateIban(value,{expectedBank:bankCodeFromName(selected),allowWithoutPrefix:true});
}
export default function CustomFieldsScreen({ navigation }) {
  const [fields, setFields] = useState(null);
  const [vals, setVals] = useState({});
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [touched,setTouched] = useState({});
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [formSchema,setFormSchema] = useState(null);
  const [profile,setProfile] = useState({});
  const [editingAllowed,setEditingAllowed] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [fs,profileResponse,formResponse] = await Promise.all([
        request('/my/custom-fields', { noStore: true }),
        request('/me/full-profile', {noStore:true}).catch(()=>({})),
        request('/my/user-profile-form',{noStore:true}).catch(()=>null)
      ]);
      if (!Array.isArray(fs)) throw new Error('پاسخ فیلدهای سفارشی معتبر نیست.');
      setProfile(profileResponse||{});
      setFormSchema(formResponse?.schema||null);
      setEditingAllowed(formResponse?.profile_edit_allowed!==false&&profileResponse?.profile_edit_allowed!==false);
      const configured=profileSchemaCustomFields(formResponse?.schema),byId=new Map(fs.map(f=>[Number(f.id),f]));
      const ordered=configured.filter(f=>byId.has(Number(f.custom_field_id))).map(f=>({...byId.get(Number(f.custom_field_id)),
        label:f.label||byId.get(Number(f.custom_field_id)).label,
        ftype:f.type||byId.get(Number(f.custom_field_id)).ftype,
        options:Array.isArray(f.options)?f.options.join('|'):byId.get(Number(f.custom_field_id)).options,
        profile_definition:f}));
      const other=fs.filter(f=>!configured.some(c=>Number(c.custom_field_id)===Number(f.id)));
      setFields([...ordered,...other]);
      const m = {};
      fs.forEach((f) => { if (f.value != null) m[f.id] = f.value; });
      setVals(m);
      setLoadError('');
    } catch (e) { setLoadError(e?.message || 'دریافت اطلاعات تکمیلی ناموفق بود.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if(!editingAllowed){Alert.alert('فقط مشاهده','مدیر سامانه امکان ویرایش اطلاعات تکمیلی را غیرفعال کرده است.');return;}
    const merged={...profile,...Object.fromEntries(Object.entries(vals).map(([id,v])=>['cf_'+id,v]))};
    const missing = (fields || []).filter((f) => {const st=profileFieldState(f.profile_definition||f,merged);return st.visible&&st.enabled&&st.required&&f.user_editable&&!st.readonly&&!String(vals[f.id]??'').trim();});
    if (missing.length) { Alert.alert('تکمیل الزامی', `این موارد الزامی‌اند: ${missing.map((m) => m.label).join('، ')}`); return; }
    for(const field of fields||[]){
      if(!field.user_editable||!profileCanEdit(field.profile_definition||field,profile)||!profileFieldState(field.profile_definition||field,{...profile,...Object.fromEntries(Object.entries(vals).map(([id,v])=>['cf_'+id,v]))}).visible)continue;
      const check=bankValidation(field,vals[field.id],fields,vals);
      if(check&&!check.valid){
        setTouched(current=>({...current,[field.id]:true}));
        Alert.alert('اطلاعات بانکی نامعتبر',check.errors[0]||'مغایرت اطلاعات بانکی');
        return;
      }
    }
    setBusy(true);
    try {
      const payload = {};
      (fields || []).filter((f) => f.user_editable && profileFieldState(f.profile_definition||f,{...profile,...Object.fromEntries(Object.entries(vals).map(([id,v])=>['cf_'+id,v]))}).visible).forEach((f) => { if (vals[f.id] != null) payload[f.id] = vals[f.id]; });
      const result = await request('/my/custom-fields', { method: 'POST', queueIfOffline: false, body: { values: payload } });
      if (!result?.ok) throw new Error('سرور ذخیره اطلاعات را تأیید نکرد.');
      Alert.alert('ثبت شد', 'اطلاعات شما ذخیره شد.');
      setEditing(false);
    } catch (e) { Alert.alert('خطا', e.message || 'ثبت ناموفق'); }
    finally { setBusy(false); }
  };

  if (fields === null && loading) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;
  if (fields === null) return <View style={s.center}><Text style={s.errorText}>{loadError || 'اطلاعات تکمیلی در دسترس نیست.'}</Text><TouchableOpacity accessibilityRole="button" style={s.retry} onPress={load}><Text style={s.retryText}>تلاش مجدد</Text></TouchableOpacity></View>;
  if (!fields.length) return <View style={s.center}><Text style={s.muted}>{loadError || 'فیلدی برای تکمیل تعریف نشده است.'}</Text>{!!loadError && <TouchableOpacity accessibilityRole="button" style={s.retry} onPress={load}><Text style={s.retryText}>تلاش مجدد</Text></TouchableOpacity>}</View>;

  const values={...profile,...Object.fromEntries(Object.entries(vals).map(([id,v])=>['cf_'+id,v]))};
  const visible=fields.filter(f=>profileFieldState(f.profile_definition||f,values).visible);
  const editable = visible.filter((f) => editingAllowed && f.user_editable && profileCanEdit(f.profile_definition||f,profile) && !profileFieldState(f.profile_definition||f,values).readonly);
  const readonly = visible.filter((f) => !editingAllowed || !f.user_editable || !profileCanEdit(f.profile_definition||f,profile) || profileFieldState(f.profile_definition||f,values).readonly);
  const showVal = (f) => (f.ftype === 'checkbox') ? (vals[f.id] === '1' || vals[f.id] === true ? 'بله' : 'خیر') : ((String(vals[f.id] || '')).replace(/\|/g, '، ') || '—');

  if (!editing) {
    return (
      <ScrollView persistentScrollbar={true} style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
        {!!loadError && <View style={s.errorBox}><Text style={s.errorText}>{loadError}</Text><TouchableOpacity accessibilityRole="button" style={s.retry} onPress={load}><Text style={s.retryText}>تلاش مجدد</Text></TouchableOpacity></View>}
        <Text style={s.intro}>اطلاعات تکمیلی شما</Text>
        {visible.map((f) => (
          <View key={f.id} style={s.roRow}>
            <Text style={s.label}>{f.label}</Text>
            <Text style={s.roVal}>{showVal(f)}</Text>
          </View>
        ))}
        {!editingAllowed&&<Text style={s.muted}>ویرایش اطلاعات تکمیلی توسط مدیر غیرفعال شده است.</Text>}
        {editable.length > 0 && (
          <TouchableOpacity style={s.btn} onPress={() => setEditing(true)}>
            <Text style={s.btnTxt}>✎ ویرایش اطلاعات</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView persistentScrollbar={true} style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
      {!!loadError && <View style={s.errorBox}><Text style={s.errorText}>{loadError}</Text><TouchableOpacity accessibilityRole="button" style={s.retry} onPress={load}><Text style={s.retryText}>تلاش مجدد</Text></TouchableOpacity></View>}
      <Text style={s.intro}>اطلاعات تکمیلی خود را وارد یا ویرایش کنید.</Text>
      {editable.map((f) => (
        <View key={f.id} style={s.fieldWrap}>
          <Text style={s.label}>{f.label}{profileFieldState(f.profile_definition||f,values).required ? ' *' : ''}</Text>
          <FieldInput field={f} value={vals[f.id]} onChange={(v) => {setTouched(current=>({...current,[f.id]:false}));setVals({ ...vals, [f.id]: bankingFieldKind(f)?normalizeIranianDigits(v):v });}} onBlur={()=>setTouched(current=>({...current,[f.id]:true}))} />
          {!!touched[f.id] && !!bankValidation(f,vals[f.id],fields,vals) && <Text accessibilityRole="text" style={{fontFamily:FONT.regular,color:bankValidation(f,vals[f.id],fields,vals).valid?C.muted:'#b91c1c',fontSize:12,lineHeight:21,textAlign:'right',marginTop:5}}>{bankValidation(f,vals[f.id],fields,vals).valid?'✓ '+(bankingFieldKind(f)==='iban'?'ساختار شبا معتبر است؛ مالکیت حساب تأیید نشده است.':'شماره حساب به استعلام بانکی نیاز دارد.'):bankValidation(f,vals[f.id],fields,vals).errors[0]}</Text>}
        </View>
      ))}

      {readonly.length > 0 && (
        <View style={{ marginTop: 18 }}>
          <Text style={s.sectionT}>اطلاعات ثبت‌شده (فقط نمایش)</Text>
          {readonly.map((f) => (
            <View key={f.id} style={s.roRow}>
              <Text style={s.label}>{f.label}</Text>
              <Text style={s.roVal}>{showVal(f)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 18 }}>
        <TouchableOpacity style={[s.btn, { flex: 1, marginTop: 0 }, (busy || !!loadError) && { opacity: 0.6 }]} disabled={busy || !!loadError} onPress={save}>
          <Text style={s.btnTxt}>{busy ? 'در حال ثبت…' : 'ذخیرهٔ اطلاعات'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btnGhost, { flex: 1 }]} onPress={() => { setEditing(false); load(); }}>
          <Text style={s.btnGhostTxt}>انصراف</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  errorBox: { padding: 14, backgroundColor: '#fff1f1', borderColor: '#f3b8c0', borderWidth: 1, borderRadius: 14, marginBottom: 12 },
  errorText: { fontFamily: FONT.regular, color: '#982b3d', textAlign: 'center', lineHeight: 22 },
  retry: { minHeight: 44, paddingHorizontal: 16, alignSelf: 'center', justifyContent: 'center', marginTop: 8 },
  retryText: { fontFamily: FONT.bold, color: C.brand },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper, padding: 24 },
  muted: { fontFamily: FONT.regular, color: C.muted, fontSize: 14, textAlign: 'center' },
  intro: { fontFamily: FONT.regular, color: C.slate, fontSize: 13, textAlign: 'right', marginBottom: 12 },
  fieldWrap: { marginBottom: 17 },
  label: { fontFamily: FONT.bold, color: C.ink, fontSize: 13, textAlign: 'right', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontFamily: FONT.regular, color: C.ink, textAlign: 'right', fontSize: 14 },
  txt: { fontFamily: FONT.regular, color: C.ink, fontSize: 14 },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#eef2f8', borderWidth: 1, borderColor: C.line, borderRadius: 99, paddingVertical: 7, paddingHorizontal: 14 },
  chipOn: { backgroundColor: C.brand, borderColor: C.brand },
  chipTxt: { fontFamily: FONT.regular, color: C.slate, fontSize: 13 },
  chipTxtOn: { color: '#fff', fontFamily: FONT.bold },
  sectionT: { fontFamily: FONT.bold, color: C.ink, fontSize: 14, textAlign: 'right', marginBottom: 8 },
  roRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 11, marginBottom: 7 },
  roVal: { fontFamily: FONT.regular, color: C.muted, fontSize: 13 },
  btn: { backgroundColor: C.brand, borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 18 },
  btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 },
  btnGhost: { backgroundColor: '#eef1f7', borderRadius: 14, padding: 15, alignItems: 'center' },
  btnGhostTxt: { color: '#1c2b40', fontFamily: FONT.bold, fontSize: 15 },
});
