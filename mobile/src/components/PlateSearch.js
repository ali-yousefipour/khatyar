import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { C, FONT } from '../theme';
import { faNum, enNum } from '../num';

function faToEn(s) { return enNum(s).replace(/[^0-9]/g, ''); }

// کامپوننت جستجوی پلاک تاکسی به‌صورت گرافیکی.
// onSearch(plateText) فراخوانی می‌شود؛ plateText مثل "12ت879-12"
export default function PlateSearch({ onSearch, onClear, regionCode = '12' }) {
  const [p1, setP1] = useState('');
  const [p3, setP3] = useState('');
  const p3ref = useRef(null);

  const build = () => {
    const a = faToEn(p1).slice(0, 2), c = faToEn(p3).slice(0, 3);
    if (!a || !c) return null;
    // قالب پلاک: {2رقم}ت{3رقم}-{کد منطقه}
    return `${a}ت${c}-${regionCode}`;
  };

  const doSearch = () => {
    const plate = build();
    if (plate) onSearch(plate);
  };
  const clear = () => { setP1(''); setP3(''); onClear && onClear(); };

  return (
    <View style={s.box}>
      <View style={s.plateWrap}>
        <View style={s.plateBody}>
          <TextInput style={s.plateInput} value={p1}
            onChangeText={(v) => { const d=faToEn(v).slice(0,2); setP1(d); if (d.length >= 2) p3ref.current && p3ref.current.focus(); }}
            keyboardType="number-pad" maxLength={2} placeholder="۱۲" placeholderTextColor="#b8a000" />
          <Text style={s.plateLetter}>ت</Text>
          <TextInput ref={p3ref} style={[s.plateInput, { width: 70 }]} value={p3}
            onChangeText={(v)=>setP3(faToEn(v).slice(0,3))} keyboardType="number-pad" maxLength={3} placeholder="۸۷۹" placeholderTextColor="#b8a000" />
          <View style={s.plateRegion}>
            <Text style={s.plateRegionNum}>{faNum(regionCode)}</Text>
            <View style={s.plateRegionLine} />
          </View>
        </View>
        <View style={s.plateFlag}>
          <Text style={s.plateFlagIR}>I.R.</Text>
          <Text style={s.plateFlagIran}>ایران</Text>
        </View>
      </View>
      <View style={s.btnRow}>
        <TouchableOpacity style={s.btn} onPress={doSearch}><Text style={s.btnTxt}>جستجوی پلاک</Text></TouchableOpacity>
        <TouchableOpacity style={s.btnClear} onPress={clear}><Text style={s.btnClearTxt}>پاک کردن</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  box: { alignItems: 'center', marginVertical: 10 },
  plateWrap: { flexDirection: 'row', alignItems: 'stretch', height: 64, borderRadius: 9, overflow: 'hidden', borderWidth: 2, borderColor: '#1a1a1a' },
  plateBody: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5c518', paddingHorizontal: 8, gap: 3 },
  plateInput: { width: 50, height: 52, textAlign: 'center', fontFamily: FONT.bold, color: '#1a1a1a', fontSize: 26, padding: 0 },
  plateLetter: { fontFamily: FONT.bold, color: '#1a1a1a', fontSize: 22, marginHorizontal: 2 },
  plateRegion: { alignItems: 'center', justifyContent: 'center', marginRight: 3, borderLeftWidth: 1.5, borderLeftColor: '#1a1a1a', paddingLeft: 6, height: 44 },
  plateRegionNum: { fontFamily: FONT.bold, color: '#1a1a1a', fontSize: 18 },
  plateRegionLine: { width: 24, height: 2, backgroundColor: '#1a1a1a', marginTop: 2 },
  plateFlag: { backgroundColor: '#0a3d91', width: 36, alignItems: 'center', justifyContent: 'center', paddingVertical: 5 },
  plateFlagIR: { color: '#fff', fontFamily: FONT.bold, fontSize: 9 },
  plateFlagIran: { color: '#fff', fontFamily: FONT.regular, fontSize: 9, marginTop: 2 },
  btnRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 10 },
  btn: { backgroundColor: C.brand, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 20 },
  btnTxt: { color: '#fff', fontFamily: FONT.bold, fontSize: 13 },
  btnClear: { backgroundColor: '#eef1f6', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 16 },
  btnClearTxt: { color: C.slate, fontFamily: FONT.bold, fontSize: 13 },
});
