import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, PanResponder } from 'react-native';
import { C, FONT } from '../theme';
const FA = '۰۱۲۳۴۵۶۷۸۹';
const fa = (s) => String(s).replace(/[0-9]/g, (d) => FA[+d]);
const SIZE = 260;
const R = SIZE / 2;
export default function TimePicker({ visible, onClose, onSelect, initial }) {
  const init = (initial || '08:00').split(':');
  const [hour, setHour] = useState(parseInt(init[0], 10) || 8);
  const [minute, setMinute] = useState(parseInt(init[1], 10) || 0);
  const [mode, setMode] = useState('h');
  function angleToVal(x, y) {
    const dx = x - R, dy = y - R;
    let ang = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    if (ang < 0) ang += 360;
    if (mode === 'h') {
      let h = Math.round(ang / 30) % 12;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let hh = h === 0 ? 12 : h;
      if (dist < R * 0.62) { hh = hh === 12 ? 0 : hh + 12; }
      setHour(hh % 24);
    } else { let m = Math.round(ang / 6) % 60; setMinute(m); }
  }
  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => angleToVal(e.nativeEvent.locationX, e.nativeEvent.locationY),
    onPanResponderMove: (e) => angleToVal(e.nativeEvent.locationX, e.nativeEvent.locationY),
  });
  const handAng = mode === 'h' ? ((hour % 12) * 30) : (minute * 6);
  const handLen = mode === 'h' && hour >= 12 && hour !== 12 ? R * 0.42 : R * 0.62;
  const hx = R + handLen * Math.sin(handAng * Math.PI / 180);
  const hy = R - handLen * Math.cos(handAng * Math.PI / 180);
  const nums = mode === 'h' ? Array.from({ length: 12 }, (_, i) => i + 1) : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const p2 = (n) => String(n).padStart(2, '0');
  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.bg}>
        <View style={s.card}>
          <View style={s.timeRow}>
            <TouchableOpacity onPress={() => setMode('h')}><Text style={[s.tBig, mode === 'h' && { color: C.brand }]}>{fa(p2(hour))}</Text></TouchableOpacity>
            <Text style={s.colon}>:</Text>
            <TouchableOpacity onPress={() => setMode('m')}><Text style={[s.tBig, mode === 'm' && { color: C.brand }]}>{fa(p2(minute))}</Text></TouchableOpacity>
          </View>
          <Text style={s.hint}>{mode === 'h' ? 'ساعت را انتخاب کنید (داخلی: ۱۳ تا ۲۴)' : 'دقیقه را انتخاب کنید'}</Text>
          <View style={s.clock} {...pan.panHandlers}>
            <View style={s.center} />
            <View style={[s.hand, { width: 3, height: handLen, left: R - 1.5, top: R - handLen, transform: [{ translateY: handLen / 2 }, { rotate: `${handAng}deg` }, { translateY: -handLen / 2 }] }]} />
            <View style={[s.knob, { left: hx - 14, top: hy - 14 }]} />
            {nums.map((n, i) => {
              const ang = (mode === 'h' ? (n % 12) * 30 : n * 6);
              const rad = R * 0.82;
              const x = R + rad * Math.sin(ang * Math.PI / 180) - 14;
              const y = R - rad * Math.cos(ang * Math.PI / 180) - 12;
              return <Text key={i} style={[s.num, { left: x, top: y }]}>{fa(n)}</Text>;
            })}
          </View>
          <View style={s.actions}>
            <TouchableOpacity style={s.cancel} onPress={onClose}><Text style={s.cancelTxt}>انصراف</Text></TouchableOpacity>
            <TouchableOpacity style={s.ok} onPress={() => { onSelect(`${p2(hour)}:${p2(minute)}`); onClose(); }}><Text style={s.okTxt}>تأیید</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.paper, borderRadius: 20, padding: 20, alignItems: 'center', width: SIZE + 56 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4, justifyContent: 'center' },
  tBig: { fontFamily: FONT.bold, fontSize: 42, color: C.ink },
  colon: { fontFamily: FONT.bold, fontSize: 42, color: C.muted },
  hint: { fontFamily: FONT.regular, fontSize: 11.5, color: C.muted, marginBottom: 14 },
  clock: { width: SIZE, height: SIZE, borderRadius: R, backgroundColor: '#eef1f7', position: 'relative' },
  center: { position: 'absolute', left: R - 4, top: R - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: C.brand },
  hand: { position: 'absolute', backgroundColor: C.brand, borderRadius: 2 },
  knob: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: C.brand, opacity: 0.85 },
  num: { position: 'absolute', width: 28, textAlign: 'center', fontFamily: FONT.bold, color: C.ink, fontSize: 14 },
  actions: { flexDirection: 'row-reverse', gap: 10, marginTop: 18, alignSelf: 'stretch' },
  ok: { flex: 1, backgroundColor: C.brand, borderRadius: 12, padding: 12, alignItems: 'center' },
  okTxt: { color: '#fff', fontFamily: FONT.bold },
  cancel: { flex: 1, backgroundColor: '#eef1f7', borderRadius: 12, padding: 12, alignItems: 'center' },
  cancelTxt: { color: C.ink, fontFamily: FONT.bold },
});
