<?php
/** Regression for pending substitute reservation, approval, cancellation, and private calendar. */
declare(strict_types=1);
date_default_timezone_set('Asia/Tehran');
class Http { public static function error($m,$s=400):void {throw new RuntimeException((string)$m,(int)$s);} }
class Db {
 public static array $requests=[];
 public static array $locks=[];
 public static array $coverage=[];
 public static array $assignments=[];
 public static array $reservations=[];
 public static array $history=[];
 public static ?array $ownShifts=null;
 public static array $audit=[];
 public static array $released=[];
 public static int $assignmentReads=0;
 public static int $dayReads=0;
 public static array $coverReadArgs=[];
 public static int $auditReads=0;
 public static array $unqualified=[];
 public static array $absences=[];
 public static int $serial=1;
 public static function one($sql,$args=[]) {
  if(str_contains($sql,'GET_LOCK(')){self::$locks[(string)$args[0]]=true;return ['ok'=>1];}
  if(str_contains($sql,'RELEASE_LOCK(')){unset(self::$locks[(string)$args[0]]);return ['ok'=>1];}
  if(str_contains($sql,'can_be_substitute=1'))return in_array((int)$args[0],self::$unqualified,true)?null:['id'=>$args[0]];
  if(str_contains($sql,"type IN ('annual','sick','unpaid','mission')"))return in_array((int)$args[0],self::$absences,true)?['id'=>99]:null;
  if(str_contains($sql,'FROM requests WHERE id=?'))return self::$requests[(int)$args[0]]??null;
  if(str_contains($sql,'SELECT r.id,r.status FROM requests r')){
   [$sid,$except,$to,$from]=$args;
   $prior=count($args)>4?(int)$args[4]:null;
   foreach(self::$requests as $r){
    if((int)$r['id']===(int)$except || (int)($r['substitute_user_id']??0)!==(int)$sid)continue;
    if(!in_array($r['status'],['pending','approved'],true)||$r['type']!=='annual'||$r['unit']!=='daily')continue;
    if($r['from_jdate']>$to||$r['to_jdate']<$from)continue;
    if($prior!==null&&$r['status']!=='approved'&&$r['id']>=$prior)continue;
    return ['id'=>$r['id'],'status'=>$r['status']];
   }
   return null;
  }
  return null;
 }
 public static function all($sql,$args=[]){
  if(str_contains($sql,'SELECT id,user_id,from_jdate,to_jdate,the_date,status FROM requests WHERE substitute_user_id'))return array_values(array_filter(self::$requests,fn($r)=>(int)$r['substitute_user_id']===(int)$args[0]&&(int)$r['id']!==(int)$args[1]&&in_array($r['status'],['pending','approved'],true)));
  if(str_contains($sql,'FROM user_shifts us')){self::$assignmentReads++;if(self::$ownShifts===null&&in_array((int)$args[0],[42,43],true))return [];$rows=self::$ownShifts??[['shift_id'=>17,'title'=>'شیفت صبح نیروی مرخصی‌گیرنده','type'=>'advanced']];return array_map(fn($r)=>array_merge(['user_id'=>$args[0]],$r),$rows);}
  if(str_contains($sql,'FROM shift_days WHERE shift_id IN')){self::$dayReads++;return [['shift_id'=>17,'jdate'=>'1405-09-02','segments'=>[['s'=>'06:00','e'=>'14:00']],'is_off'=>0,'day_config'=>'{}'],['shift_id'=>17,'jdate'=>'1405-09-03','segments'=>[['s'=>'06:00','e'=>'14:00']],'is_off'=>0,'day_config'=>'{}']];}
  if(str_contains($sql,'FROM leave_reservation_audit a JOIN requests r'))return self::$released;
  if(str_contains($sql,'FROM leave_reservation_audit a')){self::$auditReads++;return self::$audit;}
  if(str_contains($sql,"r.status IN ('rejected','cancelled','canceled')"))return self::$history;

  if(str_contains($sql,"FROM requests r JOIN users u"))return self::$reservations;
  if(str_contains($sql,"FROM substitute_assignments sa")){
   self::$coverReadArgs=$args;
   return array_map(static function($row){
    $original=self::$requests[(int)($row['request_id']??0)]??[];
    return array_merge($row,[
     'from_jdate'=>$row['request_from_date']??$original['from_jdate']??$row['from_date'],
     'to_jdate'=>$row['request_to_date']??$original['to_jdate']??$row['to_date'],
     'the_date'=>null
    ]);
   },self::$assignments);
  }
  if(str_contains($sql,"FROM requests WHERE user_id=?"))return array_values(array_filter(self::$coverage,
   fn($r)=>$r['status']==='approved'&&$r['user_id']===$args[0]&&in_array($r['type'],['annual','sick'],true)));
  return [];
 }
}
function route($method,$path,$handler){global $routes;$routes[]=['m'=>$method,'p'=>$path,'fn'=>$handler];}
$routes=[];
route('POST','/api/my/requests',function($p,$b,$user){
 $id=Db::$serial++;
 Db::$requests[$id]=['id'=>$id,'user_id'=>$user['id'],'type'=>$b['type'],'unit'=>$b['unit'],
 'substitute_user_id'=>$b['substitute_user_id']??null,'from_jdate'=>$b['from_jdate'],'to_jdate'=>$b['to_jdate'],'status'=>'pending'];
 return ['id'=>$id];
});
route('GET','/api/my/substitutes',fn($p,$b,$user)=>['substitutes'=>[['id'=>42,'name'=>'نیروی آزمایشی','available'=>true],['id'=>43,'name'=>'دیگر','available'=>true]]]);
route('POST','/api/requests/{id}/decide',function($p,$b,$user){
 Db::$requests[(int)$p['id']]['status']=$b['status'];
 return ['ok'=>true];
});
route('PUT','/api/admin/requests/{id}',function($p,$body,$user){
 $id=(int)$p['id'];
 Db::$requests[$id]=array_replace(Db::$requests[$id],$body);
 return ['ok'=>true];
});
function _active_user_shift_assignment($uid,$day){return ['shift_id'=>17,'title'=>'شیفت صبح نیروی مرخصی‌گیرنده','type'=>'advanced'];}
function _shift_day_row($id,$day){return ['segments'=>[['s'=>'06:00','e'=>'14:00']],'day_config'=>['duty_min'=>480]];}
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$start=strpos($source,'function gregorian_to_jalali(');$end=strpos($source,'function j_to_ts(',$start);
eval(substr($source,$start,$end-$start));
require __DIR__.'/../lib/ShiftCalc.php';
function _db_table_exists_safe($table){return true;}
require __DIR__.'/../lib/LeaveSubstituteCoverage.php';
LeaveSubstituteCoverage::register($routes);
function runRoute($method,$path,$p=[],$b=[],$user=['id'=>5]){
 global $routes;
 foreach($routes as $r)if($r['m']===$method&&$r['p']===$path)return $r['fn']($p,$b,$user);
 throw new RuntimeException('route not registered: '.$method.' '.$path);
}
function check($valid,$message){if(!$valid)throw new RuntimeException($message);}
function conflict(callable $operation):void{
 try{$operation();}catch(RuntimeException $e){check($e->getCode()===409,'expected HTTP 409');return;}
 throw new RuntimeException('request incorrectly accepted');
}
$leave=['type'=>'annual','unit'=>'daily','from_jdate'=>'1405-09-01','to_jdate'=>'1405-09-03','substitute_user_id'=>42];
Db::$absences=[42];
conflict(fn()=>runRoute('POST','/api/my/requests',[],$leave));
Db::$absences=[];
Db::$unqualified=[42];
try{runRoute('POST','/api/my/requests',[],$leave);throw new LogicException('unqualified substitute accepted');}catch(RuntimeException $e){check($e->getCode()===422,'unqualified substitute rejected');}
Db::$unqualified=[];
$a=runRoute('POST','/api/my/requests',[],$leave);
check($a['id']===1,'first pending request created');
check(Db::$requests[1]['status']==='pending','no automatic approval');
check(!Db::$locks,'advisory lock released after request');
conflict(fn()=>runRoute('POST','/api/my/requests',[],$leave,['id'=>6]));
check(count(Db::$requests)===1,'second overlapping pending leave must not be stored');
$_GET=['from'=>'1405-09-02','to'=>'1405-09-02'];
$list=runRoute('GET','/api/my/substitutes');
check($list['substitutes'][0]['available']===false,'pending candidate flagged unavailable in picker');
check($list['substitutes'][1]['available']===true,'other candidates remain selectable');
Db::$absences=[43];
$list=runRoute('GET','/api/my/substitutes');
check($list['substitutes'][1]['available']===false,'approved absence removes candidate availability');
Db::$absences=[];
Db::$unqualified=[43];
$list=runRoute('GET','/api/my/substitutes');
check($list['substitutes'][1]['available']===false,'unqualified candidate cannot be selected');
Db::$unqualified=[];
$list=runRoute('GET','/api/my/substitutes',[],[],['id'=>43]);
check($list['substitutes'][1]['available']===false,'requester cannot select self');
$list=runRoute('GET','/api/my/substitutes');
check($list['substitutes'][1]['available']===true,'eligible candidate is restored');

$b=runRoute('POST','/api/my/requests',[],array_replace($leave,['from_jdate'=>'1405-09-04','to_jdate'=>'1405-09-05']),['id'=>6]);
check($b['id']===2,'non-overlapping leave allowed');
$c=runRoute('POST','/api/my/requests',[],array_replace($leave,['substitute_user_id'=>43]),['id'=>6]);
check($c['id']===3,'distinct substitute allowed');
runRoute('POST','/api/requests/{id}/decide',['id'=>1],['status'=>'rejected']);
$d=runRoute('POST','/api/my/requests',[],$leave,['id'=>6]);
check($d['id']===4,'rejected request releases pending reservation');
runRoute('POST','/api/requests/{id}/decide',['id'=>4],['status'=>'approved']);
conflict(fn()=>runRoute('POST','/api/my/requests',[],$leave,['id'=>7]));
check(!Db::$locks,'no locks remain after conflict');
Db::$requests[3]['status']='approved'; // Legacy approved case with another replacement.
conflict(fn()=>runRoute('PUT','/api/admin/requests/{id}',['id'=>3],['substitute_user_id'=>42]));
check(Db::$requests[3]['substitute_user_id']===43,'conflicting approved edit must roll back before write');
runRoute('PUT','/api/admin/requests/{id}',['id'=>3],['reason'=>'اصلاح توضیحات']);
check(!Db::$locks,'text-only approval edits must not retain a reservation lock');
runRoute('PUT','/api/admin/requests/{id}',['id'=>3],[
 'substitute_user_id'=>42,'from_jdate'=>'1405-09-06','to_jdate'=>'1405-09-07'
]);
check(Db::$requests[3]['substitute_user_id']===42,'non-overlapping substitute edit allowed');
Db::$coverage=[['id'=>12,'user_id'=>5,'type'=>'annual','unit'=>'daily','status'=>'approved','from_jdate'=>'1405-09-02','to_jdate'=>'1405-09-02','the_date'=>null,'from_time'=>null,'to_time'=>null],
['id'=>13,'user_id'=>5,'type'=>'annual','unit'=>'daily','status'=>'pending','from_jdate'=>'1405-09-03','to_jdate'=>'1405-09-03','the_date'=>null,'from_time'=>null,'to_time'=>null]];
Db::$assignments=[['request_id'=>4,'absent_name'=>'نیروی مرخصی‌گیرنده','absent_user_id'=>5,'from_date'=>'1405-09-02','to_date'=>'1405-09-02']];
$_GET=['dates'=>'1405-09-02,1405-09-03'];
$calendar=runRoute('GET','/api/my/shift-cover-status');
check(count($calendar['days']['1405-09-02']['leave'])===1,'approved leave shown');
check(!isset($calendar['days']['1405-09-03']['leave']),'pending leave does not display as approved');
check($calendar['days']['1405-09-02']['cover'][0]['absent_name']==='نیروی مرخصی‌گیرنده','replacement subject name returned');
check($calendar['days']['1405-09-02']['cover'][0]['shift']['title']==='شیفت صبح نیروی مرخصی‌گیرنده','shift belongs to absent employee');
check($calendar['days']['1405-09-02']['cover'][0]['shift']['segments'][0]['s']==='06:00','original shift hours returned');
Db::$reservations=[['id'=>99,'user_id'=>5,'from_jdate'=>'1405-09-03','to_jdate'=>'1405-09-03','absent_name'=>'آزمایشی']];
$calendar=runRoute('GET','/api/my/shift-cover-status');
check($calendar['days']['1405-09-03']['reservations'][0]['is_confirmed']===false,'pending reservation is explicitly advisory');
check(!isset($calendar['days']['1405-09-03']['cover']),'pending reservation never becomes confirmed cover');
echo "PASS pending substitute reservations, conflicts, release and approved-only calendar\n";

// Verify historical service-location semantics without relying on a mutable user profile.
$locationMethod=new ReflectionMethod(LeaveSubstituteCoverage::class,'attachServiceLocation');
$shiftWithSegments=['segments'=>[['s'=>'06:00','e'=>'14:00'],['s'=>'14:00','e'=>'22:00']],
 'line_id'=>null,'line_name'=>null,'service_location'=>null];
$unknown=$locationMethod->invoke(null,$shiftWithSegments,[]);
check($unknown['location_status']==='unrecorded'&&$unknown['line_id']===null,'missing historical location stays unknown');
$first=['line_id'=>10,'line_name'=>'خط ۱۰','service_location'=>'ایستگاه اول'];
$partial=$locationMethod->invoke(null,$shiftWithSegments,[0=>$first]);
check($partial['location_status']==='partial'&&$partial['line_id']===null,'partially verified shifts cannot invent a common line');
$both=$locationMethod->invoke(null,$shiftWithSegments,[0=>$first,1=>$first]);
check($both['location_status']==='verified'&&$both['line_id']===10&&count($both['segment_locations'])===2,'verified segment snapshots retain historical line');
$other=['line_id'=>11,'line_name'=>'خط ۱۱','service_location'=>'ایستگاه دوم'];
$different=$locationMethod->invoke(null,$shiftWithSegments,[0=>$first,1=>$other]);
check($different['location_status']==='verified'&&$different['line_id']===null&&$different['segment_locations'][1]['line_id']===11,'two verified distinct lines remain independent');
try{runRoute('PUT','/api/admin/substitute-calendar/service-location',[],['assignment_id'=>1,'line_id'=>10],['id'=>5]);throw new LogicException('ordinary user edited historical location');}
catch(RuntimeException $e){check($e->getCode()===403,'historical location edits are admin-only');}
echo "PASS historical service-location: unknown, partial, verified, independent segments and admin authorization\n";

$completionMethod=new ReflectionMethod(LeaveSubstituteCoverage::class,'completedByAttendance');
$epoch=strtotime(date('Y-m-d 00:00:00',ShiftCalc::jdateToTs('1405-09-02')));
$asClock=static fn(int $minutes):string=>date('Y-m-d H:i:s',$epoch+$minutes*60);
$attendance=[
 ['id'=>101,'check_in'=>$asClock(360),'check_out'=>$asClock(840),'method'=>'gps','line_id'=>10],
 ['id'=>102,'check_in'=>$asClock(840),'check_out'=>$asClock(1320),'method'=>'gps','line_id'=>11]
];
$checked=$completionMethod->invoke(null,'1405-09-02',$different,$attendance);
check($checked['completion_status']==='completed'&&count($checked['attendance_ids'])===2,'two verified independent shifts require both real sessions');
$gap=$attendance;$gap[1]['check_in']=$asClock(850);
check($completionMethod->invoke(null,'1405-09-02',$different,$gap)['completion_status']==='unverified','ten minute unworked gap cannot mark completion');
$wrongLine=$attendance;$wrongLine[1]['line_id']=10;
check($completionMethod->invoke(null,'1405-09-02',$different,$wrongLine)['completion_status']==='unverified','attendance in different verified line is insufficient');
$automatic=$attendance;$automatic[0]['method']='gps|auto_close';
check($completionMethod->invoke(null,'1405-09-02',$different,$automatic)['completion_status']==='unverified','auto-close is not fabricated physical checkout evidence');
check($completionMethod->invoke(null,'1405-09-02',null,$attendance)['completion_status']==='unverified','no shift is never declared complete');
echo "PASS attendance completion: actual closed sessions, gap, verified lines, no auto-close and unknown shift\n";



foreach(['/api/admin/substitute-calendar','/api/admin/substitute-calendar/users'] as $endpoint){
 try{runRoute('GET',$endpoint);throw new LogicException('unauthorized calendar access accepted');}
 catch(RuntimeException $e){check($e->getCode()===403,'admin calendar rejects ordinary user');}
}
$_GET=['dates'=>'invalid'];
try{LeaveSubstituteCoverage::status(5);throw new LogicException('invalid dates accepted');}
catch(RuntimeException $e){check($e->getCode()===422,'invalid dates rejected');}
echo "PASS admin calendar authorization and invalid dates\n";

$_GET=['dates'=>'1405-09-02,1405-09-03','user_id'=>'5','include_history'=>'1'];
Db::$history=[['id'=>101,'user_id'=>8,'status'=>'cancelled','from_jdate'=>'1405-09-03','to_jdate'=>'1405-09-03','absent_name'=>'سابقه لغوشده']];
Db::$audit=[['reservation_id'=>22,'request_id'=>4,'reserved_by_user_id'=>99,'reserved_by_name'=>'مسئول رزرو','reserved_at'=>'2026-11-26 10:00:00','event'=>'reserved']];
Db::$auditReads=0;
$admin=runRoute('GET','/api/admin/substitute-calendar',[],[],['id'=>99,'is_admin'=>1]);
check($admin['days']['1405-09-02']['cover'][0]['reserved_by_name']==='مسئول رزرو','authenticated reservation actor is included');
check(Db::$auditReads===1,'audit metadata is batched once for entire calendar');
check($admin['days']['1405-09-03']['history'][0]['is_confirmed']===false,'cancelled history never appears as confirmed');
check($admin['days']['1405-09-03']['history'][0]['shift']===null,'missing historic shift must not be reconstructed from current assignment');
$personal=runRoute('GET','/api/my/shift-cover-status');
check(!isset($personal['days']['1405-09-03']['history']),'personal API ignores history query parameter');
echo "PASS batched reservation actor metadata and admin-only cancelled history\n";

Db::$assignments[]=Db::$assignments[0];
$calendar=runRoute('GET','/api/my/shift-cover-status');
check(count($calendar['days']['1405-09-02']['cover'])===1,'legacy duplicate assignments do not duplicate a request/day');
echo "PASS duplicate confirmed assignments are displayed once\\n";
Db::$assignments[0]['request_from_date']='1405-09-03';
Db::$assignments[0]['request_to_date']='1405-09-03';
Db::$assignments[1]['request_from_date']='1405-09-03';
Db::$assignments[1]['request_to_date']='1405-09-03';
$calendar=runRoute('GET','/api/my/shift-cover-status');
check(!isset($calendar['days']['1405-09-02']['cover']),'expired leave dates cannot keep obsolete assignment effective');
foreach(Db::$assignments as &$assignment){unset($assignment['request_from_date'],$assignment['request_to_date']);}unset($assignment);
echo "PASS assignment and request date intersection excludes obsolete shifts\\n";

$segments=[['s'=>'06:00','e'=>'10:00'],['s'=>'14:00','e'=>'18:00']];
Db::$ownShifts=[['shift_id'=>2,'title'=>'دوپاره','type'=>'simple','weekly'=>json_encode(array_fill(0,7,$segments))]];
$calendar=runRoute('GET','/api/my/shift-cover-status');
check(count($calendar['days']['1405-09-02']['cover'][0]['shift']['segments'])===2,'simple split-shift segments are resolved from weekly plan');
check($calendar['days']['1405-09-02']['cover'][0]['shift']['minutes']===480,'planned minutes sum all split-shift segments');
Db::$ownShifts=[['shift_id'=>3,'title'=>'چرخشی','type'=>'rotating','advanced'=>json_encode(['cycle_start_jdate'=>'1405-09-01','cycle'=>[['days'=>2,'segments'=>[['s'=>'22:00','e'=>'06:00']]]]])]];
$calendar=runRoute('GET','/api/my/shift-cover-status');
check($calendar['days']['1405-09-02']['cover'][0]['shift']['minutes']===480,'rotating overnight shift retains duration');
echo "PASS simple split and rotating overnight calendar shifts\n";

Db::$ownShifts=null;
Db::$released=[['reservation_id'=>31,'request_id'=>301,'absent_user_id'=>8,'from_date'=>'1405-09-02','to_date'=>'1405-09-03','reserved_at'=>'2026-11-26 09:00:00','reserved_by_user_id'=>21,'reserved_by_name'=>'رزروکننده قبلی','event'=>'reserved','current_substitute_user_id'=>77,'current_status'=>'approved','from_jdate'=>'1405-09-02','to_jdate'=>'1405-09-03','absent_name'=>'جایگزین تغییرکرده'],
['reservation_id'=>30,'request_id'=>301,'absent_user_id'=>8,'from_date'=>'1405-09-02','to_date'=>'1405-09-03','reserved_at'=>'2026-11-25 09:00:00','reserved_by_user_id'=>20,'reserved_by_name'=>'رزروکننده قدیمی','event'=>'reserved','current_substitute_user_id'=>77,'current_status'=>'approved','from_jdate'=>'1405-09-02','to_jdate'=>'1405-09-03','absent_name'=>'جایگزین تغییرکرده']];
Db::$assignmentReads=0;Db::$dayReads=0;
$calendar=runRoute('GET','/api/admin/substitute-calendar',[],[],['id'=>99,'is_admin'=>1]);
$released=array_values(array_filter($calendar['days']['1405-09-02']['history'],fn($r)=>$r['status']==='released'));
check(count($released)===1,'repeated reservation audits do not duplicate released history');
check($released[0]['reserved_by_name']==='رزروکننده قبلی','released history preserves actor from matching audit');
check($released[0]['shift']===null&&$released[0]['is_confirmed']===false,'released history never invents historic shift or active assignment');
check(Db::$assignmentReads===1&&Db::$dayReads===1,'calendar assignments and day rows each load once across all days');
Db::$ownShifts=[];
$calendar=runRoute('GET','/api/my/shift-cover-status');
check($calendar['days']['1405-09-02']['cover'][0]['shift']===null,'next call observes changed assignments without stale global cache');
echo "PASS released historical substitute, audit dedup and batched request-local schedules\n";

Db::$released=[array_replace(Db::$released[0],['current_substitute_user_id'=>5,'from_jdate'=>'1405-09-03','to_jdate'=>'1405-09-03'])];
$calendar=runRoute('GET','/api/admin/substitute-calendar',[],[],['id'=>99,'is_admin'=>1]);
$releasedOld=array_values(array_filter($calendar['days']['1405-09-02']['history'],fn($r)=>$r['status']==='released'));
$releasedCurrent=array_values(array_filter($calendar['days']['1405-09-03']['history']??[],fn($r)=>$r['status']==='released'));
check(count($releasedOld)===1&&!$releasedCurrent,'moved dates release only the old reservation days');
echo "PASS changed request dates retain only released historical days\n";

Db::$reservations=[];
Db::$assignments=[['request_id'=>401,'absent_name'=>'صبح','absent_user_id'=>5,'from_date'=>'1405-09-02','to_date'=>'1405-09-02'],['request_id'=>402,'absent_name'=>'عصر','absent_user_id'=>6,'from_date'=>'1405-09-02','to_date'=>'1405-09-02']];
Db::$ownShifts=[['user_id'=>5,'shift_id'=>21,'title'=>'صبح','type'=>'simple','weekly'=>json_encode(array_fill(0,7,[['s'=>'06:00','e'=>'14:00']]))],['user_id'=>6,'shift_id'=>22,'title'=>'عصر','type'=>'simple','weekly'=>json_encode(array_fill(0,7,[['s'=>'14:00','e'=>'22:00']]))]];
$_GET=['dates'=>'1405-09-02'];
$calendar=runRoute('GET','/api/my/shift-cover-status');
check(!$calendar['days']['1405-09-02']['cover'][0]['conflict']&&!$calendar['days']['1405-09-02']['cover'][1]['conflict'],'touching half-open calendar shifts do not conflict');
Db::$ownShifts[1]['weekly']=json_encode(array_fill(0,7,[['s'=>'12:00','e'=>'20:00']]));
$calendar=runRoute('GET','/api/my/shift-cover-status');
check($calendar['days']['1405-09-02']['cover'][0]['conflict']&&$calendar['days']['1405-09-02']['cover'][1]['conflict'],'both overlapping calendar entries show a warning');
check($calendar['days']['1405-09-02']['cover'][0]['conflicts'][0]['request_id']===402,'warning identifies conflicting request');
check($calendar['conflict_scope']==='substitute_reservations','calendar warning scope is explicit');
Db::$assignments[0]['from_date']=Db::$assignments[0]['to_date']='1405-09-30';
Db::$assignments[1]['from_date']=Db::$assignments[1]['to_date']='1405-10-01';
Db::$ownShifts[0]['weekly']=json_encode(array_fill(0,7,[['s'=>'22:00','e'=>'06:00']]));
Db::$ownShifts[1]['weekly']=json_encode(array_fill(0,7,[['s'=>'05:00','e'=>'13:00']]));
$_GET=['dates'=>'1405-10-01'];
$calendar=runRoute('GET','/api/my/shift-cover-status');
check($calendar['days']['1405-10-01']['cover'][0]['conflict'],'night shift from previous month warns on current month');
check($calendar['days']['1405-10-01']['cover'][0]['conflicts'][0]['date']==='1405-09-30','warning includes previous-month conflict date');
check(!isset($calendar['days']['1405-09-30']),'adjacent lookup days do not leak into requested calendar');
check(Db::$coverReadArgs[2]<'1405-10-01','calendar query includes earlier entry-owned shifts');
echo "PASS half-open and cross-month overnight calendar conflict warnings\n";

Db::$assignments=[['request_id'=>501,'absent_name'=>'قطعی','absent_user_id'=>5,'from_date'=>'1405-10-01','to_date'=>'1405-10-01']];
Db::$reservations=[['id'=>502,'user_id'=>6,'from_jdate'=>'1405-10-01','to_jdate'=>'1405-10-01','absent_name'=>'رزرو']];
Db::$ownShifts[0]['weekly']=json_encode(array_fill(0,7,[['s'=>'06:00','e'=>'14:00']]));
Db::$ownShifts[1]['weekly']=json_encode(array_fill(0,7,[['s'=>'12:00','e'=>'20:00']]));
$calendar=runRoute('GET','/api/my/shift-cover-status');
check($calendar['days']['1405-10-01']['cover'][0]['conflict']&&$calendar['days']['1405-10-01']['reservations'][0]['conflict'],'pending reservations participate in conflict warnings without becoming confirmed');
check($calendar['days']['1405-10-01']['reservations'][0]['is_confirmed']===false,'warning never upgrades a pending reservation');
Db::$ownShifts=[];
$calendar=runRoute('GET','/api/my/shift-cover-status');
check($calendar['days']['1405-10-01']['cover'][0]['conflict_check_complete']===false,'missing duty bounds explicitly mark conflict check incomplete');
echo "PASS advisory conflict warnings and unknown-schedule limitation\n";
