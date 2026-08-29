import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DrawerActions } from '@react-navigation/native';
import { C, FONT } from './theme';

const ITEMS = [
  ['Dashboard', 'داشبورد'], ['Radio', 'بی‌سیم'], ['StationCapture', 'ثبت موقعیت و تصویر خطوط'], ['MyStations', 'ایستگاه‌های ثبت‌شده من'],
  ['LineVisitProgram', 'برنامه بازدید و پوشش خط'], ['MyDailyMission', 'مأموریت روزانه من'], ['PresentList', 'حاضرین در خط'], ['Reports', 'ارسال گزارش'],
  ['Requests', 'درخواست‌ها'], ['RequestInbox', 'تأیید درخواست‌ها'], ['WorkSummary', 'کارکرد من'], ['SalarySlips', 'فیش‌های حقوقی من'],
  ['Notifications', 'اعلان‌ها'], ['Messages', 'پیام‌ها'], ['Profile', 'حساب کاربری'], ['Help', 'راهنمای برنامه'],
];

export default function DrawerMenuScreen({ navigation }) {
  const go = screen => {
    try { navigation?.dispatch?.(DrawerActions.closeDrawer()); } catch (_) {}
    requestAnimationFrame(() => {
      try { navigation?.navigate?.('Main', { screen }); } catch (_) {}
    });
  };
  return <View style={s.page}>
    <View style={s.header}><Text style={s.brand}>خطیار</Text><Text style={s.title}>منوی برنامه</Text></View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {ITEMS.map(([route,title],i)=><TouchableOpacity key={route} style={[s.item,i===ITEMS.length-1&&s.helpItem]} onPress={()=>go(route)} activeOpacity={0.82}>
        <View style={s.icon}><Text style={s.iconText}>{route==='Radio'?'📻':route==='StationCapture'?'📍':route==='MyStations'?'🗺️':route==='Help'?'❓':'›'}</Text></View>
        <Text style={s.itemText}>{title}</Text>
      </TouchableOpacity>)}
    </ScrollView>
  </View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:C.paper,direction:'rtl'},header:{backgroundColor:C.brand,paddingTop:52,paddingHorizontal:20,paddingBottom:22},brand:{color:'#fff',fontFamily:FONT.bold,fontSize:25,textAlign:'right'},title:{color:'#dcefe9',fontFamily:FONT.regular,fontSize:13,textAlign:'right',marginTop:5},content:{padding:12,paddingBottom:30},item:{minHeight:52,backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:14,marginBottom:8,paddingHorizontal:13,flexDirection:'row-reverse',alignItems:'center',gap:10},icon:{width:34,height:34,borderRadius:10,backgroundColor:C.soft,alignItems:'center',justifyContent:'center'},iconText:{color:C.brand,fontSize:20,fontFamily:FONT.bold},itemText:{flex:1,color:C.ink,fontFamily:FONT.bold,fontSize:13,textAlign:'right'},helpItem:{marginTop:8,borderColor:C.brand}});
