import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { openDrawer } from '../drawerControl';
import { FONT } from '../theme';

export default function DetailPageHeader({ title, navigation }) {
  return <View style={s.header}>
    <View style={s.shine} />
    <View style={s.shineSecondary} />
    <View style={s.row}>
      <TouchableOpacity activeOpacity={0.75} style={s.button} accessibilityRole="button" accessibilityLabel="باز کردن منو" onPress={openDrawer}>
        <MaterialCommunityIcons name="menu" size={25} color="#fff" />
      </TouchableOpacity>
      <View style={s.titleGroup}>
        <Image source={require('../../assets/icon.png')} style={s.brandLogo} accessibilityLabel="نشان خطیار" />
        <Text accessibilityRole="header" numberOfLines={2} style={s.title}>{title}</Text>
      </View>
      <TouchableOpacity activeOpacity={0.75} style={s.button} accessibilityRole="button" accessibilityLabel="بازگشت" onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Dashboard')}>
        <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
    <View pointerEvents="none" style={s.goldRule} />
  </View>;
}

const s = StyleSheet.create({
  header: { backgroundColor:'#075d4b', borderBottomWidth:2, borderBottomColor:'#d6b56c', paddingHorizontal:14, paddingTop:12, paddingBottom:17, overflow:'hidden', borderBottomLeftRadius:24, borderBottomRightRadius:24, elevation:3 },
  shine: { position:'absolute', top:-112, left:-35, width:245, height:165, backgroundColor:'rgba(43,209,153,.16)', borderRadius:105, transform:[{rotate:'-23deg'}] },
  shineSecondary: { position:'absolute', right:-95, bottom:-125, width:285, height:152, borderRadius:100, borderWidth:2, borderColor:'rgba(255,222,154,.25)', transform:[{rotate:'-16deg'}] },
  row: { flexDirection:'row-reverse', alignItems:'center', justifyContent:'space-between', gap:8 },
  button: { width:48, height:48, borderRadius:15, alignItems:'center', justifyContent:'center', backgroundColor:'rgba(255,255,255,.12)', borderWidth:1, borderColor:'rgba(255,255,255,.26)' },
  titleGroup: { flex:1, minWidth:0, flexDirection:'row-reverse', alignItems:'center', justifyContent:'center', gap:8 },
  brandLogo: { width:30, height:30, borderRadius:9 },
  title: { flexShrink:1, textAlign:'center', fontSize:19, lineHeight:29, fontFamily:FONT.bold, color:'#fff', writingDirection:'rtl' },
  goldRule: { position:'absolute', bottom:0, left:'30%', width:'40%', height:2, backgroundColor:'#efd391', borderTopLeftRadius:2, borderTopRightRadius:2 },
});
