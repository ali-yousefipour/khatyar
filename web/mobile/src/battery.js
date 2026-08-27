// دریافت اطلاعات باتری برای ارسال به سرور (سطح شارژ و وضعیت شارژ)
let Battery = null;
try { Battery = require('expo-battery'); } catch (e) { Battery = null; }

// خروجی: { level: 0..100, charging: bool } یا null اگر در دسترس نبود
export async function getBatteryInfo() {
  if (!Battery) return null;
  try {
    const level = await Battery.getBatteryLevelAsync(); // 0..1
    let charging = false;
    try {
      const state = await Battery.getBatteryStateAsync();
      charging = (state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL);
    } catch (e) {}
    if (level == null || level < 0) return null;
    return { level: Math.round(level * 100), charging };
  } catch (e) {
    return null;
  }
}
