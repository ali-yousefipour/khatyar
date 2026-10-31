import React,{useEffect,useState,useRef} from 'react';
import {Alert,Modal,ScrollView,StyleSheet,Text,TouchableOpacity,View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {C,FONT} from '../theme';

const nativeAlert=Alert.alert.bind(Alert);
const category=title=>/خطا|ناموفق|مشکل|مسدود|مجاز نیست|اشتباه|نامعتبر/.test(title)?'error':/حذف|لغو|خروج|پاک|رد|هشدار|اخطار/.test(title)?'warning':/موفق|ثبت شد|انجام شد|ذخیره شد|تأیید شد/.test(title)?'success':'info';
const TYPES={error:{icon:'alert-circle-outline',tint:'#b42335',background:'#fff0f1'},warning:{icon:'alert-outline',tint:'#a65e00',background:'#fff7e7'},success:{icon:'check-circle-outline',tint:C.brand,background:'#eaf6f0'},info:{icon:'information-outline',tint:C.brand,background:'#eaf6f0'}};

// Keep the existing Alert.alert(title, message, buttons, options) contract for
// confirmation prompts throughout the app, including destructive actions.
export default function AppAlertHost(){
  const[current,setCurrent]=useState(null);
  const queue=useRef([]);
  useEffect(()=>{
    const show=(title,message,buttons,options)=>{
      if(typeof title!=='string')return nativeAlert(title,message,buttons,options);
      const entries=Array.isArray(buttons)&&buttons.length?buttons:[{text:'متوجه شدم'}];
      queue.current.push({title,message:String(message||''),buttons:entries,options:options||{}});
      setCurrent(prev=>prev||queue.current.shift());
    };
    try{Alert.alert=show;}catch(_){}
    return()=>{try{Alert.alert=nativeAlert;}catch(_){}queue.current=[]};
  },[]);
  const dismiss=(choice)=>{
    if(!current)return;
    const last=current;
    setCurrent(queue.current.shift()||null);
    if(choice){try{choice.onPress?.()}catch(e){nativeAlert('خطا',String(e?.message||e))}}
    else try{last.options?.onDismiss?.()}catch(_){}
  };
  const dismissible=current?.options?.cancelable!==false;
  const style=TYPES[category(current?.title||'')];
  return <Modal visible={!!current} transparent animationType="fade" statusBarTranslucent onRequestClose={()=>{if(dismissible)dismiss()}}>
    <View style={s.backdrop}><TouchableOpacity accessibilityRole="button" accessibilityLabel="بستن پیام" activeOpacity={1} style={StyleSheet.absoluteFill} onPress={()=>{if(dismissible)dismiss()}} disabled={!dismissible}/>
      <View style={s.card} accessibilityViewIsModal accessibilityRole="alert">
        <View style={[s.iconCircle,{backgroundColor:style.background}]}><MaterialCommunityIcons name={style.icon} size={30} color={style.tint}/></View>
        <Text style={s.title}>{current?.title||'پیام خطیار'}</Text>
        {current?.message?<ScrollView style={s.messageScroll} contentContainerStyle={s.messageContent}><Text style={s.message}>{current.message}</Text></ScrollView>:null}
        <View style={s.actions}>{(current?.buttons||[]).map((button,index)=>{
          const cancel=button.style==='cancel';const destructive=button.style==='destructive';
          return <TouchableOpacity key={index} accessibilityRole="button" style={[s.button,cancel?s.secondary:destructive?s.destructive:s.primary]} activeOpacity={0.8} onPress={()=>dismiss(button)}><Text style={[s.buttonText,cancel&&s.secondaryText]}>{button.text||'تأیید'}</Text></TouchableOpacity>;
        })}</View>
      </View>
    </View>
  </Modal>;
}
const s=StyleSheet.create({backdrop:{flex:1,backgroundColor:'rgba(11,27,46,.64)',justifyContent:'center',alignItems:'center',padding:20},card:{width:'100%',maxWidth:420,backgroundColor:'#fff',borderRadius:24,padding:22,alignItems:'center',elevation:12},iconCircle:{width:64,height:64,borderRadius:20,alignItems:'center',justifyContent:'center',marginBottom:14},title:{fontFamily:FONT.bold,fontSize:19,color:C.ink,textAlign:'center',lineHeight:30},messageScroll:{maxHeight:280,alignSelf:'stretch',marginTop:10},messageContent:{paddingVertical:4},message:{fontFamily:FONT.regular,fontSize:14,color:C.ink,textAlign:'center',lineHeight:25,writingDirection:'rtl'},actions:{width:'100%',flexDirection:'row-reverse',flexWrap:'wrap',gap:9,marginTop:20},button:{flex:1,minWidth:100,minHeight:50,borderRadius:14,alignItems:'center',justifyContent:'center',paddingHorizontal:12},primary:{backgroundColor:C.brand},secondary:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line},destructive:{backgroundColor:C.danger},buttonText:{fontFamily:FONT.bold,fontSize:14,color:'#fff',textAlign:'center'},secondaryText:{color:C.ink}});
