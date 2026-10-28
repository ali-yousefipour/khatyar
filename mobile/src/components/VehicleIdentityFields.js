import React,{useMemo,useRef,useState} from 'react';
import {Modal,ScrollView,StyleSheet,Text,TextInput,TouchableOpacity,View} from 'react-native';
import {C,FONT} from '../theme';

const fa=value=>String(value??'').replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const en=value=>String(value??'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const digits=(value,length)=>en(value).replace(/\D/g,'').slice(0,length);
// همان حروف قابل انتخاب در فرم بازدید سرویس مدارس.
export const VEHICLE_PLATE_LETTERS=['ب','ج','د','س','ص','ط','ق','ل','م','ن','و','هـ','ی','ت','ع','ک','الف','پ','ث','ش','ز','ف','گ','ژ'];

function NumberCell({value,onChange,length,placeholder,inputRef,next}){
 return <TextInput ref={inputRef} style={st.plateNumber} value={fa(value||'')} onChangeText={v=>{const n=digits(v,length);onChange(n);if(n.length===length)next?.()}} keyboardType="number-pad" maxLength={length} placeholder={placeholder} placeholderTextColor="#9ca3af" textAlign="center" selectTextOnFocus accessibilityLabel={`${fa(length)} رقم پلاک`}/>;
}

export function VehiclePlateInput({motor,data,set}){
 const[lettersOpen,setLettersOpen]=useState(false);
 const letterRef=useRef(null),threeRef=useRef(null),regionRef=useRef(null);
 if(motor)return <View style={st.motorWrap}>
  <View style={st.motorTopBar}><Text style={st.motorBarText}>پلاک موتورسیکلت</Text><Text style={st.motorBarText}>IRAN | ایران</Text></View>
  <View style={st.motorNumbers}><NumberCell value={data.motorcycle_plate_top} onChange={v=>set('motorcycle_plate_top',v)} length={3} placeholder="۱۲۳"/><View style={st.motorSeparator}/><NumberCell value={data.motorcycle_plate_bottom} onChange={v=>set('motorcycle_plate_bottom',v)} length={5} placeholder="۱۲۳۴۵"/></View>
  <Text style={st.help}>شماره سه‌رقمی و پنج‌رقمی پلاک را جداگانه وارد کنید.</Text>
 </View>;
 return <>
  <Text style={st.help}>شماره‌ها را از چپ به راست مطابق پلاک وارد کنید و برای انتخاب حرف روی آن بزنید.</Text>
  <View style={st.plateFrame}>
   <View style={st.flagBar}><Text style={st.flag}>🇮🇷</Text><Text style={st.flagSmall}>I.R.</Text><Text style={st.flagSmall}>IRAN</Text></View>
   <View style={st.plateMain}>
    <View style={[st.plateSegment,{flex:1.1}]}><NumberCell value={data.plate_part_left} onChange={v=>set('plate_part_left',v)} length={2} placeholder="۱۲" next={()=>setLettersOpen(true)}/></View>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="انتخاب حرف پلاک" onPress={()=>setLettersOpen(true)} style={[st.plateSegment,st.letterSegment]}><Text style={[st.letter, !data.plate_letter&&st.letterEmpty]}>{data.plate_letter||'حرف'}</Text><Text style={st.chevron}>⌄</Text></TouchableOpacity>
    <View style={[st.plateSegment,{flex:1.6}]}><NumberCell inputRef={threeRef} value={data.plate_part_right} onChange={v=>set('plate_part_right',v)} length={3} placeholder="۳۴۵" next={()=>regionRef.current?.focus()}/></View>
    <View style={st.regionSegment}><Text style={st.regionLabel}>ایران</Text><NumberCell inputRef={regionRef} value={data.plate_iran} onChange={v=>set('plate_iran',v)} length={2} placeholder="۱۱"/></View>
   </View>
  </View>
  <Modal visible={lettersOpen} transparent animationType="fade" onRequestClose={()=>setLettersOpen(false)}>
   <View style={st.backdrop}><View style={st.sheet}>
    <Text style={st.modalHeading}>انتخاب حرف پلاک</Text><Text style={st.help}>حروف مجاز پلاک‌های ایران</Text>
    <ScrollView style={{maxHeight:340}} contentContainerStyle={st.letterGrid} keyboardShouldPersistTaps="always">
     {VEHICLE_PLATE_LETTERS.map(letter=><TouchableOpacity key={letter} style={[st.letterOption,data.plate_letter===letter&&st.optionSelected]} onPress={()=>{set('plate_letter',letter);setLettersOpen(false);setTimeout(()=>threeRef.current?.focus(),100)}}><Text style={[st.letterOptionText,data.plate_letter===letter&&st.selectedText]}>{letter}</Text></TouchableOpacity>)}
    </ScrollView>
    <TouchableOpacity style={st.closeButton} onPress={()=>setLettersOpen(false)}><Text style={st.closeText}>بستن</Text></TouchableOpacity>
   </View></View>
  </Modal>
 </>;
}

export function VehicleYearPicker({years,value,onChange,motor}){
 const[open,setOpen]=useState(false),[query,setQuery]=useState('');
 const options=useMemo(()=>[...new Set((years||[]).map(Number).filter(Number.isInteger))].sort((a,b)=>b-a),[years]);
 const filtered=useMemo(()=>options.filter(y=>String(y).includes(digits(query,4))),[options,query]);
 return <>
  <Text style={st.fieldLabel}>{motor?'سال مدل موتورسیکلت':'سال ساخت خودرو'}</Text>
  <TouchableOpacity accessibilityRole="button" accessibilityLabel="انتخاب سال مدل وسیله" onPress={()=>{setQuery('');setOpen(true)}} style={st.yearTrigger}>
   <View><Text style={st.yearValue}>{value?fa(value):'انتخاب سال ساخت'}</Text><Text style={st.yearSub}>تقویم شمسی • {options.length?`${fa(options[options.length-1])} تا ${fa(options[0])}`:'سال‌های مجاز'}</Text></View>
   <View style={st.yearIcon}><Text style={st.yearIconText}>▦</Text></View>
  </TouchableOpacity>
  <Modal visible={open} transparent animationType="slide" onRequestClose={()=>setOpen(false)}>
   <View style={st.backdrop}><View style={st.sheet}>
    <Text style={st.modalHeading}>انتخاب سال ساخت {motor?'موتورسیکلت':'خودرو'}</Text>
    <Text style={st.help}>سال موردنظر را جستجو کنید یا از فهرست انتخاب کنید.</Text>
    <TextInput style={st.search} keyboardType="number-pad" value={fa(query)} onChangeText={v=>setQuery(digits(v,4))} maxLength={4} placeholder="جستجوی سال، مثلاً ۱۴۰۲" placeholderTextColor="#94a3b8" textAlign="right"/>
    <ScrollView style={{maxHeight:330}} keyboardShouldPersistTaps="always" contentContainerStyle={st.yearOptions}>
     {filtered.map(y=><TouchableOpacity key={y} style={[st.yearOption,Number(value)===y&&st.optionSelected]} onPress={()=>{onChange(y);setOpen(false)}}><Text style={[st.yearOptionText,Number(value)===y&&st.selectedText]}>{fa(y)}</Text></TouchableOpacity>)}
     {!filtered.length&&<Text style={st.empty}>سال موردنظر در فهرست مجاز نیست.</Text>}
    </ScrollView>
    <TouchableOpacity style={st.closeButton} onPress={()=>setOpen(false)}><Text style={st.closeText}>انصراف</Text></TouchableOpacity>
   </View></View>
  </Modal>
 </>;
}

const st=StyleSheet.create({
 help:{color:'#64748b',fontFamily:FONT.regular,fontSize:12,textAlign:'right',marginBottom:10,lineHeight:20},
 plateFrame:{flexDirection:'row',borderWidth:2,borderColor:'#1e293b',borderRadius:11,overflow:'hidden',backgroundColor:'#fff',minHeight:87,marginBottom:16},
 flagBar:{width:39,backgroundColor:'#1456a4',justifyContent:'space-around',alignItems:'center',paddingVertical:6},flag:{fontSize:21},flagSmall:{fontSize:9,color:'#fff',fontWeight:'800'},
 plateMain:{flex:1,flexDirection:'row',alignItems:'stretch'},plateSegment:{flex:1,borderRightWidth:1,borderRightColor:'#e2e8f0',justifyContent:'center',alignItems:'center',minWidth:0},plateNumber:{width:'100%',color:'#111827',fontSize:23,fontWeight:'800',paddingHorizontal:1,paddingVertical:9,writingDirection:'ltr'},
 letterSegment:{flex:0.95,backgroundColor:'#f8fafc'},letter:{color:'#111827',fontSize:25,fontWeight:'800'},letterEmpty:{fontSize:15,color:'#64748b'},chevron:{position:'absolute',bottom:2,fontSize:14,color:'#64748b'},
 regionSegment:{width:58,borderLeftWidth:2,borderLeftColor:'#1e293b',alignItems:'center',justifyContent:'center'},regionLabel:{fontFamily:FONT.bold,fontSize:13,color:'#111827',marginTop:4},
 motorWrap:{backgroundColor:'#f8fafc',borderRadius:15,borderColor:'#cbd5e1',borderWidth:1,overflow:'hidden',marginBottom:14},motorTopBar:{backgroundColor:'#1456a4',padding:10,flexDirection:'row-reverse',justifyContent:'space-between'},motorBarText:{color:'#fff',fontFamily:FONT.bold,fontSize:12},motorNumbers:{flexDirection:'row',padding:15,alignItems:'center'},motorSeparator:{height:32,width:2,backgroundColor:'#cbd5e1',marginHorizontal:8},
 backdrop:{flex:1,backgroundColor:'rgba(15,23,42,.55)',justifyContent:'flex-end'},sheet:{backgroundColor:'#fff',borderTopLeftRadius:25,borderTopRightRadius:25,padding:20,paddingBottom:30},modalHeading:{fontFamily:FONT.bold,fontSize:19,color:'#0f172a',textAlign:'right',marginBottom:8},
 letterGrid:{flexDirection:'row-reverse',flexWrap:'wrap',gap:8,paddingVertical:6},letterOption:{width:'22%',minHeight:54,alignItems:'center',justifyContent:'center',backgroundColor:'#f1f5f9',borderRadius:12,borderWidth:1,borderColor:'#e2e8f0'},letterOptionText:{fontFamily:FONT.bold,fontSize:23,color:'#1e293b'},optionSelected:{backgroundColor:C.brand,borderColor:C.brand},selectedText:{color:'#fff'},
 closeButton:{marginTop:12,padding:13,alignItems:'center',borderRadius:12,backgroundColor:'#f1f5f9'},closeText:{fontFamily:FONT.bold,color:'#334155'},
 fieldLabel:{fontFamily:FONT.bold,fontSize:14,color:'#334155',textAlign:'right',marginTop:13,marginBottom:7},yearTrigger:{borderWidth:1,borderColor:'#cbd5e1',backgroundColor:'#f8fafc',borderRadius:14,padding:15,flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',marginBottom:10},yearValue:{fontFamily:FONT.bold,fontSize:19,color:'#0f172a',textAlign:'right'},yearSub:{fontSize:11,color:'#64748b',textAlign:'right',marginTop:5},yearIcon:{width:44,height:44,borderRadius:13,backgroundColor:'#dbeafe',alignItems:'center',justifyContent:'center'},yearIconText:{color:'#1d4ed8',fontSize:24},
 search:{borderWidth:1,borderColor:'#cbd5e1',borderRadius:12,padding:13,fontFamily:FONT.regular,fontSize:16,color:'#0f172a',marginVertical:12},yearOptions:{flexDirection:'row-reverse',flexWrap:'wrap',gap:9,paddingBottom:10},yearOption:{width:'30%',paddingVertical:15,alignItems:'center',backgroundColor:'#f1f5f9',borderRadius:12,borderWidth:1,borderColor:'#e2e8f0'},yearOptionText:{fontFamily:FONT.bold,fontSize:17,color:'#334155'},empty:{fontFamily:FONT.regular,textAlign:'center',padding:20,color:'#64748b'}
});
