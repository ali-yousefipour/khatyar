<?php
date_default_timezone_set('Asia/Tehran');
$source = file_get_contents(__DIR__.'/../lib/routes.php');
$start = strpos($source,'function gregorian_to_jalali(');
$end = strpos($source,'function j_to_ts(',$start);
eval(substr($source,$start,$end-$start));
require_once __DIR__.'/../lib/ShiftCalc.php';
require_once __DIR__.'/../lib/Seniority.php';
class FixedSeniority extends Seniority {
  static function today() { return '1405-07-24'; }
}

function expect($label,$expected,$actual) {
  if ($expected!==$actual) throw new RuntimeException($label.': '.var_export($actual,true));
  echo "PASS $label\n";
}
class Http {
  static function error($message,$status) { throw new RuntimeException($message,$status); }
}
class SeniorityConnection {
  private $snapshot;
  function beginTransaction() { $this->snapshot=[Db::$people,Db::$months,Db::$history]; }
  function inTransaction() { return $this->snapshot!==null; }
  function commit() { $this->snapshot=null; }
  function rollBack() { [Db::$people,Db::$months,Db::$history]=$this->snapshot;$this->snapshot=null; }
}
class Db {
  static $people=[],$months=[],$history=[],$locked=false,$failAudit=false,$active=true,$connection;
  static function pdo() { return self::$connection; }
  static function one($sql,$params=[]) {
    if ($sql==='SELECT DATABASE() db_name') return ['db_name'=>'test'];
    if (strpos($sql,'SELECT GET_LOCK(')===0) { if(self::$locked)return ['acquired'=>0];self::$locked=true;return ['acquired'=>1]; }
    if (strpos($sql,'SELECT RELEASE_LOCK(')===0) { self::$locked=false;return ['released'=>1]; }
    if (strpos($sql,'SELECT id')===0) return ['id'=>$params[0],'is_active'=>self::$active?1:0];
    if (strpos($sql,'SELECT * FROM personnel_seniority ')===0) return self::$people[$params[0]]??null;
    if (strpos($sql,'SELECT COALESCE(SUM(')===0) return ['days'=>array_sum(array_map(fn($row)=>(int)$row['credited_days'],array_filter(self::$months,fn($row)=>$row['user_id']===$params[0])))];
    if (strpos($sql,'SELECT credited_days FROM')===0) return self::$months[implode(':',$params)]??null;
    throw new LogicException('Unexpected SELECT '.$sql);
  }
  static function run($sql,$params=[]) {
    if (strpos($sql,'CREATE TABLE')===0) return;
    if (strpos($sql,'INSERT INTO personnel_seniority_history')===0) {
      if (self::$failAudit) throw new RuntimeException('audit storage failed');
      self::$history[]=$params;
      return;
    }
    if (strpos($sql,'INSERT INTO personnel_seniority_months')===0) {
      $row=array_combine(['user_id','jyear','jmonth','eligible_days','absent_days','credited_days','absence_dates','checked_through_jdate','updated_by'],$params);
      self::$months[implode(':',array_slice($params,0,3))]=$row;
      return;
    }
    if (strpos($sql,'INSERT INTO personnel_seniority(')===0) {
      self::$people[$params[0]]=['user_id'=>$params[0],'base_days'=>$params[1],'base_through_jdate'=>$params[2],'adjustment_days'=>0,'revision'=>1];return;
    }
    if (strpos($sql,'UPDATE personnel_seniority SET adjustment_days=')===0) {
      self::$people[$params[2]]['adjustment_days']=$params[0];self::$people[$params[2]]['revision']++;return;
    }
    if (strpos($sql,'UPDATE personnel_seniority SET revision=')===0) { self::$people[$params[1]]['revision']++;return; }
    throw new LogicException('Unexpected mutation '.$sql);
  }
}
Db::$connection=new SeniorityConnection();
$reportDays=[];
function _attendance_report($userId,$from,$to) {
  global $reportDays;
  if (Db::pdo()->inTransaction()) throw new LogicException('Legacy attendance DDL must run before the seniority transaction');
  return ['days'=>$reportDays];
}
function reject($label,$status,$operation) {
  try { $operation(); } catch (RuntimeException $failure) { expect($label,$status,$failure->getCode());return; }
  throw new LogicException('Expected rejection '.$label);
}

expect('baseline date','1405-06-31',FixedSeniority::validDate('1405/06/31'));
expect('reject invalid month',null,FixedSeniority::validDate('1405-13-01'));
expect('reject 31st day of Mehr',null,FixedSeniority::validDate('1405-07-31'));
expect('31-day month',31,FixedSeniority::monthCredit(1405,6,'1405-05-31',[],'1405-06-15')['credited_days']);
expect('30-day month',30,FixedSeniority::monthCredit(1405,7,'1405-06-31',[],'1405-07-24')['credited_days']);
expect('non-leap Esfand',29,FixedSeniority::monthCredit(1404,12,'1404-11-30',[],'1404-12-15')['credited_days']);
expect('leap Esfand',30,FixedSeniority::monthCredit(1403,12,'1403-11-30',[],'1403-12-15')['credited_days']);
expect('mid-month baseline avoids overlap',20,FixedSeniority::monthCredit(1405,7,'1405-07-10',[],'1405-07-24')['eligible_days']);
$days=[['jdate'=>'1405/07/02','absent'=>1],['jdate'=>'1405-07-02','absent'=>1],['jdate'=>'1405-07-24','absent'=>1],['jdate'=>'1405-07-29','absent'=>1],['jdate'=>'1405-06-30','absent'=>1]];
expect('unique completed absence only',29,FixedSeniority::monthCredit(1405,7,'1405-06-31',$days,'1405-07-24')['credited_days']);
expect('baseline month is never credited',0,FixedSeniority::monthCredit(1405,6,'1405-06-31',[],'1405-07-24')['credited_days']);

$today=FixedSeniority::today();[$year,$month]=array_map('intval',explode('-',$today));$period=substr($today,0,7);$length=ShiftCalc::jMonthDays($year,$month);
FixedSeniority::save(1,['seniority_days'=>100,'base_through_jdate'=>'1405-06-31','reason'=>'test'],99);
$first=FixedSeniority::recalculate(1,99,$period);
expect('first month credit',$length,$first['delta_days']);
expect('repeat click adds zero',0,FixedSeniority::recalculate(1,99,$period)['delta_days']);
expect('single ledger entry',1,count(Db::$months));
$reportDays=[['jdate'=>$period.'-01','absent'=>1]];
$reduced=FixedSeniority::recalculate(1,99,$period);
expect('new absence reduces previous month credit',-1,$reduced['delta_days']);
expect('total reflects reduced credit',100+$length-1,$reduced['seniority_days']);
$reportDays=[];
expect('corrected attendance restores one day',1,FixedSeniority::recalculate(1,99,$period)['delta_days']);
$revision=Db::$people[1]['revision'];
FixedSeniority::save(1,['seniority_days'=>150,'revision'=>$revision,'reason'=>'manual adjustment'],99);
expect('manual edit preserves imported baseline',100,Db::$people[1]['base_days']);
expect('manual edit stores difference',150-100-$length,Db::$people[1]['adjustment_days']);
expect('repeat calculation preserves manual total',150,FixedSeniority::recalculate(1,99,$period)['seniority_days']);
reject('stale edits rejected',409,fn()=>FixedSeniority::save(1,['seniority_days'=>151,'revision'=>$revision,'reason'=>'stale'],99));
reject('future month rejected',409,fn()=>FixedSeniority::recalculate(1,99,'1499-01'));
reject('uninitialized personnel not auto credited',422,fn()=>FixedSeniority::recalculate(2,99,$period));
Db::$active=false;
reject('inactive personnel not auto credited',422,fn()=>FixedSeniority::recalculate(1,99,$period));Db::$active=true;
Db::$locked=true;
reject('simultaneous mutation rejected',409,fn()=>FixedSeniority::recalculate(1,99,$period));Db::$locked=false;
$snapshot=[Db::$people,Db::$months,Db::$history];Db::$failAudit=true;
try { FixedSeniority::recalculate(1,99,$period);throw new LogicException('Audit failure ignored'); } catch (RuntimeException $failure) { expect('transaction rolled back on audit failure',$snapshot,[Db::$people,Db::$months,Db::$history]); }
expect('lock released after failure',false,Db::$locked);
foreach ([-1,1.5,'abc',1000001] as $invalid) reject('invalid seniority amount',422,fn()=>FixedSeniority::save(1,['seniority_days'=>$invalid,'reason'=>'invalid'],99));
foreach (['GET /api/admin/seniority','PUT /api/admin/seniority/{id}','POST /api/admin/seniority/{id}/recalculate','GET /api/admin/seniority/{id}/history'] as $endpoint) {
  [$method,$path]=explode(' ',$endpoint,2);
  $position=strpos($source,"route('$method', '$path',");$tail=strpos($source,'}, false, ADMIN);',$position);
  expect('admin-only '.$endpoint,true,$position!==false&&$tail!==false&&$tail-$position<700);
}
echo "PASS seniority arithmetic, transactions, idempotency, corrections, locking and authorization\n";
