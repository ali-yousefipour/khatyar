import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C, FONT } from '../theme';

const fa = value => String(value).replace(/[0-9]/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
const latin = value => String(value ?? '').replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
const two = value => String(value).padStart(2, '0');
const formatTime = (hour, minute) => two(hour) + ':' + two(minute);
const parseTime = value => {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(latin(value));
  return match ? [Number(match[1]), Number(match[2])] : null;
};
const wrap = (value, length) => (value % length + length) % length;

function SpinnerColumn({ label, icon, value, length, onChange }) {
  const change = offset => onChange(wrap(value + offset, length));
  return (
    <View style={styles.column}>
      <View style={styles.columnTitle}>
        <MaterialCommunityIcons name={icon} size={19} color={C.ink} />
        <Text style={styles.columnTitleText} allowFontScaling={false}>{label}</Text>
      </View>
      <View style={styles.wheel}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={'افزایش ' + label} onPress={() => change(1)} style={styles.arrow}>
          <MaterialCommunityIcons name="chevron-up" size={25} color={C.slate} />
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={label + ' ' + fa(two(wrap(value - 1, length)))} onPress={() => change(-1)} style={styles.neighbor}>
          <Text style={styles.neighborText} allowFontScaling={false}>{fa(two(wrap(value - 1, length)))}</Text>
        </TouchableOpacity>
        <View accessible accessibilityLabel={label + ' انتخاب‌شده: ' + fa(two(value))} style={styles.current}>
          <Text style={styles.currentText} allowFontScaling={false}>{fa(two(value))}</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={label + ' ' + fa(two(wrap(value + 1, length)))} onPress={() => change(1)} style={styles.neighbor}>
          <Text style={styles.neighborText} allowFontScaling={false}>{fa(two(wrap(value + 1, length)))}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={'کاهش ' + label} onPress={() => change(-1)} style={styles.arrow}>
          <MaterialCommunityIcons name="chevron-down" size={25} color={C.slate} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TimePicker({ visible, onClose, onSelect, initial, label = 'انتخاب ساعت', shiftStartTime }) {
  const { height } = useWindowDimensions();
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [customMinute, setCustomMinute] = useState('00');
  const [editingMinute, setEditingMinute] = useState(false);
  const [error, setError] = useState(false);
  const [showHours, setShowHours] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const [h, m] = parseTime(initial || '08:00') || [8, 0];
    setHour(h);
    setShowHours(false);
    setMinute(m);
    setCustomMinute(two(m));
    setEditingMinute(false);
    setError(false);
  }, [visible, initial]);

  const chooseMinute = value => {
    setMinute(value);
    setCustomMinute(two(value));
    setEditingMinute(false);
    setError(false);
  };
  const selectPreset = time => {
    const parsed = parseTime(time);
    if (!parsed) return;
    setHour(parsed[0]);
    chooseMinute(parsed[1]);
  };
  const confirm = () => {
    const typed = latin(customMinute).trim();
    const m = editingMinute ? Number(typed) : minute;
    if (editingMinute && (!/^\d{1,2}$/.test(typed) || m > 59)) {
      setError(true);
      return;
    }
    onSelect(formatTime(hour, m));
    onClose();
  };
  const currentTime = formatTime(hour, editingMinute && /^\d{1,2}$/.test(latin(customMinute)) && Number(latin(customMinute)) <= 59 ? Number(latin(customMinute)) : minute);
  const quickOptions = [
    { key: 'now', title: 'اکنون', icon: 'crosshairs-gps', value: null },
    ...(parseTime(shiftStartTime) ? [{ key: 'shift', title: 'شروع شیفت', icon: 'calendar-clock', value: shiftStartTime }] : []),
    { key: 'eight', title: fa('08:00'), value: '08:00' },
    { key: 'fourteen', title: fa('14:00'), value: '14:00' },
  ];

  return (
    <Modal visible={!!visible} transparent animationType="fade" statusBarTranslucent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={[styles.card, { maxHeight: Math.max(280, height - 76) }]}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.heading}>
              <View style={styles.headingIcon}><MaterialCommunityIcons name="clock-outline" size={27} color={C.brand} /></View>
              <View style={styles.headingText}>
                <Text style={styles.title} allowFontScaling={false}>{label.startsWith('انتخاب') ? label : 'انتخاب ' + label}</Text>
                <Text style={styles.subtitle} allowFontScaling={false}>ساعت را به‌صورت ۲۴ ساعته انتخاب کنید.</Text>
              </View>
            </View>
            <View style={styles.preview}>
              <Text style={styles.previewTime} allowFontScaling={false}>{fa(currentTime)}</Text>
            </View>
            <View style={styles.columns}>
              {/* On RTL Android, row-reverse positions the first item on the right. */}
              <SpinnerColumn label="دقیقه" icon="timer-outline" value={minute} length={60} onChange={chooseMinute} />
              <SpinnerColumn label="ساعت" icon="clock-time-four-outline" value={hour} length={24} onChange={setHour} />
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:showHours}} onPress={()=>setShowHours(v=>!v)} style={styles.hourToggle}><Text style={styles.quickText}>انتخاب مستقیم ساعت (۰۰ تا ۲۳)</Text></TouchableOpacity>
            {showHours && <View style={styles.hourGrid}>{Array.from({ length: 24 }, (_,h)=><TouchableOpacity key={h} accessibilityRole="radio" accessibilityState={{checked:hour===h}} accessibilityLabel={fa(two(h))} onPress={()=>{setHour(h);setShowHours(false);}} style={[styles.hourCell,hour===h&&styles.quickSelected]}><Text style={styles.quickText}>{fa(two(h))}</Text></TouchableOpacity>)}</View>}
            <View style={styles.hourGrid}>{Array.from({length:12},(_,i)=>i*5).map(m=><TouchableOpacity key={m} accessibilityRole="button" accessibilityLabel={'دقیقه '+fa(two(m))} onPress={()=>chooseMinute(m)} style={[styles.hourCell,minute===m&&styles.quickSelected]}><Text style={styles.quickText}>{fa(two(m))}</Text></TouchableOpacity>)}</View>
            <View style={styles.minuteRow}>
              <Text style={styles.minuteHelp} allowFontScaling={false}>دقیقه دلخواه (۰۰ تا ۵۹)</Text>
              <TextInput accessibilityLabel="دقیقه دلخواه" style={[styles.minuteInput, error && styles.invalid]} value={fa(customMinute)}
                onChangeText={value => { setCustomMinute(latin(value).replace(/[^0-9]/g, '').slice(0, 2)); setEditingMinute(true); setError(false); }}
                keyboardType="number-pad" maxLength={2} selectTextOnFocus textAlign="center" allowFontScaling={false}
                onBlur={() => { const text = latin(customMinute); if (/^\d{1,2}$/.test(text) && Number(text) <= 59) chooseMinute(Number(text)); }} />
            </View>
            {error && <Text style={styles.error} allowFontScaling={false}>دقیقه باید عددی بین ۰۰ تا ۵۹ باشد.</Text>}
            <View style={styles.quickTitle}>
              <MaterialCommunityIcons name="lightning-bolt" size={18} color={C.brand} />
              <Text style={styles.quickTitleText} allowFontScaling={false}>گزینه‌های سریع</Text>
            </View>
            <View style={styles.quickRow}>
              {quickOptions.map(option => {
                const selected = option.value && option.value === currentTime;
                return <TouchableOpacity key={option.key} accessibilityRole="button" accessibilityLabel={option.title} style={[styles.quickChip, selected && styles.quickSelected]} onPress={() => {
                  if (option.key === 'now') { const now = new Date(); setHour(now.getHours()); chooseMinute(now.getMinutes()); }
                  else selectPreset(option.value);
                }}>
                  {option.icon ? <MaterialCommunityIcons name={option.icon} size={17} color={C.brand} /> : null}
                  <Text style={styles.quickText} allowFontScaling={false}>{option.title}</Text>
                </TouchableOpacity>;
              })}
            </View>
            <View style={styles.actions}>
              <TouchableOpacity accessibilityRole="button" style={styles.confirm} onPress={confirm}>
                <Text style={styles.confirmText} allowFontScaling={false}>تأیید ساعت</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" style={styles.cancel} onPress={onClose}>
                <Text style={styles.cancelText} allowFontScaling={false}>انصراف</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(8, 23, 36, .56)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 18 },
  card: { backgroundColor: '#fff', borderRadius: 26, maxWidth: 440, width: '100%', overflow: 'hidden', elevation: 13 },
  content: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 18 },
  heading: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  headingIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#e1f5ed', alignItems: 'center', justifyContent: 'center' },
  headingText: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  title: { fontFamily: FONT.bold, fontSize: 19, color: C.ink, textAlign: 'right' },
  subtitle: { fontFamily: FONT.regular, color: C.muted, fontSize: 11.5, lineHeight: 21, textAlign: 'right', marginTop: 4 },
  preview: { backgroundColor: '#e2f5ec', borderRadius: 24, alignItems: 'center', paddingVertical: 13, marginTop: 18, marginBottom: 13 },
  previewTime: { fontFamily: FONT.bold, fontSize: 38, color: C.brand, includeFontPadding: false, writingDirection: 'ltr' },
  columns: { flexDirection: 'row-reverse', gap: 12 },
  column: { flex: 1, minWidth: 0, padding: 9, borderWidth: 1, borderColor: '#e1e7ef', borderRadius: 18, backgroundColor: '#f5f7fa' },
  columnTitle: { flexDirection: 'row-reverse', gap: 5, alignItems: 'center', justifyContent: 'center', paddingVertical: 5 },
  columnTitleText: { fontFamily: FONT.bold, color: C.ink, fontSize: 14 },
  wheel: { alignItems: 'stretch', backgroundColor: '#fff', borderRadius: 15, paddingHorizontal: 5, paddingVertical: 3 },
  arrow: { minHeight: 30, alignItems: 'center', justifyContent: 'center' },
  neighbor: { minHeight: 34, alignItems: 'center', justifyContent: 'center' },
  neighborText: { fontFamily: FONT.regular, fontSize: 18, color: '#637184' },
  current: { minHeight: 52, borderRadius: 13, backgroundColor: '#ccefe1', alignItems: 'center', justifyContent: 'center' },
  currentText: { fontFamily: FONT.bold, color: C.brand, fontSize: 28 },
  hourToggle: {minHeight:44,alignItems:'center',justifyContent:'center'},
  hourGrid: {flexDirection:'row-reverse',flexWrap:'wrap',gap:6,marginVertical:5},
  hourCell: {minWidth:44,minHeight:44,flexGrow:1,borderRadius:10,borderWidth:1,borderColor:'#e1e7ef',alignItems:'center',justifyContent:'center'},
  minuteRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginTop: 12 },
  minuteHelp: { fontFamily: FONT.regular, color: C.muted, fontSize: 11.5, textAlign: 'right', flex: 1 },
  minuteInput: { width: 69, height: 43, borderRadius: 12, borderWidth: 1, borderColor: C.brand, fontFamily: FONT.bold, fontSize: 17, color: C.ink, backgroundColor: '#fff' },
  invalid: { borderColor: C.danger },
  error: { fontFamily: FONT.regular, fontSize: 11, color: C.danger, textAlign: 'right' },
  quickTitle: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 16, marginBottom: 8 },
  quickTitleText: { fontFamily: FONT.bold, color: C.ink, fontSize: 13 },
  quickRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 7 },
  quickChip: { flexGrow: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: '#e3e9f0', backgroundColor: '#f4f6fa', borderRadius: 12, paddingHorizontal: 11, minHeight: 41 },
  quickSelected: { backgroundColor: '#daf4e8', borderColor: C.brand },
  quickText: { fontFamily: FONT.bold, color: C.ink, fontSize: 12.5 },
  actions: { flexDirection: 'row-reverse', gap: 9, marginTop: 21 },
  confirm: { flex: 1.4, minHeight: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: C.brand },
  confirmText: { fontFamily: FONT.bold, fontSize: 15, color: '#fff' },
  cancel: { flex: 1, minHeight: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#edf1f6' },
  cancelText: { fontFamily: FONT.bold, fontSize: 14, color: C.ink },
});
