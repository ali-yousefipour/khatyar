<?php
// Offline invoice validation tests: do not touch production database.
$routes=[];
function route($m,$p,$fn,$public=false,$minLevel=99){global $routes;$routes[]=compact('m','p','fn','public','minLevel');}
class Http { public static function error($message,$code=400){throw new RuntimeException($message,$code);} }
require __DIR__.'/../lib/subscription_invoice_routes.php';
$expected=[
 ['GET','/api/admin/subscription-customers'],
 ['POST','/api/admin/subscription-customers'],
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
if(count($routes)!==5)throw new RuntimeException('Unexpected invoice routes');
echo "PASS invoice route admin auth, integer rial currency and Jalali date validation\n";
