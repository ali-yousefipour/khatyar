<?php
declare(strict_types=1);
// Runs only against disposable CI MySQL; never use the production database.
date_default_timezone_set('Asia/Tehran');
if (getenv('KHATYAR_SENIORITY_TEST_DB') !== 'disposable_ci_only') {
  fwrite(STDERR, "Refusing to run against an unverified database\n"); exit(2);
}
$host=getenv('MYSQL_HOST') ?: '127.0.0.1';
$dbname='khatyar_seniority_ci';
$admin=new PDO('mysql:host='.$host.';port=3306;charset=utf8mb4',getenv('MYSQL_USER')?:'root',getenv('MYSQL_PASSWORD')?:'testsecret',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$admin->exec('DROP DATABASE IF EXISTS `'.$dbname.'`');
$admin->exec('CREATE DATABASE `'.$dbname.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$pdo=new PDO('mysql:host='.$host.';port=3306;dbname='.$dbname.';charset=utf8mb4',getenv('MYSQL_USER')?:'root',getenv('MYSQL_PASSWORD')?:'testsecret',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
class Db {
  static PDO $pdo;
  static bool $failAudit=false;
  static function pdo() {return self::$pdo;}
  static function one($sql,$values=[]) {$stmt=self::run($sql,$values);return $stmt->fetch() ?: null;}
  static function all($sql,$values=[]) {return self::run($sql,$values)->fetchAll();}
  static function run($sql,$values=[]) {
    if(self::$failAudit && str_starts_with($sql,'INSERT INTO personnel_seniority_history')) throw new RuntimeException('forced audit transaction rollback');
    $stmt=self::$pdo->prepare($sql);$stmt->execute($values);return $stmt;
  }
}
Db::$pdo=$pdo;
class Http {static function error($message,$code=400) {throw new RuntimeException((string)$message,(int)$code);}}
$routes=file_get_contents(__DIR__.'/../lib/routes.php');
$a=strpos($routes,'function gregorian_to_jalali(');
$b=strpos($routes,'function j_to_ts(',$a);
if($a===false || $b===false)throw new RuntimeException('calendar helpers missing');
eval(substr($routes,$a,$b-$a));
require_once __DIR__.'/../lib/ShiftCalc.php';
require_once __DIR__.'/../lib/Seniority.php';
require_once __DIR__.'/../lib/SeniorityPeriods.php';
function _attendance_report($userId,$from,$to) {if(Db::pdo()->inTransaction())throw new RuntimeException('attendance called inside transaction');return ['days'=>[]];}
function check($label,$expect,$actual) {if($expect!==$actual)throw new RuntimeException($label.': expected '.var_export($expect,true).' actual '.var_export($actual,true));echo "PASS $label\n";}
$pdo->exec('CREATE TABLE users (id INT PRIMARY KEY, first_name VARCHAR(70),last_name VARCHAR(70), is_active TINYINT NOT NULL) ENGINE=InnoDB');
Db::run("INSERT INTO users VALUES(1,'Test','Worker',1)");
SeniorityPeriods::schema();
Db::run("INSERT INTO personnel_seniority(user_id,base_days,base_through_jdate,adjustment_days) VALUES(1,100,'1405-06-31',0)");
check('first later period',1,SeniorityPeriods::run('1405-08',[1],7)['processed']);
check('backfilled earlier period',1,SeniorityPeriods::run('1405-07',[1],7)['processed']);
check('double credit is prevented',1,SeniorityPeriods::run('1405-07',[1],7)['skipped']);
check('ledger remains two months',2,(int)Db::one('SELECT COUNT(*) n FROM personnel_seniority_months')['n']);
check('unordered months sum',60,(int)Db::one('SELECT SUM(credited_days) n FROM personnel_seniority_months')['n']);
$forecast=SeniorityPeriods::run('1406-01',[1],7);
check('forecast processed',1,$forecast['processed']);
check('forecast does not alter final total',60,(int)Db::one('SELECT SUM(credited_days) n FROM personnel_seniority_months')['n']);
check('forecast separately persisted',1,(int)Db::one('SELECT COUNT(*) n FROM personnel_seniority_forecasts')['n']);
check('forecast repeat idempotent',1,SeniorityPeriods::run('1406-01',[1],7)['skipped']);
$second=new PDO('mysql:host='.$host.';port=3306;dbname='.$dbname.';charset=utf8mb4',getenv('MYSQL_USER')?:'root',getenv('MYSQL_PASSWORD')?:'testsecret');
$lock='seniority-period:'.substr(hash('sha256',$dbname),0,14).':1405-09:final';
$second->prepare('SELECT GET_LOCK(?,0)')->execute([$lock]);
try {
  try {SeniorityPeriods::run('1405-09',[1],7); throw new RuntimeException('concurrent run was not rejected');}
  catch(RuntimeException $e) {check('concurrent attempt rejected',409,$e->getCode());}
} finally { $second->prepare('SELECT RELEASE_LOCK(?)')->execute([$lock]); }
Db::$failAudit=true;
check('atomic rollback on history failure',1,SeniorityPeriods::run('1405-09',[1],7)['failed']);
Db::$failAudit=false;
check('rolled back month absent',0,(int)Db::one('SELECT COUNT(*) n FROM personnel_seniority_months WHERE jyear=1405 AND jmonth=9')['n']);
check('existing months untouched by failed run',60,(int)Db::one('SELECT SUM(credited_days) n FROM personnel_seniority_months')['n']);
check('retry after rollback succeeds',1,SeniorityPeriods::run('1405-09',[1],7)['processed']);
check('unique index on monthly entries',1,(int)Db::one("SELECT COUNT(*) n FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name='personnel_seniority_months' AND constraint_type='PRIMARY KEY'")['n']);
echo "PASS real MySQL seniority integration\n";
