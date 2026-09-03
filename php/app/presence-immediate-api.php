<?php
ini_set('display_errors','0');
$ROOT=__DIR__.'/..';
require "$ROOT/lib/Db.php";
require "$ROOT/lib/Jwt.php";
require "$ROOT/lib/Http.php";
require "$ROOT/lib/Push.php";
$CONFIG=require "$ROOT/config.php";
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');

function pim_json($v,$s=200){http_response_code($s);echo json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
function pim_error($m,$s=400){pim_json(['ok'=>false,'error'=>$m],$s);}
function pim_body(){ $x=json_decode(file_get_contents('php://input'),true); return is_array($x)?$x:$_POST; }
function pim_user(){
  global $CONFIG;
  $tok=Http::bearer();
  $p=$tok?Jwt::verify($tok,$CONFIG['jwt_secret']):null;
  if(!$p||empty($p['sub'])) pim_error('توکن نامعتبر یا منقضی است',401);
  $u=Db::one("SELECT u.*,r.title role_title,r.level,r.is_admin FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.id=? LIMIT 1",[$p['sub']]);
  if(!$u||!(int)$u['is_active']) pim_error('کاربر نامعتبر است',401);
  if((int)($u['level']??0)<3 && empty($u['is_admin'])) pim_error('دسترسی مدیریتی لازم است',403);
  return $u;
}
function pim_setup(){
  try{Db::run("CREATE TABLE IF NOT EXISTS presence_immediate_requests(
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    request_key VARCHAR(64) NOT NULL,
    requested_by INT NOT NULL,
    scope_type VARCHAR(20) NOT NULL,
    role_id INT NULL,
    target_count INT NOT NULL DEFAULT 0,
    sent_count INT NOT NULL DEFAULT 0,
    target_ids LONGTEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id), UNIQUE KEY uq_pir_key(request_key), KEY idx_pir_created(created_at), KEY idx_pir_requested_by(requested_by)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");}catch(Throwable $e){}
}
pim_setup();
$me=pim_user();
$op=$_GET['op']??$_POST['op']??'targets';

if($op==='targets' && ($_SERVER['REQUEST_METHOD']??'GET')==='GET'){
  $roles=Db::all("SELECT id,title,level FROM roles ORDER BY level DESC,title");
  $users=Db::all("SELECT u.id,u.first_name,u.last_name,u.username,u.role_id,r.title role_title FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.is_active=1 ORDER BY r.level DESC,u.first_name,u.last_name,u.id LIMIT 3000");
  $cfgRow=Db::one("SELECT value FROM app_settings WHERE `key`='presence_check'");
  $cfg=$cfgRow?json_decode($cfgRow['value'],true):[];
  $slots=[];foreach(($cfg['slots']??[]) as $s)if(preg_match('/^\\d{2}:\\d{2}$/',(string)$s))$slots[]=$s;
  $slot=$slots[0]??date('H:i');
  pim_json(['ok'=>true,'roles'=>$roles,'users'=>$users,'slot'=>$slot]);
}

if($op==='send' && ($_SERVER['REQUEST_METHOD']??'GET')==='POST'){
  $b=pim_body();
  $scope=(string)($b['scope']??'all');
  $roleId=(int)($b['role_id']??0);
  $ids=array_values(array_unique(array_filter(array_map('intval',$b['user_ids']??[]),fn($x)=>$x>0)));
  $where="u.is_active=1";$args=[];
  if($scope==='role'){
    if(!$roleId)pim_error('سمت انتخاب نشده است',422);
    $where.=" AND u.role_id=?";$args[]=$roleId;
  }elseif($scope==='users'){
    if(!$ids)pim_error('حداقل یک شخص انتخاب کنید',422);
    $where.=" AND u.id IN (".implode(',',array_fill(0,count($ids),'?')).")";$args=array_merge($args,$ids);
  }elseif($scope!=='all') pim_error('نوع هدف نامعتبر است',422);
  $targets=Db::all("SELECT u.id FROM users u WHERE $where AND EXISTS(SELECT 1 FROM push_tokens pt WHERE pt.user_id=u.id)",$args);
  $targetIds=array_values(array_map('intval',array_column($targets,'id')));
  if(!$targetIds)pim_error('برای افراد انتخاب‌شده Push فعال پیدا نشد',404);
  $key='imm_'.bin2hex(random_bytes(16));
  $cfgRow=Db::one("SELECT value FROM app_settings WHERE `key`='presence_check'");$cfg=$cfgRow?json_decode($cfgRow['value'],true):[];
  $slot='';foreach(($cfg['slots']??[]) as $s)if(preg_match('/^\\d{2}:\\d{2}$/',(string)$s)){$slot=$s;break;}
  if($slot==='')$slot=date('H:i');
  $window=max(1,(int)($b['window_minutes']??($cfg['window_minutes']??5)));
  $title='صحت‌سنجی فوری حضور';
  $body="درخواست صحت‌سنجی فوری حضور دریافت شد. لطفاً ظرف {$window} دقیقه سلفی و عکس خودروهای خط را ارسال کنید.";
  $data=['type'=>'presence_check','slot'=>$slot,'window_minutes'=>$window,'immediate'=>true,'request_id'=>$key];
  try{Push::notify($targetIds,$title,$body,$data);}catch(Throwable $e){pim_error('ارسال Push با خطا مواجه شد',502);}
  try{Db::run("INSERT INTO presence_immediate_requests(request_key,requested_by,scope_type,role_id,target_count,sent_count,target_ids) VALUES(?,?,?,?,?,?,?)",[$key,(int)$me['id'],$scope,$scope==='role'?$roleId:null,count($targetIds),count($targetIds),json_encode($targetIds)]);}catch(Throwable $e){}
  pim_json(['ok'=>true,'request_id'=>$key,'sent'=>count($targetIds),'scope'=>$scope,'slot'=>$slot,'window_minutes'=>$window]);
}
pim_error('عملیات نامعتبر است',404);
