<?php
// Dashboard rankings: completed days only; use the existing attendance engine.
function dashboard_discipline_minutes($v): int {
  if (is_string($v) && preg_match('/^(\d+):([0-5]\d)$/',$v,$m)) return (int)$m[1]*60+(int)$m[2];
  return is_numeric($v)?max(0,(int)$v):0;
}
function dashboard_discipline_rank(array $rows, array $keys): array {
  usort($rows,static function($a,$b) use($keys){
    foreach($keys as $k){$cmp=$b[$k]<=>$a[$k];if($cmp)return $cmp;}
    return $a['id']<=>$b['id'];
  });
  return array_slice($rows,0,10);
}
function dashboard_discipline($viewer): array {
  $tz=new DateTimeZone('Asia/Tehran');
  $today=new DateTimeImmutable('today',$tz);
  $days=(int)($_GET['days']??30);
  if(!in_array($days,[7,14,30],true)) Http::error('بازه نامعتبر است',422);
  $start=$today->modify("-$days days");$end=$today->modify('-1 day');
  $jalali=static function($d){[$y,$m,$day]=gregorian_to_jalali((int)$d->format('Y'),(int)$d->format('m'),(int)$d->format('d'));return sprintf('%04d-%02d-%02d',$y,$m,$day);};
  if(isset($_GET['from'])||isset($_GET['to'])){
    $parse=static function($value) use($tz){
      if(!is_string($value)||!preg_match('/^\d{4}-\d{2}-\d{2}$/D',$value)) Http::error('تاریخ نامعتبر است',422);
      $d=DateTimeImmutable::createFromFormat('!Y-m-d',$value,$tz);
      if(!$d||$d->format('Y-m-d')!==$value) Http::error('تاریخ نامعتبر است',422);
      return $d;
    };
    $start=$parse($_GET['from']??null);$end=$parse($_GET['to']??null);
    if($start>$end||$end>=$today||$start->diff($end)->days>30) Http::error('بازه باید حداکثر ۳۱ روز کامل و قبل از امروز باشد',422);
  }
  $from=$jalali($start);$to=$jalali($end);
  $cfg=json_decode((string)(Db::one("SELECT value FROM app_settings WHERE `key`='dashboard_config'")['value']??''),true);
  $roleCfg=$cfg['roles'][(string)($viewer['role_id']??0)]??$cfg['default']??[];
  $scope=$roleCfg['zone_scope']??'all';$args=[];
  $where="u.is_active=1 AND u.presence_required=1 AND r.level NOT BETWEEN 1 AND 4";
  if($scope==='own'){$zone=_viewer_zone($viewer);if(!$zone)return ['from'=>$from,'to'=>$to,'corrections'=>[],'irregular'=>[]];$where.=" AND u.zone_id=?";$args[]=$zone;}
    $cursor=filter_var($_GET['cursor']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0]]);
  if($cursor===false)Http::error('شناسه صفحه نامعتبر است',422);
  $where.=" AND u.id>?";$args[]=$cursor;
  $people=Db::all("SELECT u.id,CONCAT_WS(' ',u.first_name,u.last_name) name,r.title role,CASE WHEN u.photo_path IS NOT NULL AND u.photo_path<>'' THEN CONCAT('/api/media?path=',u.photo_path) ELSE u.photo END photo FROM users u JOIN roles r ON r.id=u.role_id WHERE $where ORDER BY u.id ASC LIMIT 3",$args);
  require_once __DIR__.'/../app/api/admin-attendance-report-owned.php';
  if(!_db_table_exists_safe('attendance_change_audit'))_attendance_change_audit_schema();
  $corrections=[];$irregular=[];
  foreach($people as $person){
    $uid=(int)$person['id'];$person['id']=$uid;
    try {
      $report=attendance_report_owned_by_entry_date($uid,$from,$to,false,false);
    } catch(Throwable $e) {
      error_log('dashboard-discipline report failed: '.get_class($e).' at '.basename($e->getFile()).':'.$e->getLine());
      throw $e;
    }
    $manual=[];$edited=[];$late=0;$early=0;$shortage=0;$auto=[];$irregularDays=0;$details=[];$editDetails=[];
    $audits=Db::all("SELECT punch_id,jdate,before_json,after_json FROM attendance_change_audit WHERE user_id=? AND jdate>=? AND jdate<=? AND action='punch_edit' AND punch_id IS NOT NULL",[$uid,$from,$to]);
    foreach($audits as $audit){
      $before=json_decode((string)$audit['before_json'],true)?:[];
      $after=json_decode((string)$audit['after_json'],true)?:[];
      foreach(['check_in','check_out'] as $side)if(array_key_exists($side,$after)&&($before[$side]??null)!==$after[$side]){$key=$audit['punch_id'].':'.$side;$edited[$key]=true;$editDetails[$key]=['date'=>$audit['jdate'],'side'=>$side,'before'=>$before[$side]??null,'after'=>$after[$side]];}
    }
    foreach($report['days']??[] as $day){
      if(!empty($day['outside_employment_period'])||!empty($day['is_future']))continue;
      $mission=dashboard_discipline_minutes($day['mission']??0);
      $leave=$mission;
      foreach(['annual_leave','sick_leave','unpaid_leave'] as $k)$leave+=dashboard_discipline_minutes($day[$k]??0);
      $def=max(0,dashboard_discipline_minutes($day['shortage']??0)-$mission);
      $shortage+=$def;
      // On approved leave/mission days avoid attributing an excused arrival/departure to misconduct.
      $l=$leave===0&&dashboard_discipline_minutes($day['late_in']??0)>0;
      $e=$leave===0&&dashboard_discipline_minutes($day['early_out']??0)>0;
      $late+=(int)$l;$early+=(int)$e;$irregularDays+=(int)($l||$e);
      $manualToday=[];$autoToday=[];
      foreach($day['punches']??[] as $p){
        $id=(int)($p['id']??0);if(!$id)continue;
        $method=explode('|',(string)($p['method']??''));
        if(in_array('manual',$method,true)){$manual[$id]=true;$manualToday[$id]=['in'=>$p['in']??null,'out'=>$p['out']??null];}
        if(in_array('auto_close',$method,true)){$auto[$id]=true;$autoToday[$id]=true;}
        foreach($p['manual_provenance']??[] as $meta)if(($meta['source']??'')==='request'&&($meta['status']??'')==='approved'){$manual[$id]=true;$manualToday[$id]=['in'=>$p['in']??null,'out'=>$p['out']??null];}
      }
      if($def||$l||$e||$manualToday||$autoToday)$details[]=['date'=>$day['jdate']??'','shortage'=>$def,'late'=>$l?dashboard_discipline_minutes($day['late_in']):0,'early'=>$e?dashboard_discipline_minutes($day['early_out']):0,'manual'=>array_values($manualToday),'auto_close'=>count($autoToday)];
    }
    $m=count($manual);$ed=count($edited);$ac=count($auto);
    if($m+$ed>0)$corrections[]=$person+['manual'=>$m,'edits'=>$ed,'total'=>$m+$ed,'details'=>array_values(array_filter($details,fn($d)=>!empty($d['manual']))),'edits_detail'=>array_values($editDetails)];
    if($shortage+$late+$early+$ac>0)$irregular[]=$person+['shortage'=>$shortage,'late'=>$late,'early'=>$early,'auto_close'=>$ac,'irregular_days'=>$irregularDays,'details'=>array_values(array_filter($details,fn($d)=>$d['shortage']||$d['late']||$d['early']||$d['auto_close']))];
  }
  return ['from'=>$from,'to'=>$to,'next_cursor'=>count($people)===3?(int)end($people)['id']:null,'corrections'=>dashboard_discipline_rank($corrections,['total','edits','manual']),
    'irregular'=>dashboard_discipline_rank($irregular,['shortage','irregular_days','auto_close','late','early'])];
}
