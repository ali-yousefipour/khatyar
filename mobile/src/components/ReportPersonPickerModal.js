import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { C, FONT } from '../theme';
export default function ReportPersonPickerModal({ visible, targets = [], selectedId = null, excludeId = null, title = 'انتخاب شخص', onClose, onSelect }) {
  const [query, setQuery] = useState(''); const [role, setRole] = useState('');
  const roles = useMemo(() => { const m=new Map(); targets.forEach(t=>{const title=t.role_title||'بدون سمت';if(!m.has(title))m.set(title,title)});return Array.from(m.values()).sort((a,b)=>a.localeCompare(b,'fa')); },[targets]);
  const list = useMemo(() => { const q=query.trim().toLocaleLowerCase('fa'); return targets.filter(t=>{if(excludeId!=null&&String(t.id)===String(excludeId))return false;if(role&&(t.role_title||'بدون سمت')!==role)return false;if(!q)return true;const hay=(t.first_name||'')+' '+(t.last_name||'')+' '+(t.role_title||'');return hay.toLocaleLowerCase('fa').includes(q)}).slice(0,100); },[targets,query,role,excludeId]);
  return <Modal visible={!!visible} transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView
      style={s.backdrop}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <View style={s.sheet}>
        <View style={s.head}><Text style={s.title}>{title}</Text><TouchableOpacity onPress={onClose} style={s.close}><Text style={s.closeTxt}>✕</Text></TouchableOpacity></View>
        <TextInput
          style={s.search}
          value={query}
          onChangeText={setQuery}
          placeholder="جستجوی مستقیم نام، نام خانوادگی یا سمت…"
          placeholderTextColor={C.muted}
          autoFocus
          returnKeyType="search"
        />
        <View style={s.roles}>
          <TouchableOpacity style={[s.role,!role&&s.roleOn]} onPress={()=>setRole('')}><Text style={[s.roleTxt,!role&&s.roleTxtOn]}>همه سمت‌ها</Text></TouchableOpacity>
          {roles.map(x=><TouchableOpacity key={x} style={[s.role,role===x&&s.roleOn]} onPress={()=>setRole(role===x?'':x)}><Text style={[s.roleTxt,role===x&&s.roleTxtOn]}>{x}</Text></TouchableOpacity>)}
        </View>
        <ScrollView
          style={s.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
        >
          {list.map(t=>{const selected=String(selectedId)===String(t.id);return <TouchableOpacity key={t.id} style={[s.item,selected&&s.itemOn]} onPress={()=>onSelect(t)}><View style={{flex:1}}><Text style={[s.name,selected&&s.nameOn]}>{t.first_name} {t.last_name}</Text><Text style={s.meta}>{t.role_title||'بدون سمت'}</Text></View>{selected?<Text style={s.check}>✓</Text>:null}</TouchableOpacity>})}
          {!list.length?<Text style={s.empty}>شخصی با این مشخصات پیدا نشد.</Text>:null}
        </ScrollView>
        <TouchableOpacity style={s.cancel} onPress={onClose}><Text style={s.cancelTxt}>انصراف</Text></TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const s=StyleSheet.create({backdrop:{flex:1,backgroundColor:'rgba(0,0,0,.48)',justifyContent:'flex-end'},sheet:{maxHeight:'90%',backgroundColor:C.paper,borderTopLeftRadius:22,borderTopRightRadius:22,padding:14,paddingBottom:22},head:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',marginBottom:10},title:{fontFamily:FONT.bold,fontSize:18,color:C.ink,textAlign:'right',flex:1},close:{width:40,height:40,borderRadius:20,backgroundColor:'#eef1f7',alignItems:'center',justifyContent:'center'},closeTxt:{fontSize:18,color:C.ink},search:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:12,padding:12,textAlign:'right',fontFamily:FONT.regular,color:C.ink,minHeight:48},roles:{flexDirection:'row-reverse',flexWrap:'wrap',gap:7,paddingVertical:9},role:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:99,paddingHorizontal:12,paddingVertical:8},roleOn:{backgroundColor:C.brand,borderColor:C.brand},roleTxt:{fontFamily:FONT.regular,color:C.ink,fontSize:12},roleTxtOn:{color:'#fff'},list:{marginTop:2},item:{flexDirection:'row-reverse',alignItems:'center',backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:12,padding:11,marginBottom:7},itemOn:{borderColor:C.brand,backgroundColor:'#eef5f2'},name:{fontFamily:FONT.bold,color:C.ink,textAlign:'right',fontSize:14},nameOn:{color:C.brand},meta:{fontFamily:FONT.regular,color:C.muted,textAlign:'right',fontSize:11,marginTop:3},check:{fontSize:20,color:C.brand,marginLeft:8},empty:{fontFamily:FONT.regular,color:C.muted,textAlign:'center',padding:24},cancel:{marginTop:8,backgroundColor:'#eef1f7',borderRadius:12,paddingVertical:13,alignItems:'center'},cancelTxt:{fontFamily:FONT.bold,color:C.ink,fontSize:14}});