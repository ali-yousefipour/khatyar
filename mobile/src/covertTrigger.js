// مکانیزم سادهٔ رویداد برای تحریک گرفتن سلفی نامحسوس از هر جای برنامه
// (مثلاً هنگام زدن «ثبت حضور من»)
let listener = null;

export function onCovertTrigger(fn) {
  listener = fn;
  return () => { if (listener === fn) listener = null; };
}

// reason: 'checkin' | 'manual' | 'login' | 'periodic'
export function triggerCovertSelfie(reason = 'checkin') {
  if (typeof listener === 'function') {
    try { listener(reason); } catch (e) {}
  }
}
