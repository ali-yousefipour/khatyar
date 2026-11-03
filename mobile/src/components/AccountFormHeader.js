import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C, FONT } from '../theme';

export default function AccountFormHeader({ section, title, description }) {
  return <View style={styles.card}>
    <Text style={styles.section}>{section}</Text>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#eef7f4', borderRadius: 20, padding: 18, marginBottom: 16 },
  section: { color: '#17634b', fontFamily: FONT.bold, fontSize: 13, textAlign: 'right' },
  title: { color: C.ink, fontFamily: FONT.bold, fontSize: 22, textAlign: 'right', marginVertical: 5 },
  description: { color: C.ink, fontFamily: FONT.regular, fontSize: 14, lineHeight: 23, textAlign: 'right' },
});
