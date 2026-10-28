import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { C, FONT } from '../theme';

const fa = v => String(v).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
const latin = v => String(v).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
const two = n => String(n).padStart(2, '0');

export default function TimePicker({ visible, onClose, onSelect, initial }) {
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState('00');
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!visible) return;
    const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(latin(initial || '08:00'));
    setHour(match ? Number(match[1]) : 8);
    setMinute(match ? match[2] : '00');
    setError(false);
  }, [visible, initial]);
  const valid = /^\d{1,2}$/.test(minute) && Number(minute) <= 59;
  const confirm = () => {
    if (!valid) { setError(true); return; }
    onSelect(two(hour) + ':' + two(Number(minute)));
    onClose();
  };
  return <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.backdrop}><View style={s.card}>
      <Text style={s.title}>انتخاب ساعت</Text>
      <Text style={s.subtitle}>ساعت به صورت ۲۴ساعته است؛ بعدازظهر از ۱۳ تا ۲۳ انتخاب می‌شود.</Text>
      <View style={s.preview}><Text style={s.previewTime}>{fa(two(hour) + ':' + two(valid ? Number(minute) : 0))}</Text><Text style={s.previewLabel}>{hour < 12 ? 'قبل‌ازظهر' : 'بعدازظهر'}</Text></View>
      <Text style={s.label}>ساعت (۰۰ تا ۲۳)</Text>
      <ScrollView nestedScrollEnabled style={s.hoursScroll} contentContainerStyle={s.hoursGrid}>
        {Array.from({ length: 24 }, (_, h) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={'ساعت ' + fa(two(h))} key={h} style={[s.hourChip, hour === h && s.selected]} onPress={() => setHour(h)}><Text style={[s.chipText, hour === h && s.selectedText]}>{fa(two(h))}</Text></TouchableOpacity>)}
      </ScrollView>
      <Text style={s.label}>دقیقه (۰۰ تا ۵۹)</Text>
      <View style={s.minuteRow}><TextInput style={[s.minuteInput, error && !valid && s.invalid]} value={fa(minute)} onChangeText={v => { setMinute(latin(v).replace(/[^0-9]/g, '').slice(0, 2)); setError(false); }} keyboardType="number-pad" maxLength={2} selectTextOnFocus textAlign="center"/><Text style={s.minuteHelp}>دقیقه دقیق را وارد کنید</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.minutePresets}>
        {[0, 5, 10, 15, 20, 30, 40, 45, 50, 55].map(m => <TouchableOpacity key={m} style={[s.minuteChip, valid && Number(minute) === m && s.minuteSelected]} onPress={() => { setMinute(two(m)); setError(false); }}><Text style={s.minuteChipText}>{fa(two(m))}</Text></TouchableOpacity>)}
      </ScrollView>
      {error && !valid && <Text style={s.error}>دقیقه باید عددی بین ۰۰ تا ۵۹ باشد.</Text>}
      <View style={s.actions}><TouchableOpacity style={s.confirm} onPress={confirm}><Text style={s.confirmText}>تأیید ساعت</Text></TouchableOpacity><TouchableOpacity style={s.cancel} onPress={onClose}><Text style={s.cancelText}>انصراف</Text></TouchableOpacity></View>
    </View></View>
  </Modal>;
}
const s = StyleSheet.create({
  backdrop: { flex:1, backgroundColor:'rgba(5,20,31,.55)', alignItems:'center', justifyContent:'center', padding:16 },
  card: { backgroundColor:'#fff', width:'100%', maxWidth:410, borderRadius:22, padding:18, maxHeight:'90%' },
  title: { fontFamily:FONT.bold, fontSize:19, color:C.ink, textAlign:'right' },
  subtitle: { fontFamily:FONT.regular, fontSize:11.5, lineHeight:20, color:C.muted, textAlign:'right', marginTop:5 },
  preview: { backgroundColor:'#e9f6f0', borderRadius:14, alignItems:'center', padding:10, marginTop:14, marginBottom:14 },
  previewTime: { fontFamily:FONT.bold, fontSize:29, color:C.brand },
  previewLabel: { fontFamily:FONT.regular, fontSize:11, color:C.brand },
  label: { fontFamily:FONT.bold, fontSize:12.5, color:C.ink, textAlign:'right', marginBottom:7 },
  hoursScroll: { flexGrow:0, maxHeight:208, marginBottom:13 },
  hoursGrid: { flexDirection:'row-reverse', flexWrap:'wrap', gap:7, justifyContent:'center' },
  hourChip: { width:'14.1%', borderRadius:9, paddingVertical:9, backgroundColor:'#f4f6fa', alignItems:'center', borderWidth:1, borderColor:'#e4eaf1' },
  selected: { backgroundColor:C.brand, borderColor:C.brand },
  chipText: { fontFamily:FONT.bold, color:C.slate, fontSize:13 },
  selectedText: { color:'#fff' },
  minuteRow: { flexDirection:'row-reverse', alignItems:'center', gap:12 },
  minuteInput: { width:74, borderRadius:12, borderWidth:1, borderColor:C.brand, color:C.ink, fontFamily:FONT.bold, fontSize:21, paddingVertical:8 },
  invalid: { borderColor:C.danger },
  minuteHelp: { fontFamily:FONT.regular, fontSize:11.5, color:C.muted },
  minutePresets: { flexDirection:'row-reverse', gap:7, paddingVertical:10 },
  minuteChip: { backgroundColor:'#f2f6f8', paddingHorizontal:12, paddingVertical:8, borderRadius:10 },
  minuteSelected: { backgroundColor:'#d5efe3' },
  minuteChipText: { fontFamily:FONT.bold, fontSize:12, color:C.brand },
  error: { fontFamily:FONT.regular, fontSize:11, color:C.danger, textAlign:'right' },
  actions: { flexDirection:'row-reverse', gap:9, marginTop:10 },
  confirm: { flex:1.4, backgroundColor:C.brand, borderRadius:12, paddingVertical:12, alignItems:'center' },
  cancel: { flex:1, backgroundColor:'#edf1f5', borderRadius:12, paddingVertical:12, alignItems:'center' },
  confirmText: { fontFamily:FONT.bold, color:'#fff' },
  cancelText: { fontFamily:FONT.bold, color:C.ink },
});
