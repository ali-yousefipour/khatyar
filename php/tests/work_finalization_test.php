<?php
date_default_timezone_set('Asia/Tehran');
const ADMIN=3;
function route($method,$path,$callback,$public=false,$level=99){$GLOBALS['work_routes'][$path][$method]=[$callback,$public,$level];}
class Http {static function error($message,$status){throw new RuntimeException($message,$status);}}
class Db {
  static $months=[];static $locked=false;static $allowLock=true;static $failInsert=false;static $people=[];static $queries=[];
  static function one($query,$params=[]){
    self::$queries[]=$query;
    if(str_contains($query,'GET_LOCK')){self::$locked=self::$allowLock;return ['locked'=>self::$allowLock?1:0];}
    if(str_contains($query,'RELEASE_LOCK')){self::$locked=false;return ['released'=>1];}
    if(str_contains($query,'finalized_work_months'))return self::$months[$params[0].'-'.$params[1]]??null;
    return null;
  }
  static function all($query,$params=[]){return array_values(self::$people);}
  static function run($query,$params=[]){
    if(str_starts_with($query,'INSERT INTO finalized_work_months')){
      if(self::$failInsert)throw new RuntimeException('write failed');
      self::$months[$params[0].'-'.$params[1]]=['monthly_json'=>$params[2],'daily_json'=>$params[3]];
    }
  }
}
function same($label,$expected,$actual){if($actual!==$expected)throw new RuntimeException($label.': '.json_encode($actual));echo "PASS $label\n";}
function fails($label,$code,$callback){try{$callback();throw new RuntimeException('Expected failure');}catch(Throwable $error){same($label,$code,$error->getCode());}}
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$start=strpos($source,'function gregorian_to_jalali(');$end=strpos($source,'function j_to_ts(',$start);
eval(substr($source,$start,$end-$start));
require_once __DIR__.'/../lib/ShiftCalc.php';
$start=strpos($source,'function _final_work_month(');$end=strpos($source,"route('GET', '/api/admin/shift-report',",$start);
eval(substr($source,$start,$end-$start));
function _shift_month_report($year,$month){return [['user_id'=>1,'name'=>'Historic Name','role'=>'Inspector','worked'=>480]];}
function _attendance_report($userId,$from,$to){$GLOBALS['live_calls'][]=[$userId,$from,$to];return ['user'=>['id'=>$userId,'name'=>'Historic Name','pcode'=>'005'],'from'=>$from,'to'=>$to,'days'=>[]];}
$saved=['user'=>['id'=>1,'name'=>'Saved Name','pcode'=>'005'],'shift'=>['title'=>'Saved Shift'],'days'=>[['jdate'=>'1405/06/29','worked'=>'08:00'],['jdate'=>'1405/06/30','worked'=>'09:00'],['jdate'=>'1405/06/31','worked'=>'10:00']]];
Db::$months['1405-6']=['monthly_json'=>'[]','daily_json'=>json_encode([1=>$saved])];
require_once __DIR__.'/../app/api/admin-attendance-report-owned.php';
$GLOBALS['live_calls']=[];
$report=attendance_report_owned_by_entry_date(1,'1405/06/30','1405/06/30');
same('canonical route returns frozen day','09:00',$report['days'][0]['worked']);
same('frozen day does not recompute attendance',[],$GLOBALS['live_calls']);
same('subrange gets exact bounds','1405-06-30',$report['from']);
$report=attendance_report_owned_by_entry_date(1,'1405-06-30','1405-07-01');
same('mixed range contains frozen days',2,count($report['days']));
same('only unfrozen month is recomputed',[[1,'1405-07-01','1405-07-01']],$GLOBALS['live_calls']);
$GLOBALS['live_calls']=[];
$report=attendance_report_owned_by_entry_date(99,'1405-06-01','1405-06-31');
same('missing legacy person never falls back to live',[],$GLOBALS['live_calls']);
same('missing legacy person is explicit',true,$report['missing_frozen_person']);
$historic=['id'=>1,'first_name'=>'Old','last_name'=>'Name','personnel_code'=>'005','zone_name'=>'Old Zone'];
same('frozen metadata cannot use current personnel',$historic,_work_organization_person(['user_id'=>1,'organization_person'=>$historic],[1=>['zone_name'=>'New Zone']],[]));
same('legacy metadata uses saved identity','005',_work_organization_person(['user_id'=>1,'name'=>'Old Name'],null,[1=>$saved])['personnel_code']);
same('legacy missing zone is not fabricated','',_work_organization_person(['user_id'=>1],null,[1=>$saved])['zone_name']);
Db::$people=[1=>$historic,2=>['id'=>2,'first_name'=>'Unassigned','last_name'=>'Person']];
$GLOBALS['live_calls']=[];
$result=_finalize_work_month(1404,1,7);
same('finalization includes all personnel daily snapshots',2,count($GLOBALS['live_calls']));
same('finalization uses captured organization metadata',$historic,_work_snapshot_decode(Db::$months['1404-1']['monthly_json'])[0]['organization_person']);
same('lock released after successful finalization',false,Db::$locked);
fails('repeat finalization rejected',409,fn()=>_finalize_work_month(1404,1,7));
same('lock released after duplicate',false,Db::$locked);
Db::$allowLock=false;
fails('simultaneous finalization rejected',409,fn()=>_finalize_work_month(1404,2,7));
Db::$allowLock=true;Db::$failInsert=true;
fails('write failure propagated',0,fn()=>_finalize_work_month(1404,2,7));
same('lock released after failed write',false,Db::$locked);
same('failed write leaves no snapshot',false,isset(Db::$months['1404-2']));
fails('future month rejected',422,fn()=>_finalize_work_month(1500,1,7));
[$currentYear,$currentMonth]=gregorian_to_jalali((int)date('Y'),(int)date('n'),(int)date('j'));
fails('current month rejected',422,fn()=>_finalize_work_month($currentYear,$currentMonth,7));
fails('invalid month rejected',422,fn()=>_finalize_work_month(1404,13,7));
foreach($GLOBALS['work_routes'] as $methods)foreach($methods as $route){same('finalization routes remain private',false,$route[1]);same('finalization routes remain admin-only',ADMIN,$route[2]);}
$index=file_get_contents(__DIR__.'/../app/index.php');
same('real front controller calls canonical helper',true,str_contains($index,'return attendance_report_owned_by_entry_date($uid,$from,$to)'));
same('snapshot finalizer uses canonical live path',true,str_contains($source,'attendance_report_owned_by_entry_date($uid,$from,$to,true)'));
same('finalization permissions retained',true,str_contains($source,'_monthly_work_report_need($u);'));
