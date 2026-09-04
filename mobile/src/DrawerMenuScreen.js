import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DrawerActions } from '@react-navigation/native';
import { C, FONT } from './theme';
import { useAuth } from './auth';
import { request } from './api';

const ITEMS = [
  ['Notifications', 'اعلان‌ها', '🔔'], ['Messages', 'پیام‌ها', '💬'], ['WorkSummary', 'کارکرد من', '📊'], ['SalarySlips', 'فیش‌های حقوقی من', '💵'], ['Profile', 'حساب کاربری', '👤'], ['Help', 'راهنمای برنامه، ورژن و اطلاعات سازنده', '❓'], ['ImportTimes', 'آخرین زمان‌های به‌روزرسانی', '🕒'],
];

export default function DrawerMenuScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [access, setAccess] = React.useState(null);
  React.useEffect(() => { let active=true; request('/personnel-vehicle-assets.php?op=access',{noStore:true}).then(r=>{if(active)setAccess(r||null);}).catch(()=>{if(active)setAccess(null);}); return()=>{active=false;}; },[user?.id,user?.role]);
  const vehicleAllowed=access?.vehicle_allowed===true;const motorcycleAllowed=access?.motorcycle_allowed===true;const checklistAllowed=access?.checklist_allowed===true;const assetType=access?.asset_type||'car';
  const go=screen=>{try{navigation?.navigate?.('Main',{screen});}catch(_){}requestAnimationFrame(()=>requestAnimationFrame(()=>{try{navigation?.dispatch?.(DrawerActions.closeDrawer());}catch(_){} }));};
  const onLogout=()=>Alert.alert('خروج از حساب','آیا مطمئن هستید می‌خواهید از حساب کاربری خارج شوید؟',[{text:'انصراف',style:'cancel'},{text:'خروج',style:'destructive',onPress:async()=>{try{navigation?.dispatch?.(DrawerActions.closeDrawer());}catch(_){}try{await logout();}catch(e){Alert.alert('خروج ممکن نیست',e.message||'خطا');}}}]);
  const vehicleItems=[];if(vehicleAllowed)vehicleItems.push(['PersonnelVehicleAsset','ویرایش اطلاعات خودرو','🚗']);if(motorcycleAllowed)vehicleItems.push(['PersonnelVehicleAssetMotorcycle','ویرایش اطلاعات موتورسیکلت','🏍️']);if(checklistAllowed)vehicleItems.push(['PersonnelVehicleChecklist','چک‌لیست خودرو و موتورسیکلت','☑️']);
  const items=[...ITEMS,...vehicleItems];
  return <View style={s.page}><View style={s.header}><Text style={s.brand}>خطیار</Text><Text style={s.title}>منوی برنامه</Text></View><ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>{items.map(([route,title,glyph])=><TouchableOpacity key={route} style={s.item} onPress={()=>go(route)} activeOpacity={0.82}><View style={s.icon}><Text style={s.iconText}>{glyph}</Text></View><View style={s.itemTextWrap}><Text style={s.itemText}>{title}</Text></View></TouchableOpacity>)}<TouchableOpacity style={[s.item,s.logoutItem]} onPress={onLogout} activeOpacity={0.82}><View style={[s.icon,s.logoutIcon]}><Text style={s.iconText}>🚪</Text></View><View style={s.itemTextWrap}><Text style={[s.itemText,s.logoutText]}>خروج از حساب</Text></View></TouchableOpacity></ScrollView></View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:C.paper,direction:'rtl'},header:{backgroundColor:C.brand,paddingTop:52,paddingHorizontal:20,paddingBottom:22,alignItems:'flex-end'},brand:{width:'100%',color:'#fff',fontFamily:FONT.bold,fontSize:25,textAlign:'right',writingDirection:'rtl'},title:{width:'100%',color:'#dcefe9',fontFamily:FONT.regular,fontSize:13,textAlign:'right',writingDirection:'rtl',marginTop:5},content:{padding:12,paddingBottom:30},item:{minHeight:54,width:'100%',backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:14,marginBottom:9,paddingHorizontal:13,flexDirection:'row-reverse',alignItems:'center'},icon:{width:38,height:38,borderRadius:11,backgroundColor:C.soft,alignItems:'center',justifyContent:'center',marginLeft:10},iconText:{color:C.brand,fontSize:18,fontFamily:FONT.bold,textAlign:'center'},itemTextWrap:{flex:1,minWidth:0,alignSelf:'stretch',alignItems:'flex-end',justifyContent:'center'},itemText:{width:'100%',color:C.ink,fontFamily:FONT.bold,fontSize:13,lineHeight:20,textAlign:'right',writingDirection:'rtl'},logoutItem:{marginTop:14,borderColor:'#e3403e'},logoutIcon:{backgroundColor:'#fde8e7'},logoutText:{color:'#e3403e'}});
