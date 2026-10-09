<?php
declare(strict_types=1);
date_default_timezone_set('UTC');

class Db {
  public static array $events = [];
  public static function one($sql, $params = []) {
    return ['value' => json_encode('2020-01-01 00:00:00')];
  }
  public static function all($sql, $params = []) {
    $from = strtotime((string)($params[1] ?? '1970-01-01 00:00:00'));
    $to = strtotime((string)($params[2] ?? '2999-01-01 00:00:00'));
    $rows = array_values(array_filter(self::$events, static function($e) use ($from, $to) {
      $ts = strtotime((string)($e['at'] ?? ''));
      return $ts && $ts >= $from && $ts <= $to;
    }));
    usort($rows, static function($a, $b) {
      $cmp = strcmp((string)$a['at'], (string)$b['at']);
      return $cmp !== 0 ? $cmp : ((int)($a['id'] ?? 0) <=> (int)($b['id'] ?? 0));
    });
    return $rows;
  }
}
function _gps_work_required() { return true; }

$path = dirname(__DIR__, 2) . '/php/lib/routes.php';
$source = file_get_contents($path);
$start = strpos($source, 'function _gps_work_invalid_intervals(');
$end = strpos($source, "\nroute('GET', '/api/my/app-config'", $start);
if ($start === false || $end === false) throw new RuntimeException('Unable to extract production GPS interval function');
eval(substr($source, $start, $end - $start));

function ev(string $kind, string $at, string $source): array {
  return ['kind'=>$kind,'at'=>$at,'meta'=>json_encode(['source'=>$source]),'id'=>0];
}
function minutes(array $ranges): int {
  $seconds = 0;
  foreach ($ranges as $r) $seconds += max(0, (int)$r[1] - (int)$r[0]);
  return (int)round($seconds / 60);
}
function runCase(string $name, array $events, string $from, string $to, int $expected, bool $pending=false): void {
  foreach ($events as $i => &$e) $e['id'] = $i + 1;
  unset($e);
  Db::$events = $events;
  $ranges = _gps_work_invalid_intervals(7, strtotime($from), strtotime($to), $pending);
  $got = minutes($ranges);
  if ($got !== $expected) {
    throw new RuntimeException("$name failed: expected {$expected} invalid minutes, got {$got}; " . json_encode($ranges));
  }
  echo "PASS {$name}: {$got} invalid minutes\n";
}

runCase(
  'force-stop for eight hours is not retroactively credited',
  [ev('gps_on','2026-10-09 09:00:00','attendance_checkin'), ev('gps_on','2026-10-09 17:00:00','attendance_checkout')],
  '2026-10-09 09:00:00','2026-10-09 17:00:00',480
);
runCase(
  'regular half-hour checkpoints credit the completed intervals',
  [
    ev('gps_on','2026-10-09 09:00:00','attendance_checkin'),
    ev('gps_on','2026-10-09 09:30:00','foreground_watchdog'),
    ev('gps_on','2026-10-09 10:00:00','foreground_watchdog'),
    ev('gps_on','2026-10-09 10:30:00','location_task_watchdog'),
    ev('gps_on','2026-10-09 11:00:00','attendance_checkout')
  ],
  '2026-10-09 09:00:00','2026-10-09 11:00:00',0
);
runCase(
  'a 40-minute checkpoint gap remains unverified',
  [
    ev('gps_on','2026-10-09 09:00:00','attendance_checkin'),
    ev('gps_on','2026-10-09 09:30:00','foreground_watchdog'),
    ev('gps_on','2026-10-09 10:10:00','foreground_watchdog'),
    ev('gps_on','2026-10-09 10:10:00','attendance_checkout')
  ],
  '2026-10-09 09:00:00','2026-10-09 10:10:00',40
);
runCase(
  'gps-off window is not revalidated when GPS turns on',
  [
    ev('gps_on','2026-10-09 09:00:00','attendance_checkin'),
    ev('gps_on','2026-10-09 09:30:00','foreground_watchdog'),
    ev('gps_off','2026-10-09 10:00:00','foreground_watchdog'),
    ev('gps_on','2026-10-09 10:30:00','foreground_watchdog'),
    ev('gps_on','2026-10-09 11:00:00','foreground_watchdog'),
    ev('gps_on','2026-10-09 11:30:00','attendance_checkout')
  ],
  '2026-10-09 09:00:00','2026-10-09 11:30:00',60
);
runCase(
  'open session keeps only the current incomplete interval in grace',
  [ev('gps_on','2026-10-09 09:00:00','attendance_checkin')],
  '2026-10-09 09:00:00','2026-10-09 09:10:00',0,true
);
runCase(
  'open session deducts a completed interval after a missed check',
  [ev('gps_on','2026-10-09 09:00:00','attendance_checkin')],
  '2026-10-09 09:00:00','2026-10-09 09:35:00',30,true
);
