<?php
declare(strict_types=1);
require_once __DIR__.'/../lib/PresenceChallengeGuard.php';
date_default_timezone_set('Asia/Tehran');
function checkChallenge(bool $condition,string $why): void {if(!$condition)throw new LogicException($why);}
function rejectChallenge(callable $cb,string $why): void {
    try{$cb();}catch(DomainException $e){return;}
    throw new LogicException('Accepted invalid challenge: '.$why);
}
$now=time()-30;
$day=(new DateTimeImmutable('@'.$now))->setTimezone(new DateTimeZone('Asia/Tehran'))->format('Y-m-d');
$slot=(new DateTimeImmutable('@'.$now))->setTimezone(new DateTimeZone('Asia/Tehran'))->format('H:i');
$slotStart=(new DateTimeImmutable($day.' '.$slot.':00',new DateTimeZone('Asia/Tehran')))->getTimestamp();
$fixed=['slot'=>$slot,'request_id'=>$day.'_'.$slot];
$policy=['enabled'=>true,'random_enabled'=>false,'slots'=>[$slot],'window_minutes'=>3];
$noNotice=static fn($uid,$id)=>null;
$noSession=static fn($uid,$start)=>null;
$good=PresenceChallengeGuard::validate($fixed,19,$now,$policy,$noNotice,$noSession);
checkChallenge($good['kind']==='fixed','Fixed request within authoritative window rejected');
rejectChallenge(static fn()=>PresenceChallengeGuard::validate([...$fixed,'request_id'=>$day.'_00:00'],19,$now,$policy,$noNotice,$noSession),'fixed ID mismatch');
rejectChallenge(static fn()=>PresenceChallengeGuard::validate($fixed,19,$slotStart+181,$policy,$noNotice,$noSession),'fixed expired');
rejectChallenge(static fn()=>PresenceChallengeGuard::validate($fixed,19,$now,[...$policy,'random_enabled'=>true],$noNotice,$noSession),'disabled fixed');
$immediate=['slot'=>$slot,'request_id'=>'urgent-19','immediate'=>true];
$found=static fn($uid,$rid)=>$uid===19&&$rid==='urgent-19'?['immediate'=>true,'request_id'=>$rid,'ts'=>$slotStart,'window_minutes'=>3]:null;
checkChallenge(PresenceChallengeGuard::validate($immediate,19,$now,$policy,$found,$noSession)['kind']==='immediate','Authorized immediate challenge rejected');
rejectChallenge(static fn()=>PresenceChallengeGuard::validate($immediate,20,$now,$policy,$found,$noSession),'IDOR immediate');
$started=$now-3600;
$challenge=$now-35;
$randomSlot=(new DateTimeImmutable('@'.$challenge))->setTimezone(new DateTimeZone('Asia/Tehran'))->format('H:i');
$random=['slot'=>$randomSlot,'request_id'=>'local_19_'.$started.'_'.$challenge,'random'=>true];
$session=static fn($uid,$start)=>$uid===19&&$start===$started?['id'=>54,'check_in'=>date('Y-m-d H:i:s',$start),'check_out'=>null]:null;
checkChallenge(PresenceChallengeGuard::validate($random,19,$now,$policy,$noNotice,$session)['kind']==='random','User-scoped offline random challenge rejected');
rejectChallenge(static fn()=>PresenceChallengeGuard::validate($random,20,$now,$policy,$noNotice,$session),'cross-account random');
rejectChallenge(static fn()=>PresenceChallengeGuard::validate($random,19,$now,$policy,$noNotice,$noSession),'random without attendance');
$closed=static fn($uid,$start)=>['id'=>54,'check_in'=>date('Y-m-d H:i:s',$start),'check_out'=>date('Y-m-d H:i:s',$challenge-1)];
rejectChallenge(static fn()=>PresenceChallengeGuard::validate($random,19,$now,$policy,$noNotice,$closed),'random after checkout');
$legacy=[...$random,'request_id'=>'local_'.$started.'_'.$challenge];
checkChallenge(PresenceChallengeGuard::validate($legacy,19,$now,$policy,$noNotice,$session)['kind']==='random','Legacy local ID cannot lose session check');
echo "PASS authoritative presence guard: fixed deadline, immediate IDOR, random identity/session and offline compatibility\n";
