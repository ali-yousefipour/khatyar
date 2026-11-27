<?php
declare(strict_types=1);
date_default_timezone_set('Asia/Tehran');
final class Db {
    public static array $writes=[];
    public static bool $failSecondNotification=false;
    public static function all(string $sql,array $args=[]): array {
        if(!str_contains($sql,'FROM users u LEFT JOIN roles'))throw new LogicException('Unexpected lookup: '.$sql);
        if($args!==[11,22,33])throw new LogicException('Reservation names must be resolved using authenticated ids');
        return [
            ['id'=>11,'name'=>'نیروی اصلی آزمون'],
            ['id'=>22,'name'=>'نیروی جایگزین آزمون'],
            ['id'=>33,'name'=>'مدیر رزرو آزمون']
        ];
    }
    public static function run(string $sql,array $args=[]): void {
        if(self::$failSecondNotification&&str_contains($sql,'INSERT INTO notifications')&&($args[0]??null)===22)
            throw new RuntimeException('simulated notification persistence failure');
        self::$writes[]=[$sql,$args];
    }
}
final class Push {
    public static array $sent=[];
    public static function send(array $ids,string $title,string $message,array $data): void {
        self::$sent[]=[$ids,$title,$message,$data];
    }
}
require_once __DIR__.'/../lib/LeaveSubstituteCoverage.php';
function assertNotice(bool $valid,string $label): void {
    if(!$valid)throw new RuntimeException($label);
    echo "PASS ".$label."\n";
}
$body=['from_jdate'=>'1405-09-02','to_jdate'=>'1405-09-03','user_id'=>999,'absent_name'=>'untrusted name','reserved_by_user_id'=>999];
$notice=LeaveSubstituteCoverage::recordReservation(77,11,22,33,$body);
assertNotice(count(Db::$writes)===3,'reservation audit and two distinct notifications are persisted');
assertNotice(Push::$sent===[],'no push occurs before commit');
assertNotice(Db::$writes[0][1]===[77,11,22,33,'reserved','1405-09-02','1405-09-03'],'audit identity comes from authenticated parameters');
$owner=Db::$writes[1][1];$sub=Db::$writes[2][1];
assertNotice($owner[0]===11&&str_contains($owner[2],'نیروی جایگزین آزمون')&&str_contains($owner[2],'مدیر رزرو آزمون'),'requester receives correct separate substitute and actor names');
assertNotice($sub[0]===22&&str_contains($sub[2],'حضور به‌جای: نیروی اصلی آزمون')&&str_contains($sub[2],'مدیر رزرو آزمون'),'substitute receives authoritative absent employee and actor identities');
assertNotice(!str_contains($sub[2],'untrusted name')&&!str_contains($sub[2],'999'),'untrusted client identities never enter notification');
assertNotice(json_decode($owner[3],true)['recipient']==='requester'&&json_decode($sub[3],true)['recipient']==='substitute','notifications retain recipient scope');
LeaveSubstituteCoverage::sendReservation($notice);
assertNotice(count(Push::$sent)===2&&Push::$sent[0][0]===[11]&&Push::$sent[1][0]===[22],'post-commit push delivered once to each appropriate recipient');
assertNotice(Push::$sent[1][3]['request_id']===77,'substitute push references actual request');
Db::$writes=[];Push::$sent=[];
$revised=LeaveSubstituteCoverage::recordReservation(77,11,22,33,$body,'changed');
assertNotice(str_contains($revised['substitute_message'],'تخصیص شما تغییر کرد'),'replacement edit notification names change');
Db::$writes=[];Push::$sent=[];Db::$failSecondNotification=true;
try {
    LeaveSubstituteCoverage::recordReservation(77,11,22,33,$body);
    throw new LogicException('expected notification failure');
} catch(RuntimeException $e) {
    assertNotice($e->getMessage()==='simulated notification persistence failure'&&Push::$sent===[],'failed second insert cannot send push before transaction completion');
}
echo "Reservation notification contract tests passed\n";
