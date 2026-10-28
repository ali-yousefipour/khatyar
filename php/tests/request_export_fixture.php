<?php
date_default_timezone_set('Asia/Tehran');
const ADMIN=3;
class Http {static function error($message,$code=400){throw new RuntimeException($message,$code);}}
class Db {static function all($sql,$args=[]){return [[
 'id'=>42,'requester'=>'پرسنل آزمون','type'=>'annual','unit'=>'daily','from_jdate'=>'1405-08-01','to_jdate'=>'1405-08-02','the_date'=>null,'from_time'=>null,'to_time'=>null,'in_time'=>null,'out_time'=>null,'minutes'=>960,'status'=>'rejected','approver'=>'مدیر آزمون','reason'=>'=1+1','approver_note'=>'پاسخ آزمون','created_at'=>'2026-10-22 08:30:00'
 ]];}}
function fa_datetime($value){return '۱۴۰۵/۰۷/۳۰ ۰۸:۳۰';}
function _app_jdate_from_time($value){return '1405/07/30';}
function route($method,$path,$fn,...$options){$GLOBALS['export']=$fn;}
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$a=strpos($source,'function _req_is_root_admin(');$b=strpos($source,'function _req_report_csv_cell(',$a);eval(substr($source,$a,$b-$a));
$a=strpos($source,"route('GET', '/api/admin/requests/export'");$b=strpos($source,'// داشبورد لحظه',$a);
eval(str_replace('__DIR__',var_export(dirname(__DIR__).'/lib',true),substr($source,$a,$b-$a)));
$_GET=['status'=>'rejected','from'=>'2026-10-01','to'=>'2026-10-22'];
$GLOBALS['export']([],[],['id'=>1,'username'=>'admin']);
