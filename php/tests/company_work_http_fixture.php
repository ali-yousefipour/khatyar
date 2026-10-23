<?php
// Test-only router. CI invokes PHP's built-in server bound to loopback.
if(PHP_SAPI==='cli' && ($argv[1]??'')==='fixture'){
  require __DIR__.'/company_work_fixture.php';syntheticOrganization($argv[2]);exit;
}
if(PHP_SAPI!=='cli-server'){http_response_code(404);exit;}
const ADMIN=3;
$testRoutes=[];
function route($method,$path,$handler,$public=false,$level=99){$GLOBALS['testRoutes'][$method.' '.$path]=$handler;}
function _monthly_work_report_need($u){}
class Db {
  static function run($sql,$params=[]){}
  static function all($sql,$params=[]){return str_contains($sql,'FROM users')?[
    ['id'=>1,'first_name'=>'آزمایشی','last_name'=>'یک','personnel_code'=>'5'],
    ['id'=>2,'first_name'=>'آزمایشی','last_name'=>'دو','personnel_code'=>'6']
  ]:[];}
}
require __DIR__.'/../lib/Http.php';
require __DIR__.'/../lib/company_work_routes.php';
$body=Http::body();
$handler=$testRoutes[($_SERVER['REQUEST_METHOD']??'').' '.parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH)]??null;
if(!$handler){http_response_code(404);exit;}
$result=$handler([],$body,['id'=>1]);
header('Content-Type: application/json; charset=utf-8');echo json_encode($result,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
