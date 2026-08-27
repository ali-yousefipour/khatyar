/**
 * درخواست از کاربر برای غیرفعال‌کردن بهینه‌سازی باتری اندروید برای این برنامه.
 * این کار احتمال Kill‌شدن برنامه توسط سیستم‌های مدیریت باتری (مثل DHA در گوشی‌های
 * سامسونگ) در پس‌زمینه را کم می‌کند و پایداری ثبت موقعیت/همگام‌سازی پس‌زمینه را
 * بهبود می‌دهد. فقط یک‌بار از کاربر پرسیده می‌شود (وضعیت در AsyncStorage ذخیره می‌شود).
 */
import { useEffect } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ASKED_KEY = '@battery_opt_asked_v1';

export default function BatteryOptimizationGate() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let cancelled = false;

    AsyncStorage.getItem(ASKED_KEY).then(async (val) => {
      if (cancelled || val === '1') return;
      // فقط یک‌بار از کاربر بپرس، حتی اگر گزینهٔ «بعداً» را انتخاب کند
      await AsyncStorage.setItem(ASKED_KEY, '1');

      Alert.alert(
        'بهینه‌سازی باتری',
        'برای عملکرد صحیح خطیار در پس‌زمینه (ثبت حضور و تردد)، پیشنهاد می‌شود این برنامه از بهینه‌سازی باتری مستثنا شود.',
        [
          { text: 'بعداً', style: 'cancel' },
          {
            text: 'باز کردن تنظیمات',
            onPress: async () => {
              try {
                await IntentLauncher.startActivityAsync('android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS');
              } catch (e) {
                try {
                  await IntentLauncher.startActivityAsync('android.settings.BATTERY_SAVER_SETTINGS');
                } catch (e2) {
                  try { Linking.openSettings(); } catch (e3) {}
                }
              }
            },
          },
        ],
        { cancelable: true }
      );
    }).catch(() => {});

    return () => { cancelled = true; };
  }, []);

  return null;
}
