<?php
/** Regression for pending substitute reservation, approval, cancellation, and private calendar. */
declare(strict_types=1);
class Http { public static function error($m,$s=400):void {throw new RuntimeException((string)$m,(int)$s);} }
class Db {
 public static array $requests=[];
 public static array $locks=[];
 public static array $coverage=[];
 public static array $assignments=[];
 public static int $serial=1;
 public static function one($sql,$args=[]) {
  if(str_contains($sql,'GET_LOCK(')){self::$locks[(string)$args[0]]=true;return ['ok'=>1];}
  if(str_contains($sql,'RELEASE_LOCK(')){unset(self::$locks[(string)$args[0]]);return ['ok'=>1];}
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
  if(str_contains($sql,"FROM substitute_assignments sa"))return self::$assignments;
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
Db::$coverage=[['id'=>12,'user_id'=>5,'type'=>'annual','unit'=>'daily','status'=>'approved','from_jdate'=>'1405-09-02','to_jdate'=>'1405-09-02','the_date'=>null,'from_time'=>null,'to_time'=>null],
['id'=>13,'user_id'=>5,'type'=>'annual','unit'=>'daily','status'=>'pending','from_jdate'=>'1405-09-03','to_jdate'=>'1405-09-03','the_date'=>null,'from_time'=>null,'to_time'=>null]];
$_GET=['dates'=>'1405-09-02,1405-09-03'];
$calendar=runRoute('GET','/api/my/shift-cover-status');
check(count($calendar['days']['1405-09-02']['leave'])===1,'approved leave shown');
check(!isset($calendar['days']['1405-09-03']['leave']),'pending leave does not display as approved');
echo "PASS pending substitute reservations, conflicts, release and approved-only calendar\n";
