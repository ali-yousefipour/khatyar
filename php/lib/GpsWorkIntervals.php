<?php

/**
 * Build work-deduction ranges only from explicit GPS-off records.
 * Each record covers at most one configured GPS polling interval ending at its timestamp;
 * missing checkpoints and app lifecycle events are not evidence by themselves.
 */
function gps_work_explicit_off_intervals(array $events, int $fromTs, int $toTs, int $interval = 1800, int $enabledAtTs = 0): array {
  if ($enabledAtTs > $fromTs) $fromTs = $enabledAtTs;
  if ($fromTs <= 0 || $toTs <= $fromTs || $interval <= 0) return [];

  $ranges = [];
  foreach ($events as $event) {
    if (($event['kind'] ?? '') !== 'gps_off') continue;
    $ts = is_numeric($event['at'] ?? null) ? (int)$event['at'] : strtotime((string)($event['at'] ?? ''));
    if (!$ts || $ts < $fromTs - $interval || $ts > $toTs) continue;
    $start = max($fromTs, $ts - $interval);
    $end = min($toTs, $ts);
    if ($end > $start) $ranges[] = [$start, $end];
  }

  usort($ranges, static fn($a,$b) => $a[0] <=> $b[0]);
  $merged = [];
  foreach ($ranges as $range) {
    $last = count($merged) - 1;
    if ($last < 0 || $range[0] > $merged[$last][1]) $merged[] = $range;
    else $merged[$last][1] = max($merged[$last][1], $range[1]);
  }
  return $merged;
}


/**
 * Administrative waivers never erase device GPS evidence.
 * Only an exact matched calculated deduction range can be waived.
 */
function gps_work_waiver_schema(): void {
  Db::run("CREATE TABLE IF NOT EXISTS gps_work_waivers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    reason VARCHAR(500) NOT NULL,
    actor_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_waiver (user_id,start_at,end_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}
function gps_work_waived_ranges(int $userId, string $day): array {
  gps_work_waiver_schema();
  return Db::all("SELECT start_at,end_at FROM gps_work_waivers WHERE user_id=? AND start_at>=? AND start_at<?",
    [$userId,$day.' 00:00:00',date('Y-m-d H:i:s',strtotime($day.' +1 day'))]);
}
function gps_work_is_waived(int $userId, string $start, string $end): bool {
  foreach(gps_work_waived_ranges($userId,substr($start,0,10)) as $w)
    if((string)$w['start_at']===$start && (string)$w['end_at']===$end)return true;
  return false;
}
