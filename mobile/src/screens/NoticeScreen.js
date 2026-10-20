import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, Switch, Modal, Pressable, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ImagePicker, launchCamera, launchLibrary } from '../cameraLock';
import { compressToDataUri } from '../img';
import { request } from '../api';
import { getAppConfig } from '../appconfig';
import { C, FONT } from '../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
const PRIORITIES=[{k:'low',t:'کم'},{k:'medium',t:'متوسط'},{k:'high',t:'زیاد'}],ABONEMAN='بدهی آبونمان';
export default function NoticeScreen({route,navigation}){const{driver,preset}=route.params;const[reasons,setReasons]=useState([]),[reasonId,setReasonId]=useState(null),[body,setBody]=useState(''),[priority,setPriority]=useState('medium'),[img,setImg]=useState(null),[cfg,setCfg]=useState({notice_require_photo:false,notice_camera_only:true,notice_sms_enabled:false,can_send_sms:false}),[sendSms,setSendSms]=useState(false),[sendBot,setSendBot]=useState(false);const isAboneman=preset===ABONEMAN;const enabled=v=>v===true||v===1||String(v).toLowerCase()==='true'||String(v)==='1'||String(v)==='فعال';const loadConfig=useCallback(()=>{getAppConfig(true).then(c=>setCfg(c||{})).catch(()=>{});},[]);useFocusEffect(useCallback(()=>{loadConfig();},[loadConfig]));useEffect(()=>{request('/notice-reasons').then(rs=>{setReasons(rs);if(preset){const m=rs.find(r=>r.title===preset);if(m)setReasonId(m.id);}}).catch(()=>setReasons([]));if(isAboneman)setPriority('medium');},[]);
async function pickFromCamera(){const perm=await ImagePicker.requestCameraPermissionsAsync();if(!perm.granted)return Alert.alert('دسترسی','دسترسی به دوربین لازم است.');const res=await launchCamera({quality:0.8});if(res.canceled)return;const a=res.assets[0];setImg({name:a.fileName||'photo.jpg',uri:a.uri,type:a.mimeType||'image/jpeg'});}
async function pickFromGallery(){const perm=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!perm.granted)return Alert.alert('دسترسی','دسترسی به گالری لازم است.');const res=await launchLibrary({mediaTypes:ImagePicker.MediaTypeOptions.Images,quality:0.8});if(res.canceled)return;const a=res.assets[0];setImg({name:a.fileName||'photo.jpg',uri:a.uri,type:a.mimeType||'image/jpeg'});}
function addImage(){if(enabled(cfg.notice_camera_only)){pickFromCamera();return;}Alert.alert('افزودن تصویر','منبع تصویر را انتخاب کنید',[{text:'دوربین',onPress:pickFromCamera},{text:'گالری',onPress:pickFromGallery},{text:'انصراف',style:'cancel'}]);}
async function submit(){if(!reasonId)return Alert.alert('توجه','دلیل تذکر را انتخاب کنید.');if(enabled(cfg.notice_require_photo)&&!img)return Alert.alert('توجه','پیوست عکس برای ثبت تذکر الزامی است.');try{let r;const fields={driver_id:driver.id,reason_id:reasonId||'',priority,body,send_sms:sendSms&&enabled(cfg.notice_sms_enabled)&&enabled(cfg.can_send_sms)?'1':'0'};if(img?.uri){const attachmentData=await compressToDataUri(img.uri);if(!attachmentData||!attachmentData.startsWith('data:image/'))throw new Error('آماده‌سازی تصویر تذکر ناموفق بود. تصویر را دوباره ثبت کنید.');r=await request('/notices',{method:'POST',body:{...fields,send_bot:sendBot&&enabled(cfg.can_send_messenger)&&cfg.notice_bot_enabled!==false?'1':'0',attachment_name:String(img.name||'notice.jpg'),attachment_data:attachmentData},timeoutMs:60000,noStore:true});}else{r=await request('/notices',{method:'POST',body:{...fields,send_bot:sendBot&&enabled(cfg.can_send_messenger)&&cfg.notice_bot_enabled!==false?'1':'0'},timeoutMs:30000,noStore:true});}let msg='تذکر ثبت شد.';if(r.sms?.ok)msg+='\nپیامک برای راننده ارسال شد.';else if(r.sms_debug)msg+='\n\nعدم ارسال پیامک: '+r.sms_debug;else if(r.sms?.error)msg+='\n\nخطای پیامک: '+r.sms.error;Alert.alert('ثبت شد',msg);navigation.goBack();}catch(e){Alert.alert('خطا',e.message||'ثبت تذکر ناموفق بود.');}}
const showSmsBox=enabled(cfg.notice_sms_enabled)&&enabled(cfg.can_send_sms);
const chosenReason=reasons.find(r=>r.id===reasonId);
return <ScrollView persistentScrollbar={true} keyboardShouldPersistTaps="handled" style={{backgroundColor:C.paper}} contentContainerStyle={{padding:screenWidth<360?11:16,paddingBottom:56}}>
  <View style={s.header}><View style={s.headerIcon}><MaterialCommunityIcons name="note-edit-outline" size={25} color={C.brand}/></View><View style={s.headerText}><Text style={s.heading}>ثبت تذکر تاکسیران</Text><Text style={s.subtitle}>دلیل، اولویت و توضیحات تذکر را ثبت کنید</Text></View></View>
  <View style={s.card}>
    <View style={s.sectionHeading}><MaterialCommunityIcons name="format-list-bulleted" size={19} color={C.brand}/><Text style={s.sectionTitle}>دلیل تذکر</Text></View>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="انتخاب دلیل تذکر" disabled={isAboneman} style={[s.dropdown,isAboneman&&s.dropdownLocked]} onPress={()=>setReasonOpen(true)}><Text style={[s.dropdownText,!chosenReason&&{color:C.muted}]} numberOfLines={2}>{chosenReason?.title||'انتخاب دلیل تذکر'}</Text><MaterialCommunityIcons name={isAboneman?'lock-outline':'chevron-down'} size={22} color={C.brand}/></TouchableOpacity>
    {isAboneman&&<Text style={s.hint}>دلیل «بدهی آبونمان» و اولویت «متوسط» به‌صورت خودکار انتخاب شده‌اند.</Text>}
    <View style={s.sectionHeading}><MaterialCommunityIcons name="text-box-edit-outline" size={19} color={C.brand}/><Text style={s.sectionTitle}>متن تذکر</Text></View>
    <TextInput style={s.input} value={body} onChangeText={setBody} multiline placeholder="توضیحات تذکر را وارد کنید…" placeholderTextColor={C.muted}/>
    <View style={s.sectionHeading}><MaterialCommunityIcons name="flag-outline" size={19} color={C.brand}/><Text style={s.sectionTitle}>اولویت</Text></View>
    <View style={s.opts}>{PRIORITIES.map(p=>{const active=priority===p.k;return <TouchableOpacity key={p.k} disabled={isAboneman} onPress={()=>setPriority(p.k)} style={[s.opt,active&&s.optActive,isAboneman&&!active&&{opacity:.45}]}><MaterialCommunityIcons name={active?'radiobox-marked':'radiobox-blank'} size={17} color={active?C.taxiInk:C.muted}/><Text style={[s.optTxt,active&&{color:C.taxiInk}]}>{p.t}</Text></TouchableOpacity>})}</View>
  </View>
  <View style={s.card}>
    <View style={s.sectionHeading}><MaterialCommunityIcons name="camera-outline" size={20} color={C.brand}/><Text style={s.sectionTitle}>پیوست تصویر {enabled(cfg.notice_require_photo)?'(الزامی)':'(اختیاری)'}</Text></View>
    {enabled(cfg.notice_camera_only)&&<Text style={s.hint}>ثبت تصویر فقط از طریق دوربین مجاز است.</Text>}
    <TouchableOpacity style={s.attach} onPress={addImage}><MaterialCommunityIcons name={img?'camera-retake':'camera-plus-outline'} size={21} color={C.brand}/><Text style={s.attachTxt}>{img?'تصویر انتخاب شد؛ برای تعویض لمس کنید':'افزودن تصویر'}</Text></TouchableOpacity>
    {img&&<Image source={{uri:img.uri}} style={s.preview}/>}
  </View>
  {(enabled(cfg.can_send_messenger)&&cfg.notice_bot_enabled!==false||showSmsBox)&&<View style={s.card}>
    <View style={s.sectionHeading}><MaterialCommunityIcons name="send-outline" size={19} color={C.brand}/><Text style={s.sectionTitle}>اطلاع‌رسانی به راننده</Text></View>
    {enabled(cfg.can_send_messenger)&&cfg.notice_bot_enabled!==false&&<View style={s.smsRow}><View style={s.smsInfo}><MaterialCommunityIcons name="robot-outline" size={21} color={C.brand}/><Text style={s.smsTxt}>ارسال تذکر در ربات‌های متصل راننده</Text></View><Switch value={sendBot} onValueChange={setSendBot} trackColor={{true:'#3b5bd6'}}/></View>}
    {showSmsBox&&<View style={s.smsRow}><View style={s.smsInfo}><MaterialCommunityIcons name="message-text-outline" size={21} color={C.brand}/><Text style={s.smsTxt}>ارسال تذکر با پیامک به راننده</Text></View><Switch value={sendSms} onValueChange={setSendSms} trackColor={{true:C.brand}}/></View>}
  </View>}
  <TouchableOpacity style={s.btn} onPress={submit}><MaterialCommunityIcons name="content-save-check-outline" size={21} color="#fff"/><Text style={s.btnTxt}>ثبت تذکر</Text></TouchableOpacity>
  <Modal visible={reasonOpen&&!isAboneman} transparent animationType="fade" onRequestClose={()=>setReasonOpen(false)}>
    <View style={s.modalOverlay}><Pressable style={StyleSheet.absoluteFill} onPress={()=>setReasonOpen(false)}/><View style={s.modalSheet}>
      <View style={s.modalHeading}><Text style={s.modalTitle}>انتخاب دلیل تذکر</Text><TouchableOpacity accessibilityLabel="بستن" onPress={()=>setReasonOpen(false)}><MaterialCommunityIcons name="close" size={24} color={C.ink}/></TouchableOpacity></View>
      <ScrollView keyboardShouldPersistTaps="handled" style={{maxHeight:Math.min(440,screenWidth*1.3)}}>{reasons.length===0?<Text style={s.empty}>دلیلی برای انتخاب دریافت نشده است.</Text>:reasons.map(r=><TouchableOpacity key={r.id} style={[s.reasonOption,reasonId===r.id&&s.reasonSelected]} onPress={()=>{setReasonId(r.id);setReasonOpen(false)}}><Text style={s.reasonText}>{r.title}</Text><MaterialCommunityIcons name={reasonId===r.id?'check-circle':'circle-outline'} size={20} color={reasonId===r.id?C.brand:C.muted}/></TouchableOpacity>)}</ScrollView>
    </View></View>
  </Modal>
</ScrollView>}

const s=StyleSheet.create({
header:{flexDirection:'row-reverse',alignItems:'center',gap:11,marginBottom:13},
headerIcon:{width:48,height:48,borderRadius:15,backgroundColor:'#e6f4ed',alignItems:'center',justifyContent:'center'},
headerText:{flex:1,alignItems:'flex-end'},
heading:{fontFamily:FONT.bold,fontSize:17,color:C.ink,textAlign:'right'},
subtitle:{fontFamily:FONT.regular,fontSize:12,color:C.muted,textAlign:'right',marginTop:4},
card:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:18,padding:14,marginBottom:12,elevation:1},
sectionHeading:{flexDirection:'row-reverse',alignItems:'center',gap:7,marginBottom:10,marginTop:5},
sectionTitle:{fontFamily:FONT.bold,color:C.ink,fontSize:14,textAlign:'right'},
hint:{fontFamily:FONT.regular,color:C.brand,fontSize:11.5,marginTop:8,marginBottom:6,textAlign:'right',lineHeight:20},
dropdown:{borderColor:C.line,borderWidth:1,borderRadius:12,backgroundColor:'#f8fafb',paddingVertical:13,paddingHorizontal:12,minHeight:52,flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',gap:10},
dropdownLocked:{backgroundColor:'#f0f3f4'},
dropdownText:{flex:1,fontFamily:FONT.bold,fontSize:13,color:C.ink,textAlign:'right'},
input:{backgroundColor:'#f8fafb',borderColor:C.line,borderWidth:1,borderRadius:12,padding:13,minHeight:116,textAlign:'right',textAlignVertical:'top',fontFamily:FONT.regular,color:C.ink,marginBottom:12},
opts:{flexDirection:'row-reverse',gap:8},
opt:{flex:1,minWidth:0,borderColor:C.line,borderWidth:1,backgroundColor:'#f8fafb',borderRadius:11,minHeight:48,paddingHorizontal:6,alignItems:'center',justifyContent:'center',flexDirection:'row-reverse',gap:5},
optActive:{backgroundColor:C.taxi,borderColor:C.taxi},
optTxt:{fontFamily:FONT.bold,fontSize:12,color:C.ink},
attach:{backgroundColor:'#eaf5ef',borderColor:C.brand,borderWidth:1,borderRadius:13,padding:14,alignItems:'center',justifyContent:'center',flexDirection:'row-reverse',gap:8,minHeight:53},
attachTxt:{fontFamily:FONT.bold,color:C.brand,fontSize:13,textAlign:'center',flexShrink:1},
preview:{width:'100%',height:170,borderRadius:12,marginTop:10},
smsRow:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',gap:8,marginTop:7,backgroundColor:'#f2f7f5',borderRadius:12,padding:10,minHeight:55},
smsInfo:{flex:1,flexDirection:'row-reverse',alignItems:'center',gap:8},
smsTxt:{fontFamily:FONT.bold,color:C.ink,fontSize:12,flex:1,textAlign:'right'},
btn:{backgroundColor:C.brand,borderRadius:14,padding:15,alignItems:'center',justifyContent:'center',flexDirection:'row-reverse',gap:9,marginTop:5,minHeight:55},
btnTxt:{color:'#fff',fontFamily:FONT.bold,fontSize:15},
modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,.46)',justifyContent:'center',padding:20},
modalSheet:{backgroundColor:'#fff',borderRadius:20,padding:15,maxHeight:'80%'},
modalHeading:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',paddingBottom:12,borderBottomWidth:1,borderBottomColor:C.line},
modalTitle:{fontFamily:FONT.bold,fontSize:16,color:C.ink},
reasonOption:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between',paddingVertical:14,paddingHorizontal:10,borderBottomWidth:1,borderBottomColor:'#edf0f2',gap:10},
reasonSelected:{backgroundColor:'#eaf6f0',borderRadius:9},
reasonText:{fontFamily:FONT.regular,fontSize:13,color:C.ink,textAlign:'right',flex:1},
empty:{fontFamily:FONT.regular,color:C.muted,textAlign:'center',padding:20}
});