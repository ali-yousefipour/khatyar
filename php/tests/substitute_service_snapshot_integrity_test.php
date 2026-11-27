<?php
declare(strict_types=1);
date_default_timezone_set('Asia/Tehran');
// Exercise the real administrative snapshot writer against a transaction-aware mock.
class Http {
    public static function error($message,$status=400): void {throw new RuntimeException((string)$message,(int)$status);}
}
final class SnapshotTransaction {
    public bool $active=false;
    public int $commits=0;
    public int $rollbacks=0;
    public function beginTransaction(): void {$this->active=true;}
    public function inTransaction(): bool {return $this->active;}
    public function commit(): void {$this->active=false;$this->commits++;}
    public function rollBack(): void {$this->active=false;$this->rollbacks++;}
}
class Db {
    public static array $writes=[];
    public static array $audit=[];
    public static array $locks=[];
    public static ?array $previousSnapshot=null;
    public static SnapshotTransaction $connection;
    public static function pdo(): SnapshotTransaction {return self::$connection??=new SnapshotTransaction();}
    public static function one($sql,$params=[]): ?array {
        if(str_contains($sql,'GET_LOCK(')){self::$locks[(string)$params[0]]=true;return ['ok'=>1];}
        if(str_contains($sql,'RELEASE_LOCK(')){unset(self::$locks[(string)$params[0]]);return ['ok'=>1];}
        if(str_contains($sql,'SELECT sa.substitute_user_id FROM substitute_assignments'))
            return ['substitute_user_id'=>9];
        if(str_contains($sql,'FROM substitute_assignments sa JOIN requests r')){
            if(!str_contains($sql,'MAX(latest.id)')||!str_contains($sql,"latest.status='active'"))
                throw new LogicException('Superseded assignment identity was not checked in SQL');
            // Assignment 2 is the most recent active row for the same request.
            if((int)$params[0]!==2)return null;
            return ['id'=>2,'absent_user_id'=>7,'substitute_user_id'=>9,
                'from_date'=>'1405-09-02','to_date'=>'1405-09-02',
                'user_id'=>7,'request_substitute_id'=>9,
                'from_jdate'=>'1405-09-02','to_jdate'=>'1405-09-02','the_date'=>null];
        }
        if(str_contains($sql,'FROM `lines`'))return ['id'=>17,'code'=>'L-17','origin'=>'آغاز','destination'=>'پایان'];
        if(str_contains($sql,'FROM substitute_shift_service_snapshots'))return self::$previousSnapshot;
        throw new LogicException('Unexpected query: '.$sql);
    }
    public static function all($sql,$params=[]): array {
        if(str_contains($sql,'FROM user_shifts us'))return [['shift_id'=>33,'id'=>33,'type'=>'advanced','title'=>'صبح']];
        throw new LogicException('Unexpected query: '.$sql);
    }
    public static function run($sql,$params=[]): void {self::$writes[]=[$sql,$params];}
    public static function insert($sql,$params=[]): int {self::$audit[]=[$sql,$params];return count(self::$audit);}
}
function _db_table_exists_safe($table): bool {return true;}
function _final_work_month($year,$month): bool {
    if(empty($GLOBALS['finalizeAfterInitialCheck']))return false;
    $GLOBALS['monthChecks']=($GLOBALS['monthChecks']??0)+1;
    return $GLOBALS['monthChecks']>=2;
}
function _shift_day_row($id,$date): array {
    return ['segments'=>[['s'=>'06:00','e'=>'14:00']],'day_config'=>[],'is_off'=>false];
}
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$start=strpos($source,'function gregorian_to_jalali(');
$end=strpos($source,'function j_to_ts(',$start);
if($start===false||$end===false)throw new LogicException('Missing canonical date conversion');
eval(substr($source,$start,$end-$start));
require_once __DIR__.'/../lib/ShiftCalc.php';
require_once __DIR__.'/../lib/LeaveSubstituteCoverage.php';
$method=new ReflectionMethod(LeaveSubstituteCoverage::class,'saveServiceLocation');
$actor=['id'=>99,'is_admin'=>1];
$body=['assignment_id'=>1,'line_id'=>17,'segment_index'=>0,'jdate'=>'1405-09-02',
    'service_location'=>'ایستگاه تأییدشده','reason'=>'اصلاح محل خدمت تاریخی'];
try {
    $method->invoke(null,$body,$actor);
    throw new LogicException('Superseded active assignment accepted');
} catch(RuntimeException $e) {
    if($e->getCode()!==409)throw $e;
}
if(Db::$writes||Db::$audit||Db::$locks||Db::pdo()->rollbacks!==1)
    throw new LogicException('Rejected old assignment changed snapshots, audits or held locks');
$body['assignment_id']=2;
$result=$method->invoke(null,$body,$actor);
if(empty($result['ok'])||$result['line_id']!==17||$result['line_name']!=='L-17 — آغاز – پایان'||Db::pdo()->commits!==1||
    count(Db::$writes)!==1||count(Db::$audit)!==1||Db::$locks)
    throw new LogicException('Latest active assignment failed to commit snapshot and history atomically');
Db::$previousSnapshot=['line_id'=>17,'line_name'=>'L-17 — آغاز – پایان',
    'service_location'=>'ایستگاه تأییدشده'];
$noOp=$method->invoke(null,$body,$actor);
if(empty($noOp['unchanged'])||count(Db::$writes)!==1||count(Db::$audit)!==1||
    Db::pdo()->commits!==2||Db::$locks)
    throw new LogicException('Identical location retry created duplicate history or changed snapshot');
Db::$previousSnapshot=null;
$body['segment_index']=1;
try {$method->invoke(null,$body,$actor);throw new LogicException('Nonexistent segment accepted');}
catch(RuntimeException $e){if($e->getCode()!==422)throw $e;}
if(count(Db::$writes)!==1||count(Db::$audit)!==1||Db::$locks)
    throw new LogicException('Invalid shift segment altered recorded snapshots');
$GLOBALS['finalizeAfterInitialCheck']=true;
$GLOBALS['monthChecks']=0;
$body['segment_index']=0;
$writesBefore=count(Db::$writes);
$auditBefore=count(Db::$audit);
$rollbacksBefore=Db::pdo()->rollbacks;
try {
    $method->invoke(null,$body,$actor);
    throw new LogicException('Finalized month changed during lock wait was accepted');
} catch(RuntimeException $e) {
    if($e->getCode()!==409)throw $e;
}
if($GLOBALS['monthChecks']<2||count(Db::$writes)!==$writesBefore||
    count(Db::$audit)!==$auditBefore||Db::$locks||
    Db::pdo()->rollbacks!==$rollbacksBefore+1)
    throw new LogicException('Month finalization during lock wait must roll back with no snapshot edits');
unset($GLOBALS['finalizeAfterInitialCheck'],$GLOBALS['monthChecks']);
echo "PASS service snapshots: reject stale assignment, commit latest with audit, reject missing segment\\n";
