import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { C, FONT } from './theme';
import { captureCrash, copyCrashReport, sendCrashReport } from './crashReporter';

// مرز خطا: اگر هر صفحه‌ای هنگام رندر کرش کند، به‌جای صفحهٔ سفید
// یک پیام فارسی با دکمهٔ تلاش مجدد نمایش داده می‌شود.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '', report: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, message: (error && error.message) || 'خطای ناشناخته' };
  }
  componentDidCatch(error, info) {
    // در صورت افزودن Crash Reporting (مثل Sentry) اینجا ارسال می‌شود
    try { console.error('UI crash:', error, info); } catch (e) {}
    captureCrash(error, { type: 'react-boundary', componentStack: info?.componentStack }).then(report => this.setState({ report }));
  }
  reset = () => this.setState({ hasError: false, message: '', report: null });
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={s.wrap}>
        <ScrollView contentContainerStyle={s.center}>
          <Text style={s.emoji}>⚠️</Text>
          <Text style={s.title}>مشکلی پیش آمد</Text>
          <Text style={s.msg}>صفحه با خطا مواجه شد. لطفاً دوباره تلاش کنید.</Text>
          <Text style={s.detail}>{this.state.message}</Text>
          {this.state.report && <>
          <TouchableOpacity style={s.btn} onPress={() => copyCrashReport(this.state.report)}><Text style={s.btnTxt}>کپی متن خطا</Text></TouchableOpacity>
          <TouchableOpacity style={[s.btn,{marginTop:8}]} onPress={() => sendCrashReport(this.state.report).catch(()=>{})}><Text style={s.btnTxt}>ارسال به سرور</Text></TouchableOpacity>
          </>}
          <TouchableOpacity style={[s.btn,{marginTop:8}]} onPress={this.reset}><Text style={s.btnTxt}>تلاش مجدد</Text></TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.paper },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontFamily: FONT.bold, color: C.ink, fontSize: 18, marginBottom: 8, textAlign: 'center' },
  msg: { fontFamily: FONT.regular, color: C.ink, fontSize: 14, textAlign: 'center', marginBottom: 12, lineHeight: 22 },
  detail: { fontFamily: FONT.regular, color: C.muted, fontSize: 12, textAlign: 'center', marginBottom: 20 },
  btn: { backgroundColor: C.brand, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28 },
  btnTxt: { fontFamily: FONT.bold, color: '#fff', fontSize: 15 },
});
