<?php
// Khatyar — گزارش → ربات‌های پیام‌رسان
ini_set('display_errors','0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$APP = dirname(__DIR__);
$PHP = dirname($APP);
require_once $PHP.'/lib/Db.php';
require_once $PHP.'/lib/Jwt.php';
require_once $PHP.'/lib/Http.php';
require_once $PHP.'/lib/DeliveryQueue.php';
require_once $PHP.'/lib/Bale.php';
require_once $PHP.'/lib/MessengerBots.php';
$CONFIG = require $PHP.'/config.php';

function rb_out($x,$s=200){ http_response_code($s); echo json_encode($x,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); exit; }
function rb_fail($m,$s=400){ rb_out(['ok'=>false,'error'=>$m],$s); }
function rb_user(){
  global $CONFIG;
  $h=$_SERVER['HTTP_AUTHORIZATION']??'';
  if(!preg_match('/Bearer\s+(.+)/i',$h,$m)) rb_fail('توکن نامعتبر است',401);
  $p=Jwt::verify(trim($m[1]),$CONFIG['jwt_secret']);
  if(!$p) rb_fail('توکن منقضی یا نامعتبر است',401);
  $u=Db::one("SELECT u.id,u.is_active,u.first_name,u.last_name,u.phone FROM users u WHERE u.id=?",[$p['sub']]);
  if(!$u||!(int)$u['is_active']) rb_fail('کاربر نامعتبر',401);
  return $u;
}
function rb_file($data,$name,$index){
  if(!is_string($data)||!preg_match('#^data:([a-zA-Z0-9.+-]+);base64,(.*)$#s',$data,$m)) return null;
  $mime=strtolower($m[1]);
  $allowed=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp','application/pdf'=>'pdf'];
  if(!isset($allowed[$mime])) rb_fail('فرمت پیوست مجاز نیست',422);
  $bin=base64_decode($m[2],true);
  if($bin===false||strlen($bin)>10*1024*1024) rb_fail('حجم پیوست بیش از ۱۰ مگابایت است',422);
  $dir=$APP.'/uploads/report-bot/'.date('Y/m');
  if(!is_dir($dir) && !@mkdir($dir,0775,true)) rb_fail('ایجاد پوشه پیوست انجام نشد',500);
  $safe=preg_replace('/[^a-zA-Z0-9._-]+/','_',basename((string)$name));
  $file=$index.'_'.bin2hex(random_bytes(8)).'.'.$allowed[$mime];
  $abs=$dir.'/'.$file;
  if(file_put_contents($abs,$bin)===false) rb_fail('ذخیره پیوست انجام نشد',500);
  $public=rtrim((string)($GLOBALS['CONFIG']['public_url']??''),'/');
  if($public===''){
    $https=(!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off')?'https':'http';
    $public=$https.'://'.($_SERVER['HTTP_HOST']??'localhost');
  }
  return ['url'=>$public.'/uploads/report-bot/'.date('Y/m').'/'.$file,'mime'=>$mime,'name'=>$safe,'path'=>$abs];
}

$u=rb_user();
$raw=file_get_contents('php://input');
$b=json_decode($raw,true);
if(!is_array($b)) $b=$_POST;
$subject=trim((string)($b['subject']??''));
$body=trim((string)($b['body']??''));
if($subject===''||$body==='') rb_fail('موضوع و متن گزارش الزامی است');

$senderName=trim(($u['first_name']??'').' '.($u['last_name']??''));
if($senderName==='') $senderName='کاربر خطیار';
$text="گزارش جدید خطیار\nفرستنده: {$senderName}\nموضوع: {$subject}\nمتن گزارش:\n{$body}";
$attachments=[];
foreach(array_slice((array)($b['attachments']??[]),0,5) as $i=>$a){
  $f=rb_file($a['data']??null,$a['name']??('attachment-'.$i),$i);
  if($f)$attachments[]=$f;
}

$out=[];
try{
  $chat=BaleBot::findChatForUser((int)$u['id']);
  if($chat){
    $out['bale']=['message'=>BaleBot::sendMessage($chat,$text,['target_type'=>'report','target_id'=>$b['report_id']??null])];
    foreach($attachments as $f){
      $method=str_starts_with($f['mime'],'image/')?'sendPhoto':'sendDocument';
      $payload=['chat_id'=>$chat,str_starts_with($f['mime'],'image/')?'photo':'document'=>$f['url'],'caption'=>($f['name']??'پیوست گزارش')];
      $out['bale']['attachments'][]=BaleBot::request($method,$payload);
    }
  } else $out['bale']=['error'=>'not_connected'];
}catch(Throwable $e){ $out['bale']=['error'=>'delivery_exception','detail'=>$e->getMessage()]; }

foreach(['telegram','eitaa'] as $platform){
  try{
    $sub=Db::one("SELECT chat_id FROM messenger_subscribers WHERE platform=? AND user_id=? AND is_active=1 ORDER BY id DESC LIMIT 1",[$platform,$u['id']]);
    if(!$sub){$out[$platform]=['error'=>'not_connected'];continue;}
    $out[$platform]=['message'=>MessengerBot::sendMessage($platform,$sub['chat_id'],$text,['target_type'=>'report','target_id'=>$b['report_id']??null])];
    foreach($attachments as $f){
      $method=str_starts_with($f['mime'],'image/')?'sendPhoto':'sendDocument';
      $payload=['chat_id'=>$sub['chat_id'],str_starts_with($f['mime'],'image/')?'photo':'document'=>$f['url'],'caption'=>($f['name']??'پیوست گزارش')];
      $out[$platform]['attachments'][]=MessengerBot::request($platform,$method,$payload);
    }
  }catch(Throwable $e){$out[$platform]=['error'=>'delivery_exception','detail'=>$e->getMessage()];}
}

rb_out(['ok'=>true,'sender'=>$senderName,'subject'=>$subject,'attachments'=>count($attachments),'delivery'=>$out]);
