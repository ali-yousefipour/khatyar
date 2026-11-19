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
function dashboard_discipline_batch($viewer,array $params): array {
  $tz=new DateTimeZone('Asia/Tehran');
  $today=new DateTimeImmutable('today',$tz);
  $days=(int)($params['days']??30);
  if(!in_array($days,[7,14,30],true)) Http::error('بازه نامعتبر است',422);
  $start=$today->modify("-$days days");$end=$today->modify('-1 day');
  $jalali=static function($d){[$y,$m,$day]=gregorian_to_jalali((int)$d->format('Y'),(int)$d->format('m'),(int)$d->format('d'));return sprintf('%04d-%02d-%02d',$y,$m,$day);};
  if(isset($params['from'])||isset($params['to'])){
    $parse=static function($value) use($tz){
      if(!is_string($value)||!preg_match('/^\d{4}-\d{2}-\d{2}$/D',$value)) Http::error('تاریخ نامعتبر است',422);
      $d=DateTimeImmutable::createFromFormat('!Y-m-d',$value,$tz);
      if(!$d||$d->format('Y-m-d')!==$value) Http::error('تاریخ نامعتبر است',422);
      return $d;
    };
    $start=$parse($params['from']??null);$end=$parse($params['to']??null);
    if($start>$end||$end>=$today||$start->diff($end)->days>30) Http::error('بازه باید حداکثر ۳۱ روز کامل و قبل از امروز باشد',422);
  }
  $from=$jalali($start);$to=$jalali($end);
  $scope=dashboard_discipline_scope($viewer);
  $where=$scope['where'];$args=$scope['args'];
    $cursor=filter_var($params['cursor']??0,FILTER_VALIDATE_INT,['options'=>['min_range'=>0]]);
  if($cursor===false)Http::error('شناسه صفحه نامعتبر است',422);
  $where.=" AND u.id>?";$args[]=$cursor;
  $people=Db::all("SELECT u.id,CONCAT_WS(' ',u.first_name,u.last_name) name,r.title role FROM users u JOIN roles r ON r.id=u.role_id WHERE $where ORDER BY u.id ASC LIMIT 3",$args);
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
    $audits=Db::all("SELECT punch_id,jdate,before_json,after_json FROM attendance_change_audit WHERE user_id=? AND jdate>=? AND jdate<=? AND action='punch_edit' AND punch_id IS NOT NULL ORDER BY id ASC",[$uid,$from,$to]);
    foreach($audits as $audit){
      $before=json_decode((string)$audit['before_json'],true)?:[];
      $after=json_decode((string)$audit['after_json'],true)?:[];
      foreach(['check_in','check_out'] as $side)if(array_key_exists($side,$after)&&($before[$side]??null)!==$after[$side]){$key=$audit['punch_id'].':'.$side;$edited[$key]=true;$detailKey=$key.':'.$audit['jdate'];$editDetails[$detailKey]=['key'=>$key,'date'=>$audit['jdate'],'side'=>$side,'before'=>isset($editDetails[$detailKey])?$editDetails[$detailKey]['before']:($before[$side]??null),'after'=>$after[$side]];}
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
        if(in_array('manual',$method,true)){$manual[$id]=true;$manualToday[$id]=['id'=>$id,'in'=>$p['in']??null,'out'=>$p['out']??null];}
        if(in_array('auto_close',$method,true)){$auto[$id]=true;$autoToday[$id]=true;}
        foreach($p['manual_provenance']??[] as $meta)if(($meta['source']??'')==='request'&&($meta['status']??'')==='approved'){$manual[$id]=true;$manualToday[$id]=['id'=>$id,'in'=>$p['in']??null,'out'=>$p['out']??null];}
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


// A single persistent cache and refresh lease per authorized dashboard scope.
// No attendance calculations are performed by the GET endpoint.
function dashboard_discipline_scope(array $viewer): array {
  $cfg=json_decode((string)(Db::one("SELECT value FROM app_settings WHERE `key`='dashboard_config'")['value']??''),true);
  $roleCfg=$cfg['roles'][(string)($viewer['role_id']??0)]??$cfg['default']??[];
  $where="u.is_active=1 AND u.presence_required=1 AND r.level NOT BETWEEN 1 AND 4";
  $args=[];$key='all';
  if(($roleCfg['zone_scope']??'all')==='own'){
    $zone=(int)_viewer_zone($viewer);
    if($zone<=0)Http::error('محدوده منطقه‌ای شما مشخص نشده است.',403);
    $key='zone:'.$zone;$where.=" AND u.zone_id=?";$args[]=$zone;
  }
  return ['key'=>$key,'where'=>$where,'args'=>$args];
}
function dashboard_discipline_cache_schema(): void {
  if(_db_table_exists_safe('dashboard_discipline_cache'))return;
  Db::run("CREATE TABLE IF NOT EXISTS dashboard_discipline_cache (
    scope_key VARCHAR(40) NOT NULL, slot VARCHAR(80) NOT NULL,
    from_g DATE NULL, to_g DATE NULL, payload LONGTEXT NULL,
    generated_at BIGINT UNSIGNED NOT NULL DEFAULT 0,
    started_at BIGINT UNSIGNED NOT NULL DEFAULT 0, job_json LONGTEXT NULL,
    PRIMARY KEY(scope_key,slot)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}
function dashboard_discipline_json($value): string {
  return json_encode($value,JSON_THROW_ON_ERROR|JSON_INVALID_UTF8_SUBSTITUTE|JSON_UNESCAPED_UNICODE);
}
function dashboard_discipline_day(string $g): string {
  [$y,$m,$d]=array_map('intval',explode('-',$g));
  [$jy,$jm,$jd]=gregorian_to_jalali($y,$m,$d);
  return sprintf('%04d-%02d-%02d',$jy,$jm,$jd);
}
function dashboard_discipline_period(array $params): array {
  $tz=new DateTimeZone('Asia/Tehran');$today=new DateTimeImmutable('today',$tz);
  if(isset($params['from'])||isset($params['to'])){
    $parse=static function($v)use($tz){
      if(!is_string($v)||!preg_match('/^\d{4}-\d{2}-\d{2}$/D',$v))Http::error('تاریخ نامعتبر است',422);
      $d=DateTimeImmutable::createFromFormat('!Y-m-d',$v,$tz);
      if(!$d||$d->format('Y-m-d')!==$v)Http::error('تاریخ نامعتبر است',422);
      return $d;
    };
    $a=$parse($params['from']??null);$b=$parse($params['to']??null);
    if($a>$b||$b>=$today||$a->diff($b)->days>30)Http::error('بازه باید حداکثر ۳۱ روز کامل و قبل از امروز باشد',422);
    return ['custom'=>true,'from'=>$a->format('Y-m-d'),'to'=>$b->format('Y-m-d'),'days'=>0];
  }
  $days=filter_var($params['days']??30,FILTER_VALIDATE_INT);
  if(!in_array($days,[7,14,30],true))Http::error('بازه نامعتبر است',422);
  return ['custom'=>false,'from'=>$today->modify('-'.$days.' days')->format('Y-m-d'),'to'=>$today->modify('-1 day')->format('Y-m-d'),'days'=>$days];
}
function dashboard_discipline_state(string $scope): array {
  return Db::one("SELECT started_at,generated_at,job_json FROM dashboard_discipline_cache WHERE scope_key=? AND slot='state'",[$scope])??[];
}
function dashboard_discipline_cooldown(int $started,int $now): int {
  return max(0,$started+86400-$now);
}
function dashboard_discipline_snapshot(array $raw,string $from,string $to,array $people): array {
  $inside=static function($date)use($from,$to){$d=str_replace('/','-',(string)$date);return $d>=$from&&$d<=$to;};
  $a=[];$b=[];
  foreach($raw['corrections']??[] as $row){
    $id=(int)$row['id'];if(!isset($people[$id]))continue;
    $details=array_values(array_filter($row['details']??[],fn($d)=>$inside($d['date']??'')));
    $manual=[];foreach($details as $d)foreach($d['manual']??[] as $k=>$m)$manual[$m['id']??($d['date'].':'.$k)]=true;
    $events=[];$edits=[];foreach($row['edits_detail']??[] as $k=>$e)if($inside($e['date']??'')){$events[]=$e;$edits[$e['key']??$k]=true;}
    $m=count($manual);$ed=count($edits);
    if($m+$ed)$a[]=$people[$id]+['manual'=>$m,'edits'=>$ed,'total'=>$m+$ed,'details'=>$details,'edits_detail'=>$events];
  }
  foreach($raw['irregular']??[] as $row){
    $id=(int)$row['id'];if(!isset($people[$id]))continue;
    $details=array_values(array_filter($row['details']??[],fn($d)=>$inside($d['date']??'')));
    $s=0;$l=0;$e=0;$ac=0;$n=0;
    foreach($details as $d){$s+=(int)$d['shortage'];$l+=(int)($d['late']>0);$e+=(int)($d['early']>0);$ac+=(int)$d['auto_close'];$n+=(int)($d['late']>0||$d['early']>0);}
    if($s+$l+$e+$ac)$b[]=$people[$id]+['shortage'=>$s,'late'=>$l,'early'=>$e,'auto_close'=>$ac,'irregular_days'=>$n,'details'=>$details];
  }
  return ['corrections'=>dashboard_discipline_rank($a,['total','edits','manual']),'irregular'=>dashboard_discipline_rank($b,['shortage','irregular_days','auto_close','late','early'])];
}
function dashboard_discipline_cache_meta(array $scope): array {
  $state=dashboard_discipline_state($scope['key']);$now=time();
  $job=json_decode((string)($state['job_json']??''),true);
  $remaining=dashboard_discipline_cooldown((int)($state['started_at']??0),$now);
  return ['server_now'=>$now,'next_refresh_at'=>(int)($state['started_at']??0)+86400,
    'can_refresh'=>$remaining===0,'remaining_seconds'=>$remaining,
    'job'=>$job?['id'=>$job['id'],'processed'=>(int)$job['processed'],'from'=>dashboard_discipline_day($job['from']),'to'=>dashboard_discipline_day($job['to'])]:null,
    'has_cache'=>false,'generated_at'=>null,'last_success_at'=>(int)($state['generated_at']??0)?:null];
}
function dashboard_discipline_cache_view(array $scope,array $period): array {
  $meta=dashboard_discipline_cache_meta($scope);
  if($period['custom']){
    $row=Db::one("SELECT from_g,to_g,payload,generated_at FROM dashboard_discipline_cache WHERE scope_key=? AND slot<>'state' AND from_g<=? AND to_g>=? AND payload IS NOT NULL ORDER BY generated_at DESC LIMIT 1",[$scope['key'],$period['from'],$period['to']]);
  }else{
    $row=Db::one("SELECT from_g,to_g,payload,generated_at FROM dashboard_discipline_cache WHERE scope_key=? AND slot='rolling'",[$scope['key']]);
    if($row){$end=new DateTimeImmutable($row['to_g'],new DateTimeZone('Asia/Tehran'));$period['to']=$row['to_g'];$period['from']=$end->modify('-'.($period['days']-1).' days')->format('Y-m-d');}
  }
  $from=dashboard_discipline_day($period['from']);$to=dashboard_discipline_day($period['to']);
  if(!$row)return $meta+['from'=>$from,'to'=>$to,'corrections'=>[],'irregular'=>[]];
  $raw=json_decode((string)$row['payload'],true,512,JSON_THROW_ON_ERROR);
  $people=[];foreach(Db::all("SELECT u.id,CONCAT_WS(' ',u.first_name,u.last_name) name,r.title role FROM users u JOIN roles r ON r.id=u.role_id WHERE ".$scope['where'],$scope['args']) as $p){$p['id']=(int)$p['id'];$people[$p['id']]=$p;}
  $rank=dashboard_discipline_snapshot($raw,$from,$to,$people);
  $ids=array_values(array_unique(array_merge(array_column($rank['corrections'],'id'),array_column($rank['irregular'],'id'))));
  if($ids){
    $marks=implode(',',array_fill(0,count($ids),'?'));$photos=[];
    foreach(Db::all("SELECT u.id,CASE WHEN u.photo_path IS NOT NULL AND u.photo_path<>'' THEN CONCAT('/api/media?path=',u.photo_path) ELSE u.photo END photo FROM users u JOIN roles r ON r.id=u.role_id WHERE ".$scope['where']." AND u.id IN ($marks)",array_merge($scope['args'],$ids)) as $p)$photos[(int)$p['id']]=$p['photo'];
    foreach(['corrections','irregular'] as $key){foreach($rank[$key] as &$p)$p['photo']=$photos[$p['id']]??null;unset($p);}
  }
  $meta['has_cache']=true;$meta['generated_at']=(int)$row['generated_at'];
  return $meta+['from'=>$from,'to'=>$to]+$rank;
}
function dashboard_discipline($viewer): array {
  $scope=dashboard_discipline_scope($viewer);$period=dashboard_discipline_period($_GET);
  dashboard_discipline_cache_schema();
  return dashboard_discipline_cache_view($scope,$period);
}
function dashboard_discipline_refresh(array $viewer,array $body): array {
  $scope=dashboard_discipline_scope($viewer);$period=dashboard_discipline_period($_GET);
  dashboard_discipline_cache_schema();
  $action=$body['action']??'start';
  if(!in_array($action,['start','step'],true))Http::error('عملیات نامعتبر است',422);
  $lock='kh:discipline:'.substr(hash('sha256',$scope['key']),0,40);
  if((int)(Db::one('SELECT GET_LOCK(?,0) acquired',[$lock])['acquired']??0)!==1)Http::error('به‌روزرسانی در حال اجراست؛ دوباره تلاش کنید.',409);
  try{
    Db::run("INSERT IGNORE INTO dashboard_discipline_cache(scope_key,slot) VALUES(?,'state')",[$scope['key']]);
    $state=dashboard_discipline_state($scope['key']);$now=time();
    $job=json_decode((string)($state['job_json']??''),true);
    $remaining=dashboard_discipline_cooldown((int)($state['started_at']??0),$now);
    if($action==='start'){
      if($job&&$remaining>0)return dashboard_discipline_cache_meta($scope);
      if($remaining>0)return dashboard_discipline_cache_meta($scope);
      $tz=new DateTimeZone('Asia/Tehran');$today=new DateTimeImmutable('today',$tz);
      $rollingFrom=$today->modify('-31 days')->format('Y-m-d');$rollingTo=$today->modify('-1 day')->format('Y-m-d');
      $historical=$period['custom']&&($period['from']<$rollingFrom||$period['to']>$rollingTo);
      $from=$historical?$period['from']:$rollingFrom;
      $to=$historical?$period['to']:$rollingTo;
      $job=['id'=>bin2hex(random_bytes(16)),'slot'=>$historical?'custom:'.$from.':'.$to:'rolling','from'=>$from,'to'=>$to,'cursor'=>0,'processed'=>0,'data'=>['corrections'=>[],'irregular'=>[]]];
      Db::run("UPDATE dashboard_discipline_cache SET started_at=?,job_json=? WHERE scope_key=? AND slot='state'",[$now,dashboard_discipline_json($job),$scope['key']]);
      return dashboard_discipline_cache_meta($scope);
    }
    if(!$job)return dashboard_discipline_cache_meta($scope);
    if(!is_string($body['job_id']??null)||!hash_equals($job['id'],$body['job_id']))Http::error('شناسه به‌روزرسانی منقضی شده است.',409);
    $batch=dashboard_discipline_batch($viewer,['from'=>$job['from'],'to'=>$job['to'],'cursor'=>$job['cursor']]);
    foreach(['corrections','irregular'] as $key)$job['data'][$key]=array_merge($job['data'][$key],$batch[$key]);
    $next=$batch['next_cursor']??null;
    if($next!==null){
      if((int)$next<=(int)$job['cursor'])throw new RuntimeException('discipline cursor did not advance');
      $job['cursor']=(int)$next;$job['processed']+=3;
      Db::run("UPDATE dashboard_discipline_cache SET job_json=? WHERE scope_key=? AND slot='state'",[dashboard_discipline_json($job),$scope['key']]);
    }else{
      $pdo=Db::pdo();$pdo->beginTransaction();
      try{
        $generated=time();
        Db::run("INSERT INTO dashboard_discipline_cache(scope_key,slot,from_g,to_g,payload,generated_at) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE from_g=VALUES(from_g),to_g=VALUES(to_g),payload=VALUES(payload),generated_at=VALUES(generated_at)",[$scope['key'],$job['slot'],$job['from'],$job['to'],dashboard_discipline_json($job['data']),$generated]);
        Db::run("UPDATE dashboard_discipline_cache SET job_json=NULL,generated_at=? WHERE scope_key=? AND slot='state'",[$generated,$scope['key']]);
        Db::run("DELETE FROM dashboard_discipline_cache WHERE scope_key=? AND slot LIKE 'custom:%' AND generated_at<?",[$scope['key'],$generated-90*86400]);
        $pdo->commit();
      }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    }
    return dashboard_discipline_cache_meta($scope);
  }finally{Db::one('SELECT RELEASE_LOCK(?) released',[$lock]);}
}
