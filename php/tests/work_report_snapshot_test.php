<?php
require_once __DIR__.'/../lib/WorkReportSnapshot.php';
function snapshotCheck($ok){if(!$ok)throw new RuntimeException('Snapshot regression');}
function snapshotReject(callable $fn){try{$fn();}catch(RuntimeException|InvalidArgumentException $e){return;}throw new LogicException('Invalid snapshot accepted');}
$dir=sys_get_temp_dir().'/kh-snapshot-test-'.bin2hex(random_bytes(8));
try{
    $store=new WorkReportSnapshot($dir);
    $context=['year'=>1405,'month'=>8,'finalized'=>true,'forecast_remaining'=>false,'include_surplus'=>false,'template_id'=>1,'template_version'=>2,'policy_version'=>2];
    $records=[['user_id'=>12,'cells'=>['۱','منطقه','بازرس','۱','آزمون','نمونه','۰۰۱',1.25,0.0,-2.5],'comments'=>[7=>"متن کامل\nجمعه",8=>'تعطیل',9=>'اضافه']]];
    $token=$store->save(9,$context,$records);
    $data=$store->load(9,$token,$context);
    snapshotCheck($data['records']===$records);
    snapshotReject(fn()=>$store->load(10,$token));
    snapshotReject(fn()=>$store->load(9,$token,['template_version'=>3]));
    snapshotReject(fn()=>$store->load(9,'../unsafe'));
    snapshotReject(fn()=>$store->save(9,$context,[$records[0],$records[0]]));
    $file=$dir.'/'.$token.'.json';
    $envelope=json_decode(file_get_contents($file),true);
    $payload=json_decode($envelope['payload'],true);$payload['expires']=time()-1;
    $envelope['payload']=json_encode($payload,JSON_UNESCAPED_UNICODE);$envelope['sha256']=hash('sha256',$envelope['payload']);
    file_put_contents($file,json_encode($envelope));
    snapshotReject(fn()=>$store->load(9,$token));
    $token=$store->save(9,$context,$records);
    $file=$dir.'/'.$token.'.json';$envelope=json_decode(file_get_contents($file),true);$envelope['sha256']=str_repeat('0',64);file_put_contents($file,json_encode($envelope));
    snapshotReject(fn()=>$store->load(9,$token));
    echo "OK\n";
}finally{foreach(glob($dir.'/*')?:[] as $file)unlink($file);if(is_dir($dir))rmdir($dir);}
