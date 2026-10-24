<?php
require __DIR__.'/../lib/DeliveryQueue.php';
class Db {
 static $writes=[],$fail=false;
 static function run($q,$p=[]){self::$writes[]=[$q,$p];return true;}
 static function all($q,$p=[]){if(self::$fail)throw new RuntimeException('fixture');if(!str_contains($q,'attempts < max_attempts'))throw new LogicException('Retry cap missing');return [['id'=>1,'channel'=>'bale','to_value'=>'fixture','title'=>'test','body'=>'body','payload'=>'{}','target_type'=>'test','target_id'=>1,'attempts'=>2]];}
}
class BaleBot {static function sendToMobile(...$args){DeliveryQueue::enqueue('bale','fixture','','body');return ['ok'=>false,'error'=>'fixture'];}}
function verifyQueue($name,$ok){if(!$ok)throw new LogicException($name);echo "PASS $name\n";}
$r=DeliveryQueue::process(50);verifyQueue('failed retry stays on original row',$r['failed']===1&&!array_filter(Db::$writes,fn($w)=>str_starts_with($w[0],'INSERT INTO delivery_queue')));
verifyQueue('original row keeps retry schedule',(bool)array_filter(Db::$writes,fn($w)=>str_contains($w[0],"status='failed'")&&end($w[1])===1));
verifyQueue('new messages still enqueue after processing',DeliveryQueue::enqueue('bale','fixture','','new')===true);
Db::$fail=true;try{DeliveryQueue::process();}catch(RuntimeException $e){}Db::$fail=false;verifyQueue('processing guard released on exception',DeliveryQueue::enqueue('bale','fixture','','after failure')===true);
