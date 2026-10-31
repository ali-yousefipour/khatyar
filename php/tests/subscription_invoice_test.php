<?php
// Offline invoice validation tests: do not touch production database.
$routes=[];
function route($m,$p,$fn,$public=false,$minLevel=99){global $routes;$routes[]=compact('m','p','fn','public','minLevel');}
class Http { public static function error($message,$code=400){throw new RuntimeException($message,$code);} }
class Db {
  public static $company=null,$inserts=0,$race=false;
  public static function run($sql,$params=[]){return true;}
  public static function one($sql,$params=[]){return str_contains($sql,'FROM kh_subscription_customers')?self::$company:null;}
  public static function insert($sql,$params=[]){self::$inserts++;if(self::$race){self::$company=['id'=>18];$error=new PDOException('duplicate',23000);$error->errorInfo=['23000',1062,'duplicate'];throw $error;}return 17;}
}
require __DIR__.'/../lib/subscription_invoice_routes.php';
$expected=[
 ['GET','/api/admin/subscription-customers'],
 ['POST','/api/admin/subscription-customers'],
 ['GET','/api/admin/invoice-signers'],
 ['POST','/api/admin/invoice-signers'],
 ['POST','/api/admin/invoice-signers/{id}'],
 ['GET','/api/admin/subscription-invoices'],
 ['POST','/api/admin/subscription-invoices'],
 ['POST','/api/admin/subscription-invoices/{id}/status']
];
foreach($expected as [$method,$path]){
 $matched=array_values(array_filter($routes,fn($r)=>$r['m']===$method&&$r['p']===$path));
 if(count($matched)!==1||$matched[0]['public']!==false||$matched[0]['minLevel']!==3)
   throw new RuntimeException("Invoice API auth misconfigured: $method $path");
}
if(kh_inv_rial('1200000')!==1200000)throw new RuntimeException('Correct invoice rial rejected');
if(kh_inv_date('1405-08-05')!=='1405-08-05')throw new RuntimeException('Valid Jalali date rejected');
foreach([['rial','-1'],['rial','1.25'],['rial','invalid'],['date','2026-10-27'],['date','1405-13-01']] as [$type,$value]){
 try{if($type==='rial')kh_inv_rial($value);else kh_inv_date($value);}
 catch(RuntimeException $e){if($e->getCode()===422)continue;throw $e;}
 throw new RuntimeException("Invoice validation wrongly accepted $type: $value");
}
if(count($routes)!==8)throw new RuntimeException('Unexpected invoice routes');
$customerRoute=array_values(array_filter($routes,fn($r)=>$r['m']==='POST'&&$r['p']==='/api/admin/subscription-customers'))[0]['fn'];
$sample=['company_name'=>'شرکت نمونه','phone'=>'09120000000'];
$first=$customerRoute([],$sample,['id'=>1]);
if($first['id']!==17||Db::$inserts!==1)throw new RuntimeException('New company was not inserted');
Db::$company=['id'=>17];$duplicate=$customerRoute([],$sample,['id'=>1]);
if($duplicate['id']!==17||empty($duplicate['existing'])||Db::$inserts!==1)throw new RuntimeException('Existing company was not reused');
Db::$company=null;Db::$race=true;$concurrent=$customerRoute([],$sample,['id'=>1]);
if($concurrent['id']!==18||empty($concurrent['existing']))throw new RuntimeException('Concurrent duplicate insert was not recovered');
echo "PASS invoice route admin auth, integer rial currency and Jalali date validation\n";
