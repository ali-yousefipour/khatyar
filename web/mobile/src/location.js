import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import Constants from 'expo-constants';
import { postOrQueue, request } from './api';
import { isVpnOn, vpnStatus } from './device';
import { getBatteryInfo } from './battery';
import { FEATURES } from './config';
import { isInShift } from './shiftCheck';
import { requestBackgroundLocationCompat } from './androidCompat';

export const BG_TASK = 'taxi-bg-location';

// گرفتن موقعیت دقیق: چند نمونه با بالاترین دقت می‌گیرد و دقیق‌ترین (کم‌خطاترین) را برمی‌گرداند.
// این روش لرزش/خطای موقعیت را کاهش می‌دهد و از موقعیت کش‌شدهٔ قدیمی استفاده نمی‌کند.
export async function getAccuratePosition({ samples = 3, timeoutMs = 8000, desiredAccuracy = 20 } = {}) {
  let best = null;
  for (let i = 0; i < samples; i++) {
    try {
      const p = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest, mayShowUserSettingsDialog: true }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs)),
      ]);
      if (p && p.coords) {
        const acc = p.coords.accuracy ?? 9999;
        if (!best || acc < (best.coords.accuracy ?? 9999)) best = p;
        // اگر به دقت دلخواه رسیدیم، زودتر تمام کن
        if (acc <= desiredAccuracy) break;
      }
    } catch (e) { /* نمونهٔ بعدی */ }
  }
  return best;
}

// گرفتن سریع موقعیت برای صفحه‌هایی مثل ثبت حضور:
// ۱) ابتدا آخرین موقعیت شناخته‌شده (فوری) ۲) سپس یک نمونهٔ متعادل با timeout کوتاه
// این روش از معطلی طولانی و خطای «دریافت موقعیت ناموفق» جلوگیری می‌کند.
export async function getFastPosition({ maxAgeMs = 60000, timeoutMs = 6000 } = {}) {
  // ۱) آخرین موقعیت کش‌شده فقط اگر تازه و نسبتاً دقیق باشد.
  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: maxAgeMs, requiredAccuracy: 80 });
    if (last && last.coords) {
      // در پس‌زمینه یک نمونهٔ تازه‌تر هم بگیر ولی منتظرش نمان
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest, mayShowUserSettingsDialog: true }).catch(() => {});
      return last;
    }
  } catch (e) {}
  // ۲) نمونهٔ متعادل با timeout کوتاه
  try {
    const p = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High, mayShowUserSettingsDialog: true }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs)),
    ]);
    if (p && p.coords) return p;
  } catch (e) {}
  // ۳) آخرین تلاش: هر موقعیت کش‌شده‌ای حتی قدیمی
  try {
    const any = await Location.getLastKnownPositionAsync({});
    if (any && any.coords) return any;
  } catch (e) {}
  return null;
}


// گرفتن موقعیت حدودی از آنتن GSM / شبکه (وقتی GPS خاموش است).
// دقت پایین استفاده می‌کند که از network provider (دکل‌های مخابراتی/Wi-Fi) موقعیت می‌گیرد.
// خروجی: { coords, viaGsm:true } یا null
export async function getGsmPosition({ timeoutMs = 7000 } = {}) {
  try {
    const p = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs)),
    ]);
    if (p && p.coords) return { coords: p.coords, timestamp: p.timestamp, viaGsm: true };
  } catch (e) {}
  // آخرین تلاش: موقعیت کش‌شده
  try {
    const any = await Location.getLastKnownPositionAsync({});
    if (any && any.coords) return { coords: any.coords, timestamp: any.timestamp, viaGsm: true };
  } catch (e) {}
  return null;
}

// گرفتن بهترین موقعیت ممکن برای رهگیری: ابتدا GPS، اگر نشد GSM/شبکه.
// همیشه فلگ via_gsm را برمی‌گرداند تا سرور بداند موقعیت دقیق است یا حدودی.
export async function getTrackingPosition() {
  // ۱) تلاش برای GPS سریع
  const gps = await getAccuratePosition({ samples: 3, timeoutMs: 8000, desiredAccuracy: 25 });
  if (gps && gps.coords && (gps.coords.accuracy == null || gps.coords.accuracy <= 80)) {
    return { lat: gps.coords.latitude, lng: gps.coords.longitude, acc: gps.coords.accuracy, viaGsm: false, ts: gps.timestamp };
  }
  // ۲) اگر GPS نبود یا دقتش خیلی پایین بود → GSM/شبکه
  const gsm = await getGsmPosition({ timeoutMs: 7000 });
  if (gsm && gsm.coords) {
    return { lat: gsm.coords.latitude, lng: gsm.coords.longitude, acc: gsm.coords.accuracy, viaGsm: true, ts: gsm.timestamp };
  }
  // ۳) اگر GPS با دقت پایین بود، همان را برگردان (بهتر از هیچ)
  if (gps && gps.coords) {
    return { lat: gps.coords.latitude, lng: gps.coords.longitude, acc: gps.coords.accuracy, viaGsm: true, ts: gps.timestamp };
  }
  return null;
}
const IS_EXPO_GO = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';

// تسک پس‌زمینه: موقعیت‌ها ارسال یا (آفلاین) در صف ذخیره می‌شوند
try {
  TaskManager.defineTask(BG_TASK, async ({ data, error }) => {
    if (error || !data) return;
    const { locations } = data;
    if (!locations || !locations.length) return;
    // اگر activity_mode=shift_only و الان خارج از شیفت هستیم، موقعیت ارسال نکن
    const inShift = await isInShift().catch(() => true);
    if (!inShift) return;
    const pings = locations.map((l) => ({
      lat: l.coords.latitude, lng: l.coords.longitude,
      captured_at: new Date(l.timestamp).toISOString(),
      mocked: !!(l.mocked || l.coords.mocked),
    }));
    let vpn = false, vpnCountry = null; try { const v = await vpnStatus(); vpn = v.on; vpnCountry = v.country; } catch (e) {}
    let battery = null; try { battery = await getBatteryInfo(); } catch (e) {}
    await postOrQueue('/locations', { vpn_on: vpn, vpn_country: vpnCountry, battery, pings }).catch(() => {});
  });
} catch (e) {}

let fgWatcher = null;
let networkFallbackInterval = null;
let trackingStartPromise = null;

export async function startTracking() {
  if (trackingStartPromise) return trackingStartPromise;
  trackingStartPromise = (async () => {
  let fg;
  try { fg = await Location.requestForegroundPermissionsAsync(); } catch (e) { return; }
  if (!fg || !fg.granted) return; // بدون مجوز، بی‌صدا صرف‌نظر می‌کنیم (اپ قفل نشود)

  // فاصلهٔ ارسال موقعیت از تنظیمات سرور (قابل تغییر توسط ادمین)؛ پیش‌فرض ۶۰ ثانیه
  let intervalMs = 60000;
  try {
    const cfg = await request('/app/version', { auth: false });
    const sec = parseInt(cfg && cfg.location_interval_sec, 10);
    if (sec && sec >= 5) intervalMs = sec * 1000;
  } catch (e) {}

  // صرفه‌جویی در باتری: وقتی شارژ گوشی خیلی کم است و به شارژر وصل نیست، فاصلهٔ ارسال
  // موقعیت را بیشتر می‌کنیم (نه اینکه کاملاً قطع شود) تا هم ردیابی ادامه یابد و هم
  // باتری سریع‌تر تمام نشود. با وصل‌شدن به شارژر یا افزایش شارژ، به حالت عادی برمی‌گردد.
  try {
    const batt = await getBatteryInfo();
    if (batt && !batt.charging) {
      if (batt.level <= 10) intervalMs = Math.round(intervalMs * 3);
      else if (batt.level <= 20) intervalMs = Math.round(intervalMs * 1.75);
    }
  } catch (e) {}

  // پیش‌زمینه (هنگام باز بودن اپ) — اگر watcher قبلی فعال است، ابتدا پاک می‌کنیم تا نشتی نشود
  try { if (fgWatcher && fgWatcher.remove) { fgWatcher.remove(); fgWatcher = null; } } catch (e) {}
  try {
    fgWatcher = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: Math.max(8000, Math.floor(intervalMs / 2)), distanceInterval: 20, mayShowUserSettingsDialog: true },
      async (pos) => {
        let vpn = false, vpnCountry = null; try { const v = await vpnStatus(); vpn = v.on; vpnCountry = v.country; } catch (e) {}
        // اگر دقت بسیار پایین بود (مثلاً GPS خاموش و موقعیت از شبکه/GSM آمده)، با فلگ via_gsm ارسال کن
        const viaGsm = (pos.coords.accuracy != null && pos.coords.accuracy > 80);
        postOrQueue('/locations', { vpn_on: vpn, vpn_country: vpnCountry, pings: [{
          lat: pos.coords.latitude, lng: pos.coords.longitude,
          captured_at: new Date(pos.timestamp).toISOString(),
          mocked: !!(pos.mocked || pos.coords.mocked),
          via_gsm: viaGsm, accuracy: pos.coords.accuracy, provider: viaGsm ? 'network' : 'gps',
        }] }).catch(() => {});
      }
    );
  } catch (e) {}

  // پینگ پشتیبان موقعیت شبکه در صورت در دسترس نبودن GPS: اگر GPS خاموش باشد و watchPosition چیزی نفرستد،
  // هر چند دقیقه موقعیت حدودی شبکه گرفته و به‌عنوان جایگزین روی نقشه و سایر بخش‌ها ارسال می‌شود (در نبود اینترنت در صف ذخیره می‌شود).
  try { if (networkFallbackInterval) { clearInterval(networkFallbackInterval); networkFallbackInterval = null; } } catch (e) {}
  networkFallbackInterval = setInterval(async () => {
    try {
      const inShift = await isInShift().catch(() => true);
      if (!inShift) return;
      const pos = await getTrackingPosition();
      if (!pos) return;
      let vpn = false; try { vpn = await isVpnOn(); } catch (e) {}
      postOrQueue('/locations', { vpn_on: vpn, pings: [{
        lat: pos.lat, lng: pos.lng,
        captured_at: new Date(pos.ts || Date.now()).toISOString(),
        via_gsm: pos.viaGsm, accuracy: pos.acc, provider: pos.viaGsm ? 'network' : 'gps',
      }] }).catch(() => {});
    } catch (e) {}
  }, Math.max(120000, intervalMs)); // حداقل هر ۲ دقیقه
  if (FEATURES.bgTracking && !IS_EXPO_GO) {
    try {
      const bg = await requestBackgroundLocationCompat(Location);
      if (bg.granted) {
        // اگر از اجرای قبلی ثبت مانده، ابتدا متوقف می‌کنیم تا سرویس پیش‌زمینه و ناتیفیکیشن
        // در هر بار باز شدن برنامه از نو ساخته شود (در غیر این صورت بعد از بستن/باز کردن دیده نمی‌شد)
        const running = await Location.hasStartedLocationUpdatesAsync(BG_TASK).catch(() => false);
        if (running) { try { await Location.stopLocationUpdatesAsync(BG_TASK); } catch (e) {} }
        {
          await Location.startLocationUpdatesAsync(BG_TASK, {
            // نکته سازگاری با گوشی‌های ضعیف: از Accuracy.Highest به Accuracy.High تغییر یافت.
            // برای ردیابیِ پیوسته و طولانی‌مدت (که این تابع انجام می‌دهد، برخلاف خواندن‌های
            // مقطعیِ getCurrentPositionAsync در جاهای دیگر همین فایل)، «Highest» فیوژن حسگرها
            // را هم به‌طور مداوم فعال می‌کند که مصرف CPU/باتری بیشتری دارد؛ «High» هم‌چنان
            // مبتنی بر GPS و با دقت مناسب (حدود ۱۰ متر) است و برای تأیید مسیر/خط کافی است.
            accuracy: Location.Accuracy.High,
            timeInterval: intervalMs,
            distanceInterval: 25,
            // نکته: قبلاً deferredUpdatesInterval هم تنظیم شده بود تا موقعیت‌ها به‌صورت
            // دسته‌ای (batched) ارسال شوند، اما همین مکانیزم انباشتِ دسته‌ای دقیقاً همان
            // مسیری از expo-location/expo-task-manager است که مطابق لاگ کرش واقعیِ گرفته‌شده
            // از یک گوشی قدیمی (خطای «You're trying to build a job with no constraints» در
            // TaskManagerUtils.createJobInfo، فراخوانی‌شده از LocationTaskConsumer.
            // reportLocationsImmediately) روی برخی گوشی‌ها/نسخه‌های اندروید (مخصوصاً سامسونگ‌های
            // قدیمی‌تر با محدودیت‌های سخت‌گیرانهٔ JobScheduler) کل برنامه را در همان لحظهٔ شروع
            // ردیابی کرش می‌دهد. با حذف deferredUpdatesInterval، موقعیت‌ها مستقیماً و بدون عبور
            // از مکانیزم صف‌بندی/ارسال دسته‌ایِ مبتنی بر JobScheduler به TaskManager.defineTask
            // در فایل location.js می‌رسند؛ یعنی همان تابع پرمشکل هرگز فراخوانی نمی‌شود.
            pausesUpdatesAutomatically: false,
            activityType: Location.ActivityType.AutomotiveNavigation,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: 'خطیار',
              notificationBody: 'نرم افزار خطیار فعال و به سرور متصل است',
              notificationColor: '#0d7a5f',
              killServiceOnDestroy: false,
            },
          });
        }
      }
    } catch (e) {}
  }
  })();
  try { return await trackingStartPromise; } finally { trackingStartPromise = null; }
}

// آیا ردیابی پس‌زمینه هم‌اکنون فعال است؟ (برای تصمیم‌گیریِ روشن/خاموش‌کردن بر اساس شیفت کاری)
export async function isTrackingActive() {
  if (IS_EXPO_GO) return !!fgWatcher;
  try { return await Location.hasStartedLocationUpdatesAsync(BG_TASK).catch(() => false); }
  catch (e) { return false; }
}

export async function stopTracking() {
  try { if (fgWatcher) { fgWatcher.remove(); fgWatcher = null; } } catch (e) {}
  try { if (networkFallbackInterval) { clearInterval(networkFallbackInterval); networkFallbackInterval = null; } } catch (e) {}
  if (IS_EXPO_GO) return;
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(BG_TASK).catch(() => false);
    if (running) await Location.stopLocationUpdatesAsync(BG_TASK);
  } catch (e) {}
}
