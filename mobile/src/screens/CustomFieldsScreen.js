import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { request } from '../api';
import { C, FONT } from '../theme';
import ActivityIndicator from '../components/PulseLoadingIndicator';

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

function FieldInput({ field, value, onChange }) {
  const opts = (field.options || '').split('|').filter(Boolean);
  if (field.ftype === 'textarea')
    return <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} multiline value={value || ''} onChangeText={onChange} placeholderTextColor={C.muted} />;
  if (field.ftype === 'number')
    return <TextInput style={s.input} keyboardType="numeric" value={value || ''} onChangeText={onChange} placeholderTextColor={C.muted} />;
  if (field.ftype === 'date')
    return <JDateInput value={value} onChange={onChange} />;
  if (field.ftype === 'checkbox')
    return (
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
        <Switch value={value === '1' || value === true} onValueChange={(v) => onChange(v ? '1' : '0')} trackColor={{ true: C.brand }} />
        <Text style={s.txt}>{value === '1' ? 'بله' : 'خیر'}</Text>
      </View>
    );
  if (field.ftype === 'select')
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
  return <TextInput style={s.input} value={value || ''} onChangeText={onChange} placeholderTextColor={C.muted} />;
}

export default function CustomFieldsScreen({ navigation }) {
  const [fields, setFields] = useState(null);
  const [vals, setVals] = useState({});
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = () => {
    request('/my/custom-fields').then((fs) => {
      setFields(fs || []);
      const m = {};
      (fs || []).forEach((f) => { if (f.value != null) m[f.id] = f.value; });
      setVals(m);
    }).catch(() => setFields([]));
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const missing = (fields || []).filter((f) => f.required && f.user_editable && !String(vals[f.id] || '').trim());
    if (missing.length) { Alert.alert('تکمیل الزامی', `این موارد الزامی‌اند: ${missing.map((m) => m.label).join('، ')}`); return; }
    setBusy(true);
    try {
      const payload = {};
      (fields || []).filter((f) => f.user_editable).forEach((f) => { if (vals[f.id] != null) payload[f.id] = vals[f.id]; });
      await request('/my/custom-fields', { method: 'POST', body: { values: payload } });
      Alert.alert('ثبت شد', 'اطلاعات شما ذخیره شد.');
      setEditing(false);
    } catch (e) { Alert.alert('خطا', e.message || 'ثبت ناموفق'); }
    finally { setBusy(false); }
  };

  if (fields === null) return <View style={s.center}><ActivityIndicator color={C.brand} /></View>;
  if (!fields.length) return <View style={s.center}><Text style={s.muted}>فیلدی برای تکمیل تعریف نشده است.</Text></View>;

  const editable = fields.filter((f) => f.user_editable);
  const readonly = fields.filter((f) => !f.user_editable);
  const showVal = (f) => (f.ftype === 'checkbox') ? (vals[f.id] === '1' ? 'بله' : 'خیر') : ((String(vals[f.id] || '')).replace(/\|/g, '، ') || '—');

  if (!editing) {
    return (
      <ScrollView style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
        <Text style={s.intro}>اطلاعات تکمیلی شما</Text>
        {fields.map((f) => (
          <View key={f.id} style={s.roRow}>
            <Text style={s.label}>{f.label}</Text>
            <Text style={s.roVal}>{showVal(f)}</Text>
          </View>
        ))}
        {editable.length > 0 && (
          <TouchableOpacity style={s.btn} onPress={() => setEditing(true)}>
            <Text style={s.btnTxt}>✎ ویرایش اطلاعات</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: 16, paddingBottom: 56 }}>
      <Text style={s.intro}>اطلاعات تکمیلی خود را وارد یا ویرایش کنید.</Text>
      {editable.map((f) => (
        <View key={f.id} style={s.fieldWrap}>
          <Text style={s.label}>{f.label}{f.required ? ' *' : ''}</Text>
          <FieldInput field={f} value={vals[f.id]} onChange={(v) => setVals({ ...vals, [f.id]: v })} />
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
        <TouchableOpacity style={[s.btn, { flex: 1, marginTop: 0 }, busy && { opacity: 0.6 }]} disabled={busy} onPress={save}>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper, padding: 24 },
  muted: { fontFamily: FONT.regular, color: C.muted, fontSize: 14, textAlign: 'center' },
  intro: { fontFamily: FONT.regular, color: C.slate, fontSize: 13, textAlign: 'right', marginBottom: 12 },
  fieldWrap: { marginBottom: 14 },
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
