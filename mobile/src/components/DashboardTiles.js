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
    activeOpacity={0.72}
    onPress={onPress}
    style={[styles.tool, { width }]}
  >
    <View style={styles.icon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <MaterialCommunityIcons name={icon} size={24} color={C.brand} />
    </View>
    <View style={styles.copy}>
      <Text style={styles.title}>{label}</Text>
      <Text style={styles.category}>{category}</Text>
    </View>
    {width >= 220 && <MaterialCommunityIcons name="chevron-left" size={18} color={C.slate} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />}
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
  tool: { minHeight: 92, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, padding: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  icon: { width: 36, height: 40, borderRadius: 10, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  copy: { flex: 1, minWidth: 0 },
  title: { fontFamily: FONT.bold, color: C.ink, fontSize: 14, lineHeight: 23, textAlign: 'right' },
  category: { fontFamily: FONT.regular, color: C.slate, fontSize: 12, textAlign: 'right', marginTop: 2 },
  metric: { minHeight: 94, padding: 14, borderBottomWidth: 1, borderColor: C.line },
  metricTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  value: { fontFamily: FONT.bold, fontSize: 26, color: C.ink, fontVariant: ['tabular-nums'] },
  metricLabel: { fontFamily: FONT.regular, fontSize: 13, color: C.slate, textAlign: 'right', marginTop: 6 },
});
