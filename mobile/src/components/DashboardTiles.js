import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C, FONT } from '../theme';
import { faNum } from '../num';

export function DashboardTool({ label, icon, category, width, onPress }) {
  return <TouchableOpacity
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityHint="ورود به بخش انتخاب‌شده"
    activeOpacity={0.84}
    onPress={onPress}
    style={[styles.tool, { width }]}
  >
    <View style={styles.icon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <MaterialCommunityIcons name={icon} size={26} color={C.brand} />
    </View>
    <View style={styles.copy}>
      <Text style={styles.title}>{label}</Text>
      <Text style={styles.category}>{category}</Text>
    </View>
    {width >= 220 && <View style={styles.arrow}><MaterialCommunityIcons name="chevron-left" size={19} color={C.brand} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" /></View>}
  </TouchableOpacity>;
}

export function DashboardMetric({ label, value, icon, width }) {
  return <View accessible accessibilityLabel={label + '، ' + faNum(Number(value))} style={[styles.metric, { width }]}>
    <View style={styles.metricTop}>
      <MaterialCommunityIcons name={icon} size={22} color={C.brand} />
      <Text style={styles.value}>{faNum(Number(value))}</Text>
    </View>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>;
}

const styles = StyleSheet.create({
  tool: { minHeight: 104, borderRadius: 20, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, padding: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, elevation: 2, shadowColor: '#16392D', shadowOffset: {width:0,height:3}, shadowOpacity: 0.08, shadowRadius: 9 },
  icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderWidth: 1, borderColor: C.line },
  arrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  title: { fontFamily: FONT.bold, color: C.ink, fontSize: 14, lineHeight: 23, textAlign: 'right' },
  category: { fontFamily: FONT.regular, color: C.slate, fontSize: 12, textAlign: 'right', marginTop: 2 },
  metric: { minHeight: 104, padding: 15, backgroundColor:C.card, borderRadius:18, borderWidth:1,borderColor:C.line, elevation:1, shadowColor:'#16392D',shadowOpacity:0.05,shadowRadius:7 },
  metricTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  value: { fontFamily: FONT.bold, fontSize: 26, color: C.ink, fontVariant: ['tabular-nums'] },
  metricLabel: { fontFamily: FONT.regular, fontSize: 13, color: C.slate, textAlign: 'right', marginTop: 6 },
});
