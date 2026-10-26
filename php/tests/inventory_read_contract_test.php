<?php
// Execute the real read routes against a query recorder; no production database or data.
class Db {
  static $queries=[];
  static function all($sql,$args=[]){self::$queries[]=[$sql,$args];return [];}
}
function _inv_tables(){}
function _inv_balance($uid){$GLOBALS['balance_uid']=$uid;return [['balance'=>0,'transferable_balance'=>0]];}
function route($method,$path,$handler,...$options){$GLOBALS['routes'][$path]=$handler;}
function check($ok,$why){if(!$ok)throw new RuntimeException($why);}
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$start=strpos($source,"route('GET','/api/inventory/balance'");
$end=strpos($source,"route('GET','/api/admin/inventory/item-types'",$start);
check($start!==false&&$end!==false,'canonical read routes missing');eval(substr($source,$start,$end-$start));
$user=['id'=>17];$routes=$GLOBALS['routes'];
$balance=$routes['/api/inventory/balance']([],[], $user);check($GLOBALS['balance_uid']===17,'balance must use session id');check($balance['items'][0]['balance']===0,'zero balance preserved');
foreach(['pending','history'] as $name){Db::$queries=[];$result=$routes['/api/inventory/'.$name]([],['user_id'=>99],$user);[$sql,$args]=Db::$queries[0];check($args===($name==='pending'?[17]:[17,17]),'caller cannot select another inventory');check(str_contains($sql,$name==='pending'?"t.to_user_id=? AND t.status='pending'":'t.from_user_id=? OR t.to_user_id=?'),'ownership SQL missing');check(!str_contains($sql,',    FROM'),'malformed SQL');check(array_key_exists('items',$result),'Android items contract');}
Db::$queries=[];$routes['/api/inventory/recipients']([],[],$user);check(Db::$queries[1][1]===[17],'exclude current user');check(!str_contains(Db::$queries[1][0],'mobile'),'minimal recipient data');
$a=strpos($source,"route('GET','/api/admin/inventory/ledger'");$b=strpos($source,"route('POST','/api/inventory/deliver'",$a);$ledger=substr($source,$a,$b-$a);check(str_contains($ledger,'WHERE $where'),'admin filters used');check(str_contains($ledger,'LIMIT 500",$pr)'),'filter placeholder parameters');
echo "PASS inventory read contract: session ownership, zero balance, minimal recipients, pending/history and admin filter bindings\n";
