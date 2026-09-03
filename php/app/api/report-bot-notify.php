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
  if(!preg_match('/Bearer\\s+(.+)/i',$h,$m)) rb_fail('توکن نامعتبر است',401);
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

function rb_name($row,$fallback='کاربر خطیار') {
  if(!$row) return $fallback;
  $name=trim(($row['first_name']??'').' '.($row['last_name']??''));
  return $name!=='' ? $name : ($row['display_name']??$fallback);
}

/**
 * گزارش اصلی و گردش‌های آن را برای ساخت پیام کامل پیام‌رسان می‌خواند.
 * report_routes منبع ارجاع‌ها و یادداشت‌های ثبت‌شده روی گزارش است.
 */
function rb_report_context($reportId) {
  $reportId=(int)$reportId;
  if($reportId<=0) return null;
  try {
    $r=Db::one("SELECT r.*, u.first_name sender_first_name, u.last_name sender_last_name, u.phone sender_phone
                 FROM reports r LEFT JOIN users u ON u.id=r.sender_id WHERE r.id=? LIMIT 1",[$reportId]);
    if(!$r) return null;
    $routes=[];
    try {
      $rows=Db::all("SELECT rr.id,rr.to_user_id,rr.action,rr.note,rr.actor_id,rr.created_at,
                            a.first_name actor_first_name,a.last_name actor_last_name,
                            t.first_name target_first_name,t.last_name target_last_name
                     FROM report_routes rr
                     LEFT JOIN users a ON a.id=rr.actor_id
                     LEFT JOIN users t ON t.id=rr.to_user_id
                     WHERE rr.report_id=?
                     ORDER BY rr.created_at ASC, rr.id ASC",[$reportId]);
      foreach((array)$rows as $row) $routes[]=$row;
    } catch(Throwable $e) {}
    return ['report'=>$r,'routes'=>$routes];
  } catch(Throwable $e) { return null; }
}

function rb_route_label($action) {
  $a=mb_strtolower(trim((string)$action));
  if(in_array($a,['note','notes','یادداشت','comment','remark'],true)) return 'یادداشت';
  if(in_array($a,['refer','ref','ارجاع','forward','route'],true)) return 'ارجاع';
  if($a==='') return 'اقدام';
  return (string)$action;
}

function rb_format_datetime($value) {
  $v=trim((string)$value);
  if($v==='') return '---';
  try { $dt=new DateTime($v); return $dt->format('Y/m/d H:i'); }
  catch(Throwable $e) { return $v; }
}

function rb_report_text($fallbackUser,$subject,$body,$reportId) {
  $ctx=rb_report_context($reportId);
  $report=$ctx['report']??null;
  $routes=$ctx['routes']??[];

  $sender=$report ? rb_name(['first_name'=>$report['sender_first_name']??'','last_name'=>$report['sender_last_name']??''],$fallbackUser) : $fallbackUser;
  $title=$report ? trim((string)($report['subject']??$subject)) : $subject;
  $content=$report ? trim((string)($report['body']??$body)) : $body;
  $created=$report['created_at']??null;
  if(!$created) $created=date('Y-m-d H:i:s');

  $parts=[
    '📩 گزارش جدید برای بررسی',
    '',
    'موضوع: '.($title!==''?$title:'---'),
    'گزارش‌دهنده: '.$sender,
    'زمان ارسال: '.rb_format_datetime($created),
    '',
    'متن گزارش:',
    $content!==''?$content:'---'
  ];

  // فقط ارجاع/یادداشت‌هایی که توسط اشخاص دیگر ثبت شده‌اند نمایش داده می‌شوند.
  $items=[];
  $senderId=(int)($report['sender_id']??0);
  foreach($routes as $row){
    $actorId=(int)($row['actor_id']??0);
    $note=trim((string)($row['note']??''));
    $target=trim(rb_name(['first_name'=>$row['target_first_name']??'','last_name'=>$row['target_last_name']??''],''));
    if($actorId>0 && $actorId===$senderId && $note==='') continue;
    // اگر گردش صرفاً ارجاع است، خود ارجاع نیز باید نمایش داده شود.
    $label=rb_route_label($row['action']??'');
    $actor=rb_name(['first_name'=>$row['actor_first_name']??'','last_name'=>$row['actor_last_name']??''],'کاربر خطیار');
    $line='👤 '.$actor.' | '.$label.' | 🕐 '.rb_format_datetime($row['created_at']??'');
    if($target!=='') $line.='\nبه: '.$target;
    if($note!=='') $line.='\n'.$note;
    $items[]=$line;
  }

  if($items){
    $parts[]='';
    $parts[]='📌 ارجاعات و یادداشت‌ها:';
    foreach($items as $i=>$item){
      if($i>0) $parts[]='────────────────';
      $parts[]=$item;
    }
  }

  return implode("\n",$parts);
}

$u=rb_user();
$raw=file_get_contents('php://input');
$b=json_decode($raw,true);
if(!is_array($b)) $b=$_POST;
$subject=trim((string)($b['subject']??''));
$body=trim((string)($b['body']??''));
$reportId=(int)($b['report_id']??0);
if($subject===''||$body==='') rb_fail('موضوع و متن گزارش الزامی است');

$senderName=trim(($u['first_name']??'').' '.($u['last_name']??''));
if($senderName==='') $senderName='کاربر خطیار';
$text=rb_report_text($senderName,$subject,$body,$reportId);
$attachments=[];
foreach(array_slice((array)($b['attachments']??[]),0,5) as $i=>$a){
  $f=rb_file($a['data']??null,$a['name']??('attachment-'.$i),$i);
  if($f)$attachments[]=$f;
}

$out=[];
try{
  $chat=BaleBot::findChatForUser((int)$u['id']);
  if($chat){
    $out['bale']=['message'=>BaleBot::sendMessage($chat,$text,['target_type'=>'report','target_id'=>$reportId?:null])];
    foreach($attachments as $f){
      $isImage=(strpos($f['mime'],'image/')===0);
      $method=$isImage?'sendPhoto':'sendDocument';
      $payload=['chat_id'=>$chat,$isImage?'photo':'document'=>$f['url'],'caption'=>($f['name']??'پیوست گزارش')];
      $out['bale']['attachments'][]=BaleBot::request($method,$payload);
    }
  } else $out['bale']=['error'=>'not_connected'];
}catch(Throwable $e){ $out['bale']=['error'=>'delivery_exception','detail'=>$e->getMessage()]; }

foreach(['telegram','eitaa'] as $platform){
  try{
    $sub=Db::one("SELECT chat_id FROM messenger_subscribers WHERE platform=? AND user_id=? AND is_active=1 ORDER BY id DESC LIMIT 1",[$platform,$u['id']]);
    if(!$sub){$out[$platform]=['error'=>'not_connected'];continue;}
    $out[$platform]=['message'=>MessengerBot::sendMessage($platform,$sub['chat_id'],$text,['target_type'=>'report','target_id'=>$reportId?:null])];
    foreach($attachments as $f){
      $isImage=(strpos($f['mime'],'image/')===0);
      $method=$isImage?'sendPhoto':'sendDocument';
      $payload=['chat_id'=>$sub['chat_id'],$isImage?'photo':'document'=>$f['url'],'caption'=>($f['name']??'پیوست گزارش')];
      $out[$platform]['attachments'][]=MessengerBot::request($platform,$method,$payload);
    }
  }catch(Throwable $e){$out[$platform]=['error'=>'delivery_exception','detail'=>$e->getMessage()];}
}

rb_out(['ok'=>true,'sender'=>$senderName,'subject'=>$subject,'report_id'=>$reportId?:null,'attachments'=>count($attachments),'delivery'=>$out]);