<?php
declare(strict_types=1);
// Real two-connection MySQL test. Run against an isolated CI database only.
$dsn=getenv('WORK_REPORT_TEST_DSN');
if(!$dsn||getenv('WORK_REPORT_TEST_USER')===false)
    throw new RuntimeException('Isolated MySQL CI database is required');
$make=static function()use($dsn):PDO {
    $pdo=new PDO($dsn,(string)getenv('WORK_REPORT_TEST_USER'),(string)getenv('WORK_REPORT_TEST_PASSWORD'),[
        PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC
    ]);
    return $pdo;
};
$primary=$make();$competitor=$make();
if($primary->query('SELECT CONNECTION_ID()')->fetchColumn()===$competitor->query('SELECT CONNECTION_ID()')->fetchColumn())
    throw new RuntimeException('Two distinct database connections required');
class Http {static function error($message,$code=400){throw new RuntimeException($message,$code);}}
class Db {
    public static PDO $connection;
    static function one($sql,$params=[]){
        $query=self::$connection->prepare($sql);$query->execute($params);return $query->fetch(PDO::FETCH_ASSOC)?:null;
    }
}
require __DIR__.'/../lib/LeaveSubstituteCoverage.php';
$lock=new ReflectionMethod(LeaveSubstituteCoverage::class,'lock');
$unlock=new ReflectionMethod(LeaveSubstituteCoverage::class,'unlock');
$primary->exec('CREATE TABLE IF NOT EXISTS substitute_reservation_race_test (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,substitute_user_id INT NOT NULL,
    day_j VARCHAR(10) NOT NULL,start_min INT NOT NULL,end_min INT NOT NULL,
    KEY idx_race_user_day (substitute_user_id,day_j)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
$primary->exec('DELETE FROM substitute_reservation_race_test');
Db::$connection=$primary;
$lock->invoke(null,42);
$primary->beginTransaction();
$insert=$primary->prepare('INSERT INTO substitute_reservation_race_test(substitute_user_id,day_j,start_min,end_min) VALUES(42,?,?,?)');
$insert->execute(['1405-09-10',360,840]);
$attempt=$competitor->prepare('SELECT GET_LOCK(?,0)');
$attempt->execute(['khatyar:leave-cover:42']);
if((int)$attempt->fetchColumn()!==0)throw new RuntimeException('Concurrent reservation bypassed substitute advisory lock');
$primary->commit();$unlock->invoke(null,42);
Db::$connection=$competitor;
$lock->invoke(null,42);
$conflicts=$competitor->prepare('SELECT COUNT(*) FROM substitute_reservation_race_test WHERE substitute_user_id=42 AND day_j=? AND start_min<? AND end_min>?');
$conflicts->execute(['1405-09-10',900,800]);
if((int)$conflicts->fetchColumn()!==1)throw new RuntimeException('Competing overlapping reservation must be rejected');
$conflicts->execute(['1405-09-10',1320,840]);
if((int)$conflicts->fetchColumn()!==0)throw new RuntimeException('Adjacent half-open intervals must be available');
$competitor->beginTransaction();
$insert2=$competitor->prepare('INSERT INTO substitute_reservation_race_test(substitute_user_id,day_j,start_min,end_min) VALUES(42,?,?,?)');
$insert2->execute(['1405-09-10',840,1320]);
$competitor->commit();$unlock->invoke(null,42);
if((int)$primary->query('SELECT COUNT(*) FROM substitute_reservation_race_test')->fetchColumn()!==2)
    throw new RuntimeException('Expected one original and one adjacent reservation');
echo "PASS independent MySQL connections: advisory serialization, committed conflict, adjacent half-open shifts\\n";
