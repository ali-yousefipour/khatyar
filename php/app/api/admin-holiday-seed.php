<?php
/* خطیار — درج امن و idempotent تعطیلات رسمی مرجع */
ini_set('display_errors','0'); date_default_timezone_set('Asia/Tehran');
$ROOT=__DIR__.'/../../'; require_once "$ROOT/lib/Db.php"; require_once "$ROOT/lib/Jwt.php"; require_once "$ROOT/lib/Http.php"; require_once "$ROOT/lib/IranCalendar.php"; $CONFIG=require "$ROOT/config.php";
function hs_json($v,$s=200){http_response_code($s);header('Content-Type: application/json; charset=utf-8');echo json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
function hs_digits($v){return strtr((string)$v,['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']);}
function hs_auth(){global $CONFIG;$tok=Http::bearer();$p=$tok?Jwt::verify($tok,$CONFIG['jwt_secret']):null;if(!$p||empty($p['sub']))hs_json(['error'=>'توکن نامعتبر یا منقضی است'],401);$u=Db::one("SELECT u.id,u.is_active,u.is_admin FROM users u WHERE u.id=? LIMIT 1",[$p['sub']]);if(!$u||!(int)$u['is_active'])hs_json(['error'=>'کاربر نامعتبر است'],401);if(empty($u['is_admin']))hs_json(['error'=>'دسترسی مدیریتی لازم است'],403);}
function hs_cols(){static $c=null;if($c!==null)return$c;$rows=Db::all('SHOW COLUMNS FROM holidays');$c=[];foreach($rows as $r)$c[strtolower((string)$r['Field'])]=true;return$c;}
try{
 hs_auth();
 $y=(int)hs_digits($_GET['year']??''); if($y<1390||$y>1500)$y=(int)date('Y')-621;
 $events=IranCalendar::events($y);$official=[];foreach($events as $j=>$e)if(!empty($e['is_holiday']))$official[$j]=trim((string)($e['title']??'تعطیل رسمی'));
 if(!$official)hs_json(['ok'=>false,'error'=>'فهرست تعطیلات رسمی برای این سال موجود نیست','year'=>$y],422);
 $cols=hs_cols();if(empty($cols['jdate'])||empty($cols['title']))hs_json(['ok'=>false,'error'=>'ساختار جدول holidays شامل jdate و title نیست'],500);
 $sourceCol=!empty($cols['source'])?'source':null;$officialCol=!empty($cols['is_official'])?'is_official':(!empty($cols['official'])?'official':null);
 $inserted=0;$updated=0;$existing=0;$details=[];
 foreach($official as $j=>$title){$old=Db::one('SELECT id,title'.($sourceCol?',source':'').($officialCol?',`'.$officialCol.'`':'').' FROM holidays WHERE jdate IN (?,?) ORDER BY id LIMIT 1',[$j,str_replace('-','/',$j)]);
  if($old){$existing++;$oldTitle=trim((string)($old['title']??''));$newTitle=$oldTitle===''?$title:$oldTitle;if($oldTitle!==''&&mb_strpos($oldTitle,$title,0,'UTF-8')===false)$newTitle=$oldTitle.' | '.$title;
   $set=['title=?'];$args=[$newTitle];if($sourceCol){$set[]='`'.$sourceCol.'`=?';$args[]='official';}if($officialCol){$set[]='`'.$officialCol.'`=?';$args[]=1;}$args[]=$old['id'];Db::query('UPDATE holidays SET '.implode(',',$set).' WHERE id=?',$args);if($newTitle!==$oldTitle||$sourceCol||$officialCol)$updated++;$details[]=['jdate'=>$j,'status'=>'existing','title'=>$newTitle];
  }else{$fields=['jdate','title'];$vals=[$j,$title];if($sourceCol){$fields[]=$sourceCol;$vals[]='official';}if($officialCol){$fields[]=$officialCol;$vals[]=1;}$qs=implode(',',array_fill(0,count($vals),'?'));Db::query('INSERT INTO holidays (`'.implode('`,`',$fields).'`) VALUES ('.$qs.')',$vals);$inserted++;$details[]=['jdate'=>$j,'status'=>'inserted','title'=>$title];}
 }
 hs_json(['ok'=>true,'year'=>$y,'total'=>count($official),'inserted'=>$inserted,'updated'=>$updated,'existing'=>$existing,'details'=>$details]);
}catch(Throwable $e){error_log('admin-holiday-seed: '.$e->getMessage().' @ '.$e->getFile().':'.$e->getLine());hs_json(['ok'=>false,'error'=>'خطای داخلی در درج تعطیلات رسمی'],500);}
