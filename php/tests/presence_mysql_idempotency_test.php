<?php
declare(strict_types=1);
// Two independent CI MySQL connections: verify the exact server advisory-lock
// namespace, per-account request identity and unique index behavior.
$dsn=getenv('WORK_REPORT_TEST_DSN');
if(!$dsn || getenv('WORK_REPORT_TEST_USER')===false)throw new RuntimeException('Isolated MySQL test database required');
$connect=static fn()=>new PDO($dsn,(string)getenv('WORK_REPORT_TEST_USER'),
 (string)getenv('WORK_REPORT_TEST_PASSWORD'),[
 PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
 PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC
]);
$a=$connect();$b=$connect();
if($a->query('SELECT CONNECTION_ID()')->fetchColumn()===$b->query('SELECT CONNECTION_ID()')->fetchColumn())
 throw new RuntimeException('Concurrent test needs distinct MySQL connections');
$a->exec('CREATE TABLE IF NOT EXISTS khatyar_presence_receipt_ci (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL,request_id VARCHAR(128) NULL,slot_date DATE NOT NULL,
 slot VARCHAR(5) NOT NULL,
 UNIQUE KEY uq_presence_user_request_id(user_id,request_id),
 KEY idx_owner_day(user_id,slot_date,slot)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
$a->exec('DELETE FROM khatyar_presence_receipt_ci');
$uid=19;$first='2026-11-27_10:30';$other='imm_'.str_repeat('a',32);
$lock='pc:'.substr(hash('sha256',$uid.'|'.$first),0,60);
$pick=$a->prepare('SELECT GET_LOCK(?,12)');
$pick->execute([$lock]);
if((int)$pick->fetchColumn()!==1)throw new RuntimeException('Unable to obtain primary presence lock');
$check=$a->prepare('SELECT id FROM khatyar_presence_receipt_ci WHERE user_id=? AND request_id=?');
$check->execute([$uid,$first]);
if($check->fetch())throw new RuntimeException('Unexpected pre-existing request receipt');
$a->prepare('INSERT INTO khatyar_presence_receipt_ci(user_id,request_id,slot_date,slot) VALUES(?,?,?,?)')
 ->execute([$uid,$first,'2026-11-27','10:30']);
$compete=$b->prepare('SELECT GET_LOCK(?,0)');
$compete->execute([$lock]);
if((int)$compete->fetchColumn()!==0)
 throw new RuntimeException('Concurrent duplicate submission bypassed the MySQL advisory lock');
$a->prepare('SELECT RELEASE_LOCK(?)')->execute([$lock]);
$compete->execute([$lock]);
if((int)$compete->fetchColumn()!==1)
 throw new RuntimeException('Another connection could not acquire released presence lock');
$check2=$b->prepare('SELECT id FROM khatyar_presence_receipt_ci WHERE user_id=? AND request_id=?');
$check2->execute([$uid,$first]);
$firstId=(int)$check2->fetchColumn();
if($firstId<=0)throw new RuntimeException('Committed request not visible after lock acquisition');
$b->prepare('SELECT RELEASE_LOCK(?)')->execute([$lock]);
try {
 $a->prepare('INSERT INTO khatyar_presence_receipt_ci(user_id,request_id,slot_date,slot) VALUES(?,?,?,?)')
  ->execute([$uid,$first,'2026-11-27','10:30']);
 throw new LogicException('Duplicate user/request ID bypassed unique index');
}catch(PDOException $e){
 if($e->getCode()!=='23000')throw $e;
}
$a->prepare('INSERT INTO khatyar_presence_receipt_ci(user_id,request_id,slot_date,slot) VALUES(?,?,?,?)')
 ->execute([$uid,$other,'2026-11-27','10:30']);
if((int)$a->query('SELECT COUNT(*) FROM khatyar_presence_receipt_ci')->fetchColumn()!==2)
 throw new LogicException('Distinct same-minute immediate challenge incorrectly deduplicated');
$a->exec('DROP TABLE khatyar_presence_receipt_ci');
echo "PASS real MySQL presence challenge: two-connection lock, repeat receipt and distinct same-minute requests\n";
