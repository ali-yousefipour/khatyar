<?php
declare(strict_types=1);
date_default_timezone_set('Asia/Tehran');
class Http {
 public static function error($message,$status=400):void {throw new RuntimeException((string)$message,(int)$status);}
}
function route(...$args):void {}
require dirname(__DIR__).'/lib/school_complaints_routes.php';
function assert_rejected(callable $fn):void {
 try{$fn();}catch(RuntimeException $e){if($e->getCode()!==422)throw $e;return;}
 throw new RuntimeException('Expected HTTP 422');
}
if(sc_reception_type('phone')!=='phone'||sc_reception_type('in_person')!=='in_person')throw new RuntimeException('Allowed channels must work');
foreach(['','other','PHONE',null,1] as $invalid)assert_rejected(static fn()=>sc_reception_type($invalid));
$yesterday=(new DateTimeImmutable('yesterday',new DateTimeZone('Asia/Tehran')))->format('Y-m-d 10:00:00');
if(sc_received_date($yesterday)!==$yesterday)throw new RuntimeException('Historical reception dates must be preserved');
$future=(new DateTimeImmutable('+2 days',new DateTimeZone('Asia/Tehran')))->format('Y-m-d H:i:s');
assert_rejected(static fn()=>sc_received_date($future));
assert_rejected(static fn()=>sc_received_date('2026-02-30 10:00:00'));
assert_rejected(static fn()=>sc_received_date('1405/09/04 10:00:00'));
$source=file_get_contents(dirname(__DIR__).'/lib/school_complaints_routes.php');
foreach(['school_complaint_reception_audit','can_edit_reception','reception_type','received_at','created_at'] as $fragment)
 if(!str_contains($source,$fragment))throw new RuntimeException('Missing '.$fragment);
echo "School complaint reception/date validations passed\n";
