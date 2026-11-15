<?php

/** Security-exempt personnel keep device evidence but incur no GPS/internet-off work deductions. */
function work_deduction_security_exempt(int $userId): bool {
  if ($userId <= 0) return false;
  static $cache = [];
  if (array_key_exists($userId, $cache)) return $cache[$userId];
  try {
    $row = Db::one('SELECT security_exempt FROM users WHERE id=?', [$userId]);
    return $cache[$userId] = ((int)($row['security_exempt'] ?? 0) === 1);
  } catch (Throwable $e) {
    error_log('security exemption lookup failed: '.$e->getMessage());
    return false;
  }
}

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
 * Confirmed OFF state windows. A state-change event marks the START of an
 * outage, never evidence of 30 minutes preceding the event. Each completed
 * 30-minute block is counted only when a later explicit ON event or repeated
 * OFF checkpoint confirms the time elapsed. Unpaired single OFF events do
 * not create a deduction (legacy client safety).
 *
 * Accepts internet_off/internet_on and legacy offline/online aliases as well
 * as gps_off/gps_on. Results are clipped to the attendance interval.
 */
function work_confirmed_off_intervals(array $events, int $fromTs, int $toTs, string $offKind, string $onKind, int $interval=1800): array {
  if ($fromTs<=0 || $toTs<=$fromTs || $interval<=0) return [];
  $offKinds=$offKind==='internet_off'?['internet_off','offline']:[$offKind];
  $onKinds=$onKind==='internet_on'?['internet_on','online']:[$onKind];
  usort($events,static function($a,$b){
    $aTs=is_numeric($a['at']??null)?(int)$a['at']:strtotime((string)($a['at']??''));
    $bTs=is_numeric($b['at']??null)?(int)$b['at']:strtotime((string)($b['at']??''));
    return $aTs<=>$bTs;
  });
  $start=null;$lastOff=null;$ranges=[];
  foreach ($events as $event) {
    $ts=is_numeric($event['at']??null)?(int)$event['at']:strtotime((string)($event['at']??''));
    $kind=(string)($event['kind']??'');
    if(!$ts || $ts>$toTs+86400 || ($ts<$fromTs-86400))continue;
    if(in_array($kind,$offKinds,true)) {
      if($start===null)$start=$ts;
      $lastOff=$ts;
    } elseif(in_array($kind,$onKinds,true) && $start!==null) {
      $end=$start+intdiv(max(0,$ts-$start),$interval)*$interval;
      if($end>$start) {
        $begin=max($start,$fromTs);
        $limit=min($end,$toTs);
        $confirmed=$begin+intdiv(max(0,$limit-$begin),$interval)*$interval;
        if($confirmed>$begin)$ranges[]=[$begin,$confirmed];
      }
      $start=null;$lastOff=null;
    }
  }
  // No recovery yet: use only an OFF checkpoint beyond the start. Never
  // extrapolate a single OFF event to the present clock.
  if($start!==null && $lastOff!==null && $lastOff>$start) {
    $end=$start+intdiv($lastOff-$start,$interval)*$interval;
    if($end>$start) {
        $begin=max($start,$fromTs);
        $limit=min($end,$toTs);
        $confirmed=$begin+intdiv(max(0,$limit-$begin),$interval)*$interval;
        if($confirmed>$begin)$ranges[]=[$begin,$confirmed];
      }
  }
  $ranges=array_values(array_filter($ranges,static fn($r)=>$r[1]>$r[0]));
  usort($ranges,static fn($a,$b)=>$a[0]<=>$b[0]);
  $merged=[];
  foreach($ranges as $range){$last=count($merged)-1;if($last<0||$range[0]>$merged[$last][1])$merged[]=$range;else $merged[$last][1]=max($merged[$last][1],$range[1]);}
  return $merged;
}


/**
 * Administrative waivers never erase device GPS evidence.
 * Only an exact matched calculated deduction range can be waived.
 */
function gps_work_waiver_schema(): void {
  static $ready=false;
  if($ready)return;
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
  $ready=true;
}

/**
 * Subtract administrative waivers from confirmed GPS ranges BEFORE computing
 * worked minutes. A waiver may cover part of a calculated outage.
 * If waiver records cannot be read, do not levy an unverifiable penalty.
 */
function gps_work_effective_intervals(int $userId, array $ranges): array {
  if (!$ranges) return [];
  $start=min(array_column($ranges,0));
  $end=max(array_column($ranges,1));
  try {
    // Reads must not attempt CREATE TABLE on every attendance refresh.
    $waivers=Db::all("SELECT start_at,end_at FROM gps_work_waivers WHERE user_id=? AND end_at>? AND start_at<?",[
      $userId,date('Y-m-d H:i:s',$start),date('Y-m-d H:i:s',$end)
    ]);
  } catch (Throwable $e) {
    // No waiver table on older installations means no waiver records.
    if(in_array((string)$e->getCode(),['42S02','1146'],true))return $ranges;
    error_log('GPS work waiver evidence unavailable: '.$e->getMessage());
    return [];
  }
  $effective=[];
  foreach ($ranges as $range) {
    $parts=[$range];
    foreach ($waivers as $waiver) {
      $a=strtotime((string)($waiver['start_at']??''));
      $b=strtotime((string)($waiver['end_at']??''));
      if (!$a || !$b || $b<=$a) continue;
      $next=[];
      foreach ($parts as [$left,$right]) {
        if ($b<=$left || $a>=$right) { $next[]=[$left,$right]; continue; }
        if ($a>$left)$next[]=[$left,min($a,$right)];
        if ($b<$right)$next[]=[max($b,$left),$right];
      }
      $parts=$next;
    }
    foreach ($parts as $part) if ($part[1]>$part[0]) $effective[]=$part;
  }
  return $effective;
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
