<?php
date_default_timezone_set('Asia/Tehran');
set_error_handler(static function($severity,$message,$file,$line){ throw new ErrorException($message,0,$severity,$file,$line); });
class Http { static function error($message,$code=400){ throw new RuntimeException($message,$code); } }
function _ensure_requests_table(){}
class Db {
  static $policy=null,$rows=[],$request=null,$locked=1,$locks=[],$exclude=null;
  static function one($sql,$params=[]){
    if(str_contains($sql,'GET_LOCK')) { self::$locks[]='acquire'; return ['acquired'=>self::$locked]; }
    if(str_contains($sql,'RELEASE_LOCK')) { self::$locks[]='release'; return ['released'=>1]; }
    if(str_contains($sql,'FROM users')) return ['id'=>$params[0],'work_policy_id'=>self::$policy?9:null];
    if(str_contains($sql,'FROM work_policies')) return self::$policy;
    if(str_contains($sql,'FROM requests')) return self::$request;
    throw new LogicException('Unexpected query: '.$sql);
  }
  static function all($sql,$params=[]){
    if(!str_contains($sql,"status IN ('pending','approved')")||!str_contains($sql,'id<>?')) throw new LogicException('Quota query must exclude rejected/canceled/self');
    self::$exclude=$params[2]; return self::$rows;
  }
}
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$start=strpos($source,'function gregorian_to_jalali(');
$end=strpos($source,'function j_to_ts(',$start);
eval(str_replace('__DIR__',var_export(dirname(__DIR__).'/lib',true),substr($source,$start,$end-$start)));
$start=strpos($source,'function _req_active_work_policy(');
$end=strpos($source,'function _req_approver(',$start);
if($start===false||$end===false) throw new LogicException('Assigned policy enforcement is missing');
eval(str_replace('__DIR__',var_export(dirname(__DIR__).'/lib',true),substr($source,$start,$end-$start)));
function check($ok,$message){if(!$ok)throw new LogicException($message);}
function denied(callable $action,$message,$code=422){
  try{$action();}catch(RuntimeException $e){check($e->getCode()===$code,$message.' wrong status');return;}
  throw new LogicException($message.' was accepted');
}
function daily($from='1405-07-01',$to=null,$type='annual'){
  return ['type'=>$type,'unit'=>'daily','from_jdate'=>$from,'to_jdate'=>$to??$from];
}
function hourly($date='1405-07-01',$from='08:00',$to='09:00',$type='annual'){
  return ['type'=>$type,'unit'=>'hourly','the_date'=>$date,'from_time'=>$from,'to_time'=>$to];
}
function policy($config,$approve=false){return ['id'=>9,'config'=>$config,'apply_time_limit_on_approve'=>$approve];}
function validate($r,$config,$approve=false,$onApprove=false,$exclude=0,$now=null){
  _req_validate_work_policy(12,$r,policy($config,$onApprove),$approve,$exclude,$now??_req_policy_date('1405-06-31')->getTimestamp());
}

// Daily bounds, valid zero-as-unlimited caps, invalid dates, hourly bounds and payload duration.
denied(fn()=>validate(daily(),['annual'=>['daily'=>['min_days'=>2]]]),'daily minimum');
denied(fn()=>validate(daily('1405-07-01','1405-07-03'),['annual'=>['daily'=>['max_days'=>2]]]),'daily maximum');
validate(daily('1405-07-01','1405-07-02'),['annual'=>['daily'=>['min_days'=>2,'max_days'=>2,'month_cap'=>0]]]);
denied(fn()=>validate(daily('1405-07-31'),[]),'invalid Jalali day');
denied(fn()=>validate(daily('1405-07-02','1405-07-01'),[]),'reversed dates');
denied(fn()=>validate(hourly('1405-07-01','09:00','08:00'),[]),'reversed hours');
denied(fn()=>validate(hourly(),['annual'=>['hourly'=>['min_h'=>2]]]),'hourly minimum');
denied(fn()=>validate(hourly()+['minutes'=>0],['annual'=>['hourly'=>['max_m'=>30]]]),'client cannot forge minutes');
foreach(['sick','unpaid','mission'] as $type) denied(fn()=>validate(daily('1405-07-01','1405-07-03',$type),[$type=>['daily'=>['max_days'=>2]]]),$type.' maximum');
denied(fn()=>validate(hourly('1405-07-01','08:00','10:00','overtime'),['overtime'=>['max_h'=>1]]),'overtime maximum');

// Aggregate minute caps combine daily and hourly; count caps are separated by mode.
Db::$rows=[daily()+['minutes'=>480]];
denied(fn()=>validate(hourly(),['annual'=>['month_h'=>8]]),'combined monthly minutes');
validate(hourly(),['annual'=>['month_h'=>8,'allow_over_month'=>true]]);
denied(fn()=>validate(hourly(),['annual'=>['month_h'=>8,'allow_over_year'=>true]]),'year bypass must not bypass month');
validate(hourly(),['annual'=>['hourly'=>['month_cap'=>1]]]);
denied(fn()=>validate(daily('1405-07-02'),['annual'=>['daily'=>['month_cap'=>1]]]),'daily monthly count');
denied(fn()=>validate(daily('1405-08-01'),['annual'=>['daily'=>['year_cap'=>1]]]),'daily annual count');
denied(fn()=>validate(hourly(),['annual'=>['year_h'=>8]]),'annual minute cap');
validate(hourly(),['annual'=>['year_h'=>8,'allow_over_year'=>true]]);
Db::$rows=[['type'=>'manual','the_date'=>'1405-07-01']];
denied(fn()=>validate(['type'=>'manual','the_date'=>'1405-07-02'],['manual'=>['month_cap'=>1]]),'manual count');
Db::$rows=[hourly('1405-07-01','08:00','09:00','overtime')];
denied(fn()=>validate(hourly('1405-07-02','08:00','09:00','overtime'),['overtime'=>['year_cap'=>1]]),'overtime count');

// Split daily usage at Jalali month and year boundaries, including leap Esfand.
Db::$rows=[];
$span=_req_policy_span(daily('1405-06-31','1405-07-01'));
check($span['periods']['1405-06']===480&&$span['periods']['1405-07']===480&&$span['periods'][1405]===960,'month split');
validate(daily('1405-06-31','1405-07-01'),['annual'=>['month_h'=>8]]);
denied(fn()=>validate(daily('1405-06-31','1405-07-01'),['annual'=>['month_h'=>7]]),'second month cannot bypass cap');
$span=_req_policy_span(daily('1403-12-30','1404-01-01'));
check($span['periods'][1403]===480&&$span['periods'][1404]===480,'leap year split');
check(_req_policy_span(daily('۱۴۰۵/۷/۱'))['minutes']===480,'Persian date normalization');

// Tehran calendar-day deadlines; approval timing is conditional, all other caps still apply.
$end=_req_policy_date('1405-07-03')->setTime(23,59,59)->getTimestamp();
$config=['annual'=>['daily'=>['deadline_days'=>2,'deadline_dir'=>'after']]];
validate(daily(),$config,false,false,0,$end);
denied(fn()=>validate(daily(),$config,false,false,0,$end+1),'after deadline boundary');
validate(daily(),$config,true,false,0,$end+1);
denied(fn()=>validate(daily(),$config,true,true,0,$end+1),'approval deadline enabled');
denied(fn()=>validate(daily(),['annual'=>['daily'=>['min_days'=>2]]],true,false),'approval must still enforce length');
$deadline=_req_policy_date('1405-06-30')->setTime(23,59,59)->getTimestamp();
$config=['annual'=>['daily'=>['deadline_days'=>2,'deadline_dir'=>'before']]];
validate(daily(),$config,false,false,0,$deadline);
denied(fn()=>validate(daily(),$config,false,false,0,$deadline+1),'before deadline boundary');
validate(daily(),['annual'=>['daily'=>['deadline_days'=>0]]],false,false,0,_req_policy_date('1405-07-01')->setTime(23,59,59)->getTimestamp());

// Route guards: target requester (not approver), both decision paths, direct approval,
// no-policy fallback, quota locking/release, no writes on violations, no self double-count.
$writes=0;
$handler=static function($p,$b,$u)use(&$writes){$writes++;return ['ok'=>true];};
Db::$policy=policy(['annual'=>['daily'=>['max_days'=>1]]]);
Db::$policy['config']=json_encode(Db::$policy['config']);
$guard=_req_work_policy_handler('/api/my/requests',$handler);
denied(fn()=>$guard([],daily('1405-07-01','1405-07-02'),['id'=>12]),'self entry');
check($writes===0&&Db::$locks===['acquire','release'],'invalid request must not write and must release lock');
$guard=_req_work_policy_handler('/api/admin/requests',$handler);
denied(fn()=>$guard([],daily('1405-07-01','1405-07-02')+['user_id'=>12,'direct_approve'=>true],['id'=>99]),'admin direct approval');
Db::$policy=policy(['annual'=>['daily'=>['deadline_days'=>0]]]);
denied(fn()=>$guard([],daily('1400-01-01')+['user_id'=>12,'direct_approve'=>true],['id'=>99]),'direct approval must enforce submission deadline');
Db::$policy=policy(['annual'=>['daily'=>['max_days'=>1]]]);
Db::$request=daily('1405-07-01','1405-07-02')+['id'=>80,'user_id'=>12,'pending_on'=>99];
foreach(['/api/requests/{id}/decide'=>['decision'=>'approve'],'/api/admin/requests/{id}/decision'=>['status'=>'approved']] as $path=>$body){
  $guard=_req_work_policy_handler($path,$handler);
  denied(fn()=>$guard(['id'=>80],$body,['id'=>99]),$path);
  $guard(['id'=>80],$path==='/api/requests/{id}/decide'?['decision'=>'reject']:['status'=>'rejected'],['id'=>99]);
}
Db::$request=daily()+['id'=>80,'user_id'=>12,'pending_on'=>99];
$guard=_req_work_policy_handler('/api/requests/{id}/decide',$handler);
$guard(['id'=>80],['decision'=>'approve'],['id'=>99]);
check(Db::$exclude===80,'approval must exclude the request being approved');
Db::$locked=0;
denied(fn()=>$guard(['id'=>80],['decision'=>'approve'],['id'=>99]),'lock contention',409);
Db::$locked=1;Db::$policy=null;
$guard([],daily('1405-07-01','1405-07-03'),['id'=>12]);
check($writes===4,'legacy fallback and rejection remain callable');
Db::$policy=['id'=>9,'config'=>'{invalid'];
denied(fn()=>_req_active_work_policy(12),'invalid assigned config');
Db::$policy=policy(['annual'=>[]]);
Db::$request=daily()+['id'=>80,'user_id'=>12,'pending_on'=>99];
denied(fn()=>$guard(['id'=>80],['decision'=>'approve'],['id'=>98]),'approval permission',403);
$paths=['/api/my/requests','/api/admin/requests','/api/requests/{id}/decide','/api/admin/requests/{id}/decision'];
$routes=[];
foreach($paths as $path) $routes[]=['m'=>'POST','p'=>$path,'fn'=>$handler,'minLevel'=>3,'public'=>false];
$routes[]=['m'=>'GET','p'=>'/api/my/requests','fn'=>$handler];
$start=strpos($source,'foreach($routes as &$policyRoute)');
$end=strpos($source,'unset($policyRoute);',$start)+strlen('unset($policyRoute);');
eval(substr($source,$start,$end-$start));
foreach(array_slice($routes,0,4) as $route) check($route['fn']!==$handler&&$route['minLevel']===3&&!$route['public'],'guard registration and access levels');
check($routes[4]['fn']===$handler,'read-only route must remain unchanged');
echo "PASS: assigned policy request limits, boundaries, approval paths and quota locking\n";
