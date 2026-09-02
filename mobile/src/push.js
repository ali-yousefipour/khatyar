import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { request } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true,
  }),
});

// ثبت دستگاه برای دریافت Push و ارسال توکن به سرور
export async function registerPush() {
  if (!Device.isDevice) return null;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const r = await Notifications.requestPermissionsAsync();
    status = r.status;
  }
  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'هشدارها',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'notification_new.mp3',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });

    await Notifications.setNotificationChannelAsync('messages', {
      name: 'پیام‌های جدید',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'message_new.mp3',
      vibrationPattern: [0, 250, 150, 250],
      enableVibrate: true,
    });
    await Notifications.setNotificationChannelAsync('reports', {
      name: 'گزارش‌های جدید',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'report_received.mp3',
      vibrationPattern: [0, 250, 150, 250],
      enableVibrate: true,
    });
    await Notifications.setNotificationChannelAsync('presence_alarm', {
      name: 'هشدار صحت‌سنجی حضور',
      description: 'هشدار فوری صحت‌سنجی حضور با صدا و لرزش، حتی هنگام خاموش بودن صفحه',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'presence_validation_alert.mp3',
      vibrationPattern: [0, 700, 300, 700, 300, 1000],
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
    await Notifications.setNotificationChannelAsync('radio_alert', {
      name: 'پیج بی‌سیم',
      description: 'هشدار دریافت پیام صوتی بی‌سیم، حتی هنگام خاموش بودن صفحه',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'radio_call_alert.wav',
      vibrationPattern: [0, 400, 200, 400],
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  }
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  try {
    await request('/devices/push-token', { method: 'POST', body: { token, platform: Platform.OS } });
  } catch {}
  return token;
}
