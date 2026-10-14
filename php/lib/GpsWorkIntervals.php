<?php

/**
 * Build work-deduction ranges only from explicit GPS-off records.
 * Each record covers at most one GPS polling interval ending at its timestamp;
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
