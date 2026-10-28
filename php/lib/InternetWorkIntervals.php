<?php
/** Independent, evidence-based internet-off deductions; never change ShiftCalc shortage. */
function internet_work_enabled(): bool {
  try { $row=Db::one("SELECT value FROM app_settings WHERE `key`='internet_work_required'"); }
  catch(Throwable $e) { error_log('internet work setting unavailable: '.$e->getMessage()); return false; }
  if(!$row)return true;
  $v=json_decode((string)$row['value'],true);
  return !in_array($v,[false,0,'0','false','off','disabled','غیرفعال'],true);
}
function internet_work_waiver_schema(): void {
  static $ready=false;if($ready)return;
  Db::run("CREATE TABLE IF NOT EXISTS internet_work_waivers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,start_at DATETIME NOT NULL,end_at DATETIME NOT NULL,
    reason VARCHAR(500) NOT NULL,actor_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_internet_work_waiver(user_id,start_at,end_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $ready=true;
}
function internet_work_intervals(int $userId,int $fromTs,int $toTs): array {
  if(!internet_work_enabled()||$fromTs<=0||$toTs<=$fromTs)return [];
  require_once __DIR__.'/GpsWorkIntervals.php';
  try {
    $events=Db::all("SELECT kind,at FROM user_activity WHERE user_id=? AND kind='internet_off' AND at>=? AND at<=? ORDER BY at,id",[$userId,date('Y-m-d H:i:s',$fromTs-1800),date('Y-m-d H:i:s',$toTs)]);
    $ranges=gps_work_explicit_off_intervals(array_map(static fn($r)=>['kind'=>'gps_off','at'=>$r['at']],$events),$fromTs,$toTs,1800);
    return $ranges;
  } catch(Throwable $e) { error_log('internet work interval query failed: '.$e->getMessage());return []; }
}
function internet_work_daily_details(int $userId,array $attendanceRows): array {
  $ranges=[];
  foreach($attendanceRows as $row){
    $start=strtotime((string)($row['check_in']??''));$end=!empty($row['check_out'])?strtotime($row['check_out']):time();
    if(!$start||!$end||$end<=$start)continue;
    foreach(internet_work_intervals($userId,$start,$end) as $r)$ranges[]=$r;
  }
  usort($ranges,static fn($a,$b)=>$a[0]<=>$b[0]);
  $merged=[];
  foreach($ranges as $r){$last=count($merged)-1;if($last<0||$r[0]>$merged[$last][1])$merged[]=$r;else $merged[$last][1]=max($merged[$last][1],$r[1]);}
  $details=array_map(static fn($r)=>['start_at'=>date('Y-m-d H:i:s',$r[0]),'end_at'=>date('Y-m-d H:i:s',$r[1]),'minutes'=>(int)ceil(($r[1]-$r[0])/60),'reason_code'=>'internet_off','reason'=>'خاموشی اینترنت در حضور فعال','evidence'=>'رویداد صریح internet_off'], $merged);
  try {
    internet_work_waiver_schema();
    $waivers=Db::all('SELECT start_at,end_at FROM internet_work_waivers WHERE user_id=?',[$userId]);
    $details=array_values(array_filter($details,static function($d)use($waivers){foreach($waivers as $w)if((string)$w['start_at']===$d['start_at']&&(string)$w['end_at']===$d['end_at'])return false;return true;}));
  }catch(Throwable $e){error_log('internet work waivers unavailable: '.$e->getMessage());}
  return $details;
}
