<?php
// Isolated CLI process fixture: no production DB, messages or scheduler actions.
$root=sys_get_temp_dir().'/khatyar-cron-test-'.bin2hex(random_bytes(8));mkdir($root);mkdir($root.'/app');mkdir($root.'/lib');
copy(__DIR__.'/../app/cron_background.php',$root.'/app/cron_background.php');
foreach(['Jwt','Http','Push','Sms','Bale','MessengerBots','ShiftCalc','Media','XlsxWriter','Backup','DeliveryQueue'] as $name)file_put_contents($root.'/lib/'.$name.'.php','<?php');
file_put_contents($root.'/config.php','<?php return [];');
file_put_contents($root.'/lib/Db.php', <<<'CODE'
<?php
class Db {static function one($q,$p=[]){if(str_contains($q,'GET_LOCK'))return ['acquired'=>getenv('CRON_TEST_MODE')==='locked'?0:1];if(str_contains($q,'RELEASE_LOCK')){file_put_contents(__DIR__.'/../released','yes');return ['released'=>1];}return ['value'=>json_encode(getenv('CRON_TEST_MODE')==='missing'?'':'private-test-key')];}}
CODE);
file_put_contents($root.'/lib/routes.php', <<<'CODE'
<?php
foreach([['GET','/api/cron/presence-alert'],['POST','/api/cron/delivery-queue/process'],['POST','/api/cron/system-health-probe']] as [$method,$path])route($method,$path,function($p,$b,$u)use($method,$path){if(($_GET['key']??'')!=='private-test-key'||($b['key']??'')!=='private-test-key'||$_SERVER['REQUEST_METHOD']!==$method||$_SERVER['REQUEST_URI']!==$path||$b['limit']!==50)throw new Exception('bad contract');file_put_contents(__DIR__.'/../called',$path);if(getenv('CRON_TEST_MODE')==='fail')throw new RuntimeException('private-test-key secret failure');return ['ok'=>true];});
function _cronlog_record($task,$status,$message,$cli){file_put_contents(__DIR__.'/../logged',json_encode([$task,$status,$message,$cli]));}
CODE);
function check($name,$ok){if(!$ok)throw new RuntimeException($name);echo "PASS $name\n";}
function invokeCron($task,$mode='ok'){global $root;$out=[];$exit=null;$env=getenv();$env['CRON_TEST_MODE']=$mode;$pipes=[];$proc=proc_open([PHP_BINARY,$root.'/app/cron_background.php',$task],[1=>['pipe','w'],2=>['pipe','w']],$pipes,null,$env);$text=stream_get_contents($pipes[1]).stream_get_contents($pipes[2]);foreach($pipes as $pipe)fclose($pipe);$exit=proc_close($proc);return [$exit,$text];}
try{
 [$exit,$text]=invokeCron('--check');check('bootstrap captures all existing handlers without execution',$exit===0&&!file_exists($root.'/called'));
 [$exit,$text]=invokeCron('arbitrary-admin-task');check('unknown tasks cannot invoke another API',$exit===2&&!file_exists($root.'/called'));
 foreach(['presence-alert','delivery-queue','system-health'] as $task){[$exit,$text]=invokeCron($task);check('existing handler contract '.$task,$exit===0&&str_contains($text,'"ok":true')&&file_exists($root.'/released')&&!str_contains($text,'private-test-key'));}
 unlink($root.'/called');[$exit,$text]=invokeCron('presence-alert','locked');check('overlapping execution skipped without invoking handler',$exit===0&&!file_exists($root.'/called')&&str_contains($text,'already_running'));
 [$exit,$text]=invokeCron('presence-alert','missing');check('empty key rejected before handler',$exit===1&&!file_exists($root.'/called'));
 [$exit,$text]=invokeCron('delivery-queue','fail');check('failure is nonzero and private key never printed',$exit===1&&!str_contains($text,'private-test-key')&&json_decode(file_get_contents($root.'/logged'),true)[1]==='error');
}finally{
 // Only the freshly created, resolved fixture directory can be removed.
 $resolved=realpath($root);if($resolved!==false&&str_starts_with(str_replace('\\','/',$resolved),str_replace('\\','/',realpath(sys_get_temp_dir())).'/khatyar-cron-test-')){foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($resolved,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST) as $item){if($item->isDir())rmdir($item->getPathname());else unlink($item->getPathname());}rmdir($resolved);}
}
