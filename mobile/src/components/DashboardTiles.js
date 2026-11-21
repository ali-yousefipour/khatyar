import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C, FONT } from '../theme';
import { faNum } from '../num';

export function DashboardTool({ label, icon, category, width, onPress, favorite = false, onToggleFavorite }) {
  const compact = Number(width) < 220;
  return <TouchableOpacity
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityHint="ورود به بخش انتخاب‌شده"
    activeOpacity={0.84}
    onPress={onPress}
    style={[styles.tool, compact && styles.compactTool, { width }]}
  >
    <View style={[styles.icon, compact && styles.compactIcon]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <MaterialCommunityIcons name={icon} size={26} color={C.brand} />
    </View>
    <View style={[styles.copy, compact && styles.compactCopy]}>
      <Text style={[styles.title, compact && styles.compactTitle]} allowFontScaling>{label}</Text>
      {category ? <Text style={styles.category} allowFontScaling>{category}</Text> : null}
    </View>
    {width >= 220 && <View style={styles.arrow}><MaterialCommunityIcons name="chevron-left" size={19} color={C.brand} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" /></View>}
    {onToggleFavorite && <TouchableOpacity accessibilityRole="button" accessibilityLabel={favorite ? `حذف ${label} از موارد دلخواه` : `افزودن ${label} به موارد دلخواه`} onPress={(e) => { e.stopPropagation(); onToggleFavorite(); }} style={[styles.favoriteButton, compact && styles.compactFavorite]} hitSlop={5}><MaterialCommunityIcons name={favorite ? 'star' : 'star-outline'} size={22} color={favorite ? '#e2a927' : C.slate}/></TouchableOpacity>}
    <View style={styles.toolAccent} />
  </TouchableOpacity>;
}

export function DashboardMetric({ label, value, icon, width }) {
  return <View accessible accessibilityLabel={label + '، ' + faNum(Number(value))} style={[styles.metric, { width }]}>
    <View style={styles.metricTop}>
      <MaterialCommunityIcons name={icon} size={22} color={C.brand} />
      <Text style={styles.value} allowFontScaling numberOfLines={1} adjustsFontSizeToFit>{faNum(Number(value))}</Text>
    </View>
    <Text style={styles.metricLabel} allowFontScaling={false} numberOfLines={2} ellipsizeMode="tail">{label}</Text>
    <View style={styles.metricAccent} />
  </View>;
}

const styles = StyleSheet.create({
  favoriteButton: { minWidth: 42, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#f4f8f6', flexShrink: 0 },
  tool: { minHeight: 104, borderRadius: 21, borderWidth: 1, borderColor: '#c5e9dd', backgroundColor: '#fff', padding: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, overflow:'hidden', elevation: 3, shadowColor: '#126a53', shadowOffset: {width:0,height:3}, shadowOpacity: 0.09, shadowRadius: 9 },
  compactTool: { minHeight: 116, paddingHorizontal: 10, paddingTop: 11, paddingBottom: 12, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 6 },
  compactIcon: { width: 40, height: 40, borderRadius: 13 },
  compactCopy: { flex: 0, width: '100%', alignItems: 'center', minHeight: 36 },
  compactTitle: { fontSize: 11.5, textAlign: 'center' },
  compactFavorite: { position: 'absolute', left: 5, top: 5, minWidth: 44, minHeight: 44, backgroundColor: 'transparent', zIndex: 1 },
  toolAccent: { position:'absolute', bottom:0, left:0, height:5, width:54, borderTopRightRadius:9, backgroundColor:'#12a36f' },
  icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#e0f5ec', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderWidth: 1, borderColor: '#c5e9dd' },
  arrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, justifyContent: 'center' },
  title: { fontFamily: FONT.bold, color: C.ink, fontSize: 13, textAlign: 'right', writingDirection: 'rtl', flexShrink: 1 },
  category: { fontFamily: FONT.regular, color: C.slate, fontSize: 12, textAlign: 'right', marginTop: 2 },
  metric: { minHeight: 112, padding: 15, paddingBottom:19, backgroundColor:'#fff', borderRadius:20, borderWidth:1,borderColor:'#c5e9dd', overflow:'hidden', elevation:2, shadowColor:'#126a53',shadowOpacity:0.08,shadowRadius:9 },
  metricAccent: { position:'absolute', bottom:0, left:12, right:12, height:4, borderRadius:4, backgroundColor:'#38c98b' },
  metricTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  value: { flexShrink: 1, fontFamily: FONT.bold, fontSize: 26, color: C.ink, fontVariant: ['tabular-nums'] },
  metricLabel: { fontFamily: FONT.regular, fontSize: 13, color: C.slate, textAlign: 'right', marginTop: 6, flexShrink: 1 },
});
