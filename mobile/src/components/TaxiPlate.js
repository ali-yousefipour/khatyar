import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { FONT } from '../theme';
import { enNum, faNum } from '../num';

const digits = value => enNum(String(value ?? '')).replace(/[^0-9]/g, '');

export function parseTaxiPlate(value) {
  const raw = enNum(String(value ?? '')).replace(/[\s\u200c]/g, '');
  // Database format: 12ت365-11 (or 12ت365-12 in Mashhad).
  const match = raw.match(/^(\d{2})ت(\d{3})[-\/]?(\d{2})$/);
  return match ? { first: match[1], middle: match[2], region: match[3] } : null;
}

export default function TaxiPlate({ plate, first = '', middle = '', region = '۱۲', editable = false, onFirstChange, onMiddleChange, middleRef, onMiddleSubmit, compact = false }) {
  const parsed = editable ? null : parseTaxiPlate(plate);
  const a = editable ? first : parsed?.first || '';
  const b = editable ? middle : parsed?.middle || '';
  const area = parsed?.region || (editable ? region : '—');
  const textSize = compact ? 19 : 27;
  return (
    <View accessibilityLabel={`پلاک تاکسی ${faNum(a || 'نامشخص')} ت ${faNum(b || 'نامشخص')} ایران ${faNum(area)}`} style={[s.frame, compact && s.frameCompact]}>
      <View style={s.blueBand}>
        <View style={s.flag}><View style={s.green}/><View style={s.white}><Text style={s.flagMark}>◆</Text></View><View style={s.red}/></View>
        <Text style={[s.ir,compact&&s.irCompact]}>I.R.</Text><Text style={[s.ir,compact&&s.irCompact]}>IRAN</Text>
      </View>
      <View style={s.main}>
        {editable ? <TextInput accessibilityLabel="دو رقم اول پلاک" style={[s.number,{fontSize:textSize}]} keyboardType="number-pad" maxLength={2} value={faNum(a)} onChangeText={v=>onFirstChange?.(digits(v).slice(0,2))} selectTextOnFocus placeholder="۱۱" placeholderTextColor="#8c7323" />
          : <Text style={[s.number,{fontSize:textSize}]}>{faNum(a || '— —')}</Text>}
        <View style={s.letterBox}><Text style={[s.taxiLabel,compact&&s.taxiLabelCompact]}>TAXI</Text><Text style={[s.letter,{fontSize:textSize+3}]}>ت</Text></View>
        {editable ? <TextInput ref={middleRef} accessibilityLabel="سه رقم وسط پلاک" style={[s.number,{fontSize:textSize}]} keyboardType="number-pad" maxLength={3} value={faNum(b)} onChangeText={v=>onMiddleChange?.(digits(v).slice(0,3))} selectTextOnFocus placeholder="۱۱۱" placeholderTextColor="#8c7323" returnKeyType="search" onSubmitEditing={onMiddleSubmit}/>
          : <Text style={[s.number,{fontSize:textSize}]}>{faNum(b || '— — —')}</Text>}
      </View>
      <View style={s.region}><Text style={[s.regionTitle,compact&&s.regionTitleCompact]}>ایران</Text><Text style={[s.regionNumber,compact&&s.regionNumberCompact]}>{faNum(area)}</Text></View>
    </View>
  );
}

const s=StyleSheet.create({
  frame:{width:'100%',maxWidth:460,height:78,flexDirection:'row',direction:'ltr',backgroundColor:'#ffca17',borderWidth:2.5,borderColor:'#171717',borderRadius:11,overflow:'hidden',alignSelf:'center'},
  frameCompact:{height:62,borderRadius:9},
  blueBand:{width:'12%',minWidth:32,maxWidth:56,backgroundColor:'#073e91',justifyContent:'space-around',alignItems:'center',paddingVertical:5},
  flag:{width:'68%',height:16,borderWidth:.4,borderColor:'#e3e8f2'},
  green:{flex:1,backgroundColor:'#239c47'},white:{flex:1,backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},red:{flex:1,backgroundColor:'#e3212a'},
  flagMark:{fontSize:5,color:'#e3212a',lineHeight:6},
  ir:{fontFamily:FONT.bold,color:'#fff',fontSize:10,textAlign:'center'},
  irCompact:{fontSize:8},
  main:{flex:1,flexDirection:'row',direction:'ltr',alignItems:'center',justifyContent:'space-evenly',minWidth:0,paddingHorizontal:2},
  number:{flex:1,minWidth:0,textAlign:'center',fontFamily:FONT.bold,color:'#111',padding:0,writingDirection:'ltr',includeFontPadding:false},
  letterBox:{flex:0.72,alignItems:'center',justifyContent:'center'},
  taxiLabel:{fontFamily:FONT.bold,color:'#171717',fontSize:10,lineHeight:13},
  taxiLabelCompact:{fontSize:8,lineHeight:10},
  letter:{fontFamily:FONT.bold,color:'#111',includeFontPadding:false},
  region:{width:'20%',maxWidth:78,borderLeftWidth:2,borderLeftColor:'#151515',alignItems:'center',justifyContent:'space-around',paddingVertical:4},
  regionTitle:{fontFamily:FONT.bold,fontSize:14,color:'#111'},
  regionTitleCompact:{fontSize:11},
  regionNumber:{fontFamily:FONT.bold,fontSize:29,color:'#111',includeFontPadding:false},
  regionNumberCompact:{fontSize:23},
});
