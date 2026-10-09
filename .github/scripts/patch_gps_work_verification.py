#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path.cwd()
ROUTES = ROOT / "php" / "lib" / "routes.php"
src = ROUTES.read_text(encoding="utf-8")

new_function = r'''function _gps_work_invalid_intervals($userId, $fromTs, $toTs, $gracePending=false) {
  $fromTs=(int)$fromTs; $toTs=(int)$toTs;
  $interval=1800;
  // تأخیر چند دقیقه‌ای JobScheduler قابل قبول است، ولی فاصلهٔ طولانی هرگز اعتبار
  // عقب‌گرد نمی‌گیرد؛ بازگشت بعد از Force Stop نمی‌تواند هشت ساعت را تأیید کند.
  $tolerance=300;
  if (!$fromTs || !$toTs || $toTs <= $fromTs || !_gps_work_required()) return [];

  try {
    $enabledRow=Db::one("SELECT value FROM app_settings WHERE `key`='gps_work_required_enabled_at'");
    $enabledValue=$enabledRow ? json_decode((string)$enabledRow['value'], true) : null;
    $enabledTs=$enabledValue ? strtotime((string)$enabledValue) : false;
    if ($enabledTs && $enabledTs>$fromTs) $fromTs=$enabledTs;
  } catch (Throwable $e) {}
  if ($toTs <= $fromTs) return [];

  $queryFrom=date('Y-m-d H:i:s', max(1,$fromTs-$interval-$tolerance));
  $queryTo=date('Y-m-d H:i:s', $toTs);
  try {
    // at را به‌صورت DATETIME می‌خوانیم و در PHP تبدیل می‌کنیم؛
    // UNIX_TIMESTAMP در MySQL می‌تواند با timezone پردازش PHP تفاوت داشته باشد.
    $events=Db::all("SELECT kind,at,meta FROM user_activity
      WHERE user_id=? AND at>=? AND at<=? AND kind IN ('gps_on','gps_off')
      ORDER BY at ASC,id ASC", [(int)$userId,$queryFrom,$queryTo]);
  } catch (Throwable $e) {
    error_log('gps work verification query failed: '.$e->getMessage());
    return [[$fromTs,$toTs]];
  }

  $covered=[]; $forcedInvalid=[]; $lastOnTs=null;
  foreach ($events as $event) {
    $ts=strtotime((string)($event['at']??''));
    if (!$ts) continue;
    $kind=(string)($event['kind']??'');
    $meta=json_decode((string)($event['meta']??''),true);
    $source=is_array($meta)?(string)($meta['source']??''):'';

    if ($kind==='gps_off') {
      // خاموشی صریح GPS بر هر checkpoint هم‌پوشان اولویت دارد.
      $a=max($fromTs,$ts-$interval); $b=min($toTs,$ts);
      if ($b>$a) $forcedInvalid[]=[$a,$b];
      $lastOnTs=null;
      continue;
    }
    if ($kind!=='gps_on') continue;

    // ورود فقط نقطهٔ شروع زنجیره است و به‌تنهایی بازهٔ بعد از ورود را ثابت نمی‌کند.
    if ($source==='attendance_checkin') {
      $lastOnTs=$ts;
      continue;
    }

    // فقط بررسی‌های واقعی GPS و موقعیت تأییدشده هنگام خروج را checkpoint بدان.
    // رویداد خروج پس از یک شکاف طولانی، بازهٔ قبلی را به‌صورت معکوس تأیید نمی‌کند.
    if (!in_array($source,['foreground_watchdog','location_task_watchdog','attendance_checkout'],true)) continue;

    if ($lastOnTs!==null && $ts>$lastOnTs) {
      $gap=$ts-$lastOnTs;
      if ($gap <= $interval+$tolerance) {
        // هر checkpoint حداکثر ۳۰ دقیقه اعتبار ایجاد می‌کند؛ چند دقیقه تأخیر
        // مجاز است اما همان تأخیر نیز به‌عنوان کارکرد تأییدشده شمرده نمی‌شود.
        $a=max($fromTs,$lastOnTs,$ts-$interval);
        $b=min($toTs,$ts);
        if ($b>$a) $covered[]=[$a,$b];
      }
    }
    // بعد از یک شکاف، این رویداد فقط مبنای بررسی بعدی است.
    $lastOnTs=$ts;
  }

  $merge=static function($ranges) {
    if (!$ranges) return [];
    usort($ranges,static fn($a,$b)=>(int)$a[0]<=>(int)$b[0]);
    $out=[];
    foreach($ranges as $range) {
      $a=(int)$range[0]; $b=(int)$range[1];
      if ($b<=$a) continue;
      $last=count($out)-1;
      if ($last<0 || $a>$out[$last][1]) $out[]=[$a,$b];
      else $out[$last][1]=max($out[$last][1],$b);
    }
    return $out;
  };
  $covered=$merge($covered);
  $forcedInvalid=$merge($forcedInvalid);

  // بازه‌های خاموشی را از پوشش احتمالی حذف می‌کنیم.
  if ($forcedInvalid && $covered) {
    $remaining=[];
    foreach($covered as $c) {
      $parts=[$c];
      foreach($forcedInvalid as $bad) {
        $next=[];
        foreach($parts as $p) {
          if ($bad[1]<=$p[0] || $bad[0]>=$p[1]) { $next[]=$p; continue; }
          if ($bad[0]>$p[0]) $next[]=[$p[0],min($bad[0],$p[1])];
          if ($bad[1]<$p[1]) $next[]=[max($bad[1],$p[0]),$p[1]];
        }
        $parts=$next;
        if (!$parts) break;
      }
      foreach($parts as $p) if($p[1]>$p[0]) $remaining[]=$p;
    }
    $covered=$merge($remaining);
  }

  // مکمل بازه‌های تأییدشده، کارکرد غیرقابل‌اعتبارسنجی است.
  $invalid=[]; $cursor=$fromTs;
  foreach($covered as $valid) {
    if ($valid[0]>$cursor) $invalid[]=[$cursor,$valid[0]];
    $cursor=max($cursor,$valid[1]);
  }
  if ($cursor<$toTs) $invalid[]=[$cursor,$toTs];

  // فقط نیم‌ساعتِ ناتمامِ جلسهٔ باز مهلت دارد. بازه‌های کاملِ جاافتاده و gps_off
  // بعد از این مرحله دوباره اعمال می‌شوند و از کسر کار حذف نمی‌شوند.
  if ($gracePending && $lastOnTs!==null && $toTs>$lastOnTs) {
    $completedSlots=(int)floor(($toTs-$lastOnTs)/$interval);
    $pendingStart=min($toTs,$lastOnTs+$completedSlots*$interval);
    if ($pendingStart<$toTs) {
      $trimmed=[];
      foreach($invalid as $bad) {
        $a=(int)$bad[0]; $b=(int)$bad[1];
        if ($b<=$pendingStart || $a>=$toTs) { $trimmed[]=$bad; continue; }
        if ($a<$pendingStart) $trimmed[]=[$a,$pendingStart];
      }
      $invalid=$trimmed;
    }
  }
  foreach($forcedInvalid as $bad) $invalid[]=$bad;
  return $merge($invalid);
}'''

start_marker = "function _gps_work_invalid_intervals("
end_marker = "\nroute('GET', '/api/my/app-config'"
start = src.find(start_marker)
end = src.find(end_marker, start + 1) if start >= 0 else -1
if start < 0 or end < 0:
    raise SystemExit("Could not uniquely locate _gps_work_invalid_intervals() in canonical php/lib/routes.php")
old_function = src[start:end]
if "validate consecutive GPS checkpoints" in old_function:
    raise SystemExit("GPS interval fix already appears to be applied; refusing duplicate patch")
src = src[:start] + new_function + src[end:]

daily_start = src.find("route('GET', '/api/my/daily-performance'")
daily_end = src.find("route('GET', '/api/my/shift-schedule'", daily_start)
if daily_start < 0 or daily_end < 0:
    raise SystemExit("Could not locate daily-performance route")
daily = src[daily_start:daily_end]
daywork_line = "  $w=ShiftCalc::dayWork($shift,$jdate,$dayRow,$sessions,ShiftCalc::effectiveHoliday($jdate));"
if daily.count(daywork_line) != 1:
    raise SystemExit("Expected a single daily-performance ShiftCalc::dayWork() call")
if "gps_invalid_min" in daily:
    raise SystemExit("GPS deduction diagnostics already exist in daily-performance route")
diagnostics = daywork_line + """
  $gpsInvalidSeconds=0;
  foreach($rows as $gpsRow) {
    foreach(($gpsRow['_gps_invalid']??[]) as $gpsRange) {
      $gpsA=(int)($gpsRange[0]??0); $gpsB=(int)($gpsRange[1]??0);
      if($gpsB>$gpsA) $gpsInvalidSeconds += $gpsB-$gpsA;
    }
  }
  $w['gps_work_required']=_gps_work_required();
  $w['gps_invalid_min']=(int)ceil(max(0,$gpsInvalidSeconds)/60);"""
daily = daily.replace(daywork_line, diagnostics, 1)
src = src[:daily_start] + daily + src[daily_end:]

ROUTES.write_text(src, encoding="utf-8")
print("Patched canonical routes.php")
print(f"GPS checkpoint function size: {len(new_function)} chars")
print("Added daily-performance gps_work_required and gps_invalid_min diagnostics")
