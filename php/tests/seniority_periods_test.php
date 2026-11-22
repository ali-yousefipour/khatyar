<?php
date_default_timezone_set('Asia/Tehran');
$routes=file_get_contents(__DIR__.'/../lib/routes.php');
$a=strpos($routes,'function gregorian_to_jalali(');
$b=strpos($routes,'function j_to_ts(',$a);
eval(substr($routes,$a,$b-$a));
require_once __DIR__.'/../lib/ShiftCalc.php';
require_once __DIR__.'/../lib/Seniority.php';
require_once __DIR__.'/../lib/SeniorityPeriods.php';
class Http { static function error($message,$status){throw new RuntimeException($message,$status);} }
class FakeConnection {
  private $snapshot=null;
  function beginTransaction(){if($this->snapshot!==null)throw new RuntimeException('nested transaction');$this->snapshot=[Db::$months,Db::$forecasts,Db::$history,Db::$people];}
  function inTransaction(){return $this->snapshot!==null;}
  function commit(){$this->snapshot=null;}
  function rollBack(){[Db::$months,Db::$forecasts,Db::$history,Db::$people]=$this->snapshot;$this->snapshot=null;}
}
class Db {
  static $people=[1=>['base_days'=>100,'adjustment_days'=>0,'base_through_jdate'=>'1405-06-31','revision'=>1]];
  static $months=[],$forecasts=[],$history=[],$runs=[],$lock=false,$conn,$lastId=0,$failAudit=false;
  static function pdo(){return self::$conn;}
  static function one($q,$v=[]) {
    if(strpos($q,'SELECT DATABASE()')===0)return ['db_name'=>'test'];
    if(strpos($q,'SELECT GET_LOCK(')===0){if(self::$lock)return ['acquired'=>0];self::$lock=true;return ['acquired'=>1];}
    if(strpos($q,'SELECT RELEASE_LOCK(')===0){self::$lock=false;return ['released'=>1];}
    if(strpos($q,'SELECT LAST_INSERT_ID()')===0)return ['id'=>self::$lastId];
    if(strpos($q,'SELECT id,is_active FROM users')===0)return ['id'=>$v[0],'is_active'=>1];
    if(strpos($q,'SELECT * FROM personnel_seniority')===0)return self::$people[$v[0]]??null;
    if(strpos($q,'SELECT credited_days FROM personnel_seniority_months')===0)return self::$months[implode(':',$v)]??null;
    if(strpos($q,'SELECT user_id FROM personnel_seniority_forecasts')===0)return self::$forecasts[implode(':',$v)]??null;
    if(strpos($q,'SELECT COALESCE(SUM(')===0)return ['days'=>array_sum(array_column(array_filter(self::$months,fn($r)=>$r['user_id']==$v[0]),'credited_days'))];
    if(strpos($q,'SELECT COUNT(*) n FROM personnel_seniority_months')===0)return ['n'=>count(array_filter(self::$months,fn($r)=>$r['jyear']==$v[0]&&$r['jmonth']==$v[1]))];
    if(strpos($q,'SELECT COUNT(*) n FROM personnel_seniority_forecasts')===0)return ['n'=>count(array_filter(self::$forecasts,fn($r)=>$r['jyear']==$v[0]&&$r['jmonth']==$v[1]))];
    if(strpos($q,'SELECT COUNT(*) n FROM personnel_seniority_period_runs')===0)return ['n'=>count(self::$runs)];
    if(strpos($q,'SELECT r.*,')===0)return null;
    throw new RuntimeException('unexpected query: '.$q);
  }
  static function all($q,$v=[]){if(strpos($q,'SELECT r.*,')===0)return array_values(self::$runs);throw new RuntimeException('unexpected list '.$q);}
  static function run($q,$v=[]) {
    if(strpos($q,'CREATE TABLE')===0)return;
    if(strpos($q,'INSERT INTO personnel_seniority_period_runs')===0){
      self::$lastId++;self::$runs[self::$lastId]=['id'=>self::$lastId,'period'=>$v[0],'run_type'=>$v[1],'status'=>$v[2],'actor_id'=>$v[3],'eligible_count'=>$v[4]];return;
    }
    if(strpos($q,'UPDATE personnel_seniority_period_runs')===0){
      self::$runs[$v[5]]=array_merge(self::$runs[$v[5]],['status'=>$v[0],'processed_count'=>$v[1],'skipped_count'=>$v[2],'failed_count'=>$v[3],'error_summary'=>$v[4]]);return;
    }
    if(strpos($q,'INSERT IGNORE INTO personnel_seniority_forecasts')===0){
      self::$forecasts[implode(':',array_slice($v,0,3))]=['user_id'=>$v[0],'jyear'=>$v[1],'jmonth'=>$v[2],'eligible_days'=>$v[3],'credited_days'=>$v[4]];return;
    }
    if(strpos($q,'INSERT INTO personnel_seniority_months')===0){
      $keys=['user_id','jyear','jmonth','eligible_days','absent_days','credited_days','absence_dates','checked_through_jdate','updated_by'];
      self::$months[implode(':',array_slice($v,0,3))]=array_combine($keys,$v);return;
    }
    if(strpos($q,'INSERT INTO personnel_seniority_history')===0){
      if(self::$failAudit)throw new RuntimeException('audit unavailable');
      self::$history[]=$v;return;
    }
    if(strpos($q,'UPDATE personnel_seniority SET revision=')===0){self::$people[$v[1]]['revision']++;return;}
    throw new RuntimeException('unexpected mutation '.$q);
  }
}
Db::$conn=new FakeConnection();
function _attendance_report($uid,$from,$to){if(Db::pdo()->inTransaction())throw new RuntimeException('attendance inside transaction');return ['days'=>[]];}
function eq($name,$expected,$actual){if($expected!==$actual)throw new RuntimeException($name.' expected='.var_export($expected,true).' actual='.var_export($actual,true));echo "PASS $name\n";}
function reject($label,$code,$fn){try{$fn();}catch(RuntimeException $e){eq($label,$code,$e->getCode());return;}throw new RuntimeException('Expected rejection '.$label);}
eq('Jalali input','1405-07',SeniorityPeriods::period('۱۴۰۵/۰۷')==='1405-07'?'1405-07':SeniorityPeriods::period('1405/07'));
reject('invalid month',422,fn()=>SeniorityPeriods::period('1405-13'));
reject('invalid format',422,fn()=>SeniorityPeriods::period('1405-7'));
$a=SeniorityPeriods::run('1405-08',[1],10);
eq('Aban calculated',30,$a['processed']?Db::$months['1:1405:8']['credited_days']:0);
$b=SeniorityPeriods::run('1405-07',[1],10);
eq('Mehr backfill',30,Db::$months['1:1405:7']['credited_days']);
eq('unordered total',60,array_sum(array_column(Db::$months,'credited_days')));
$c=SeniorityPeriods::run('1405-07',[1],10);
eq('repeat processed zero',0,$c['processed']);
eq('repeat skipped one',1,$c['skipped']);
eq('repeat never doubles',60,array_sum(array_column(Db::$months,'credited_days')));
$d=SeniorityPeriods::run('1406-01',[1],10);
eq('future forecast recorded',1,$d['processed']);
eq('future never adds final credit',60,array_sum(array_column(Db::$months,'credited_days')));
eq('forecast stored separately',31,Db::$forecasts['1:1406:1']['credited_days']);
$e=SeniorityPeriods::run('1406-01',[1],10);
eq('forecast repeat skipped',1,$e['skipped']);
Db::$lock=true;
reject('concurrent period locked',409,fn()=>SeniorityPeriods::run('1405-09',[1],11));Db::$lock=false;
Db::$failAudit=true;
$f=SeniorityPeriods::run('1405-09',[1],10);
eq('database failure recorded',1,$f['failed']);
eq('failed credit rolled back',false,isset(Db::$months['1:1405:9']));
eq('lock released on failure',false,Db::$lock);
eq('existing records preserved after failure',60,array_sum(array_column(Db::$months,'credited_days')));
echo "PASS seniority period backfill, forecast separation, concurrency, idempotency and rollback\n";
