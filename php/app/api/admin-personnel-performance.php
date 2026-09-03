<?php
/* خطیار — endpoint سریع گزارش عملکرد پرسنل
 * این endpoint عمداً از N+1 query برای bill_pay_effective جلوگیری می‌کند.
 */
ini_set('display_errors','0');
date_default_timezone_set('Asia/Tehran');
$ROOT=__DIR__.'/../../';
require "$ROOT/lib/Db.php"; require "$ROOT/lib/Jwt.php"; require "$ROOT/lib/Http.php";
$CONFIG=require "$ROOT/config.php";
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
function pp_json($v,$s=200){http_response_code($s);echo json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
function pp_error($m,$s=400){pp_json(['error'=>$m],$s);}
function pp_en_digits($s){return strtr((string)$s,['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']);}
function pp_j2g($jy,$jm,$jd){
  $jy=(int)$jy-979;$jm=(int)$jm-1;$jd=(int)$jd-1;
  $jdn=365*$jy+intdiv($jy,33)*8+intdiv(($jy%33+3),4);
  $md=[31,31,31,31,31,31,30,30,30,30,30,29];
  for($i=0;$i<$jm;$i++)$jdn+=$md[$i];
  $jdn+=$jd;$g=$jdn+79;$gy=1600+400*intdiv($g,146097);$g%=146097;$leap=true;
  if($g>=36525){$g--; $gy+=100*intdiv($g,36524);$g%=36524;if($g>=365)$g++;else $leap=false;}
  $gy+=4*intdiv($g,1461);$g%=1461;
  if($g>=366){$leap=false;$g--; $gy+=intdiv($g,365);$g%=365;}
  $gd=[31,($leap?29:28),31,30,31,30,31,31,30,31,30,31];$gm=0;
  for(;$gm<12&&$g>=$gd[$gm];$gm++)$g-=$gd[$gm];
  return [$gy,$gm+1,$g+1];
}
function pp_date($v,$end=false){
  $v=trim(pp_en_digits($v));
  if(preg_match('/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/',$v,$m)){
    if((int)$m[1]>=1200){[$y,$mo,$d]=pp_j2g($m[1],$m[2],$m[3]);return sprintf('%04d-%02d-%02d',$y,$mo,$d);}
    return sprintf('%04d-%02d-%02d',$m[1],$m[2],$m[3]);
  }
  return null;
}
function pp_col_exists($table,$col){try{return (bool)Db::one("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=? LIMIT 1",[$table,$col]);}catch(Throwable $e){return false;}}
function pp_auth(){
  global $CONFIG;
  $tok=Http::bearer();$p=$tok?Jwt::verify($tok,$CONFIG['jwt_secret']):null;if(!$p||empty($p['sub']))pp_error('توکن منقضی یا نامعتبر است',401);
  $u=Db::one("SELECT u.id,u.is_active,u.is_admin,r.level,r.title role_title FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=? LIMIT 1",[$p['sub']]);
  if(!$u||!(int)$u['is_active'])pp_error('کاربر نامعتبر',401);
  $unlimited=in_array($u['role_title'],['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد'],true);
  $dt=$p['dt']??'web';$sess=Db::one("SELECT device_id,revoked_at FROM user_sessions WHERE user_id=? AND device_type=?",[$u['id'],$dt]);
  if(!$sess||$sess['revoked_at']||(!$unlimited&&$sess['device_id']!==($p['device_id']??'')))pp_error('نشست منقضی یا باطل شده است',401);
  if(empty($u['is_admin'])&&(int)($u['level']??99)>3)pp_error('دسترسی مدیریتی لازم است',403);
  return $u;
}
function pp_effective_bulk($from,$to){
  $out=[];$clicks=[];
  try{$clicks=Db::all("SELECT user_id,meta,at FROM user_activity WHERE kind='bill_pay_click' AND DATE(at) BETWEEN ? AND ?",[$from,$to]);}catch(Throwable $e){return $out;}
  if(!$clicks)return $out;
  $ids=[];$rows=[];$hasPaid=pp_col_exists('bills','paid_date');
  foreach($clicks as $c){$m=$c['meta']?json_decode($c['meta'],true):null;$bid=is_array($m)?($m['bill_id']??null):null;if($bid!==null&&$bid!==''){$key=(string)$bid;$ids[$key]=true;$rows[]=['uid'=>(int)$c['user_id'],'bill_id'=>$key,'at'=>$c['at']];}}
  if(!$rows)return $out;
  $keys=array_keys($ids);
  foreach(array_chunk($keys,500) as $chunk){
    $in=implode(',',array_fill(0,count($chunk),'?'));
    try{$bs=Db::all("SELECT bill_id,status".($hasPaid?',paid_date':'')." FROM bills WHERE bill_id IN ($in)",$chunk);}catch(Throwable $e){$bs=[];}
    foreach($bs as $b){$key=(string)$b['bill_id'];$bills[$key]=$b;}
  }
  foreach($rows as $c){$bills=$bills??[];$b=$bills[$c['bill_id']]??null;if(!$b)continue;$st=str_replace('‌','',(string)($b['status']??''));if(mb_strpos($st,'پرداخت شده')===false&&mb_strpos($st,'پرداختشده')===false)continue;$ok=true;
    if($hasPaid&&!empty($b['paid_date'])){$ct=strtotime($c['at']);$pt=strtotime($b['paid_date']);$ok=$pt===false||($pt>=$ct&&$pt<=$ct+7*86400);}
    if($ok){$uid=$c['uid'];$out[$uid]=($out[$uid]??0)+1;}
  }
  return $out;
}
$me=pp_auth();
$from=pp_date($_GET['from']??'');$to=pp_date($_GET['to']??'');
if(!$from){$from=date('Y-m-01');}
if(!$to){$to=date('Y-m-d');}
if($from>$to)pp_error('بازه تاریخ نامعتبر است',422);
try{$users=Db::all("SELECT u.id,TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) name,r.title role_title FROM users u LEFT JOIN roles r ON r.id=u.role_id WHERE u.is_active=1 ORDER BY name");}catch(Throwable $e){pp_error('خطا در دریافت فهرست پرسنل',500);}
function pp_counts($sql,$from,$to){try{return Db::all($sql,[$from,$to]);}catch(Throwable $e){return [];}}
$cntCheck=$cntAtt=$cntNotice=$cntOff=$cntRep=$cntSms=$cntSmsAb=$cntBill=[];
foreach(pp_counts("SELECT user_id,COUNT(*) n FROM checklist_submissions WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY user_id",$from,$to) as $r)$cntCheck[$r['user_id']]=(int)$r['n'];
foreach(pp_counts("SELECT user_id,COUNT(*) n FROM attendances WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY user_id",$from,$to) as $r)$cntAtt[$r['user_id']]=(int)$r['n'];
foreach(pp_counts("SELECT user_id,COUNT(*) n FROM notices WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY user_id",$from,$to) as $r)$cntNotice[$r['user_id']]=(int)$r['n'];
foreach(pp_counts("SELECT recorded_by uid,COUNT(*) n FROM official_visits WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY recorded_by",$from,$to) as $r)$cntOff[$r['uid']]=(int)$r['n'];
foreach(pp_counts("SELECT sender_id uid,COUNT(*) n FROM reports WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY sender_id",$from,$to) as $r)$cntRep[$r['uid']]=(int)$r['n'];
if(pp_col_exists('sms_log','sent_by'))foreach(pp_counts("SELECT sent_by uid,COUNT(*) n FROM sms_log WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY sent_by",$from,$to) as $r)$cntSms[$r['uid']]=(int)$r['n'];
if(pp_col_exists('sms_log','bill_id'))foreach(pp_counts("SELECT sent_by uid,COUNT(*) n FROM sms_log WHERE bill_id IS NOT NULL AND DATE(created_at) BETWEEN ? AND ? GROUP BY sent_by",$from,$to) as $r)$cntSmsAb[$r['uid']]=(int)$r['n'];
foreach(pp_counts("SELECT user_id uid,COUNT(*) n FROM user_activity WHERE kind='bill_pay_click' AND DATE(at) BETWEEN ? AND ? GROUP BY user_id",$from,$to) as $r)$cntBill[$r['uid']]=(int)$r['n'];
$eff=pp_effective_bulk($from,$to);$out=[];
foreach($users as $usr){$uid=(int)$usr['id'];$checklists=$cntCheck[$uid]??0;$attendances=$cntAtt[$uid]??0;$notices=$cntNotice[$uid]??0;$officials=$cntOff[$uid]??0;$reports=$cntRep[$uid]??0;$smsTotal=$cntSms[$uid]??0;$smsAb=$cntSmsAb[$uid]??0;$billClicks=$cntBill[$uid]??0;$out[]=['id'=>$uid,'name'=>$usr['name'],'role_title'=>$usr['role_title'],'checklists'=>$checklists,'driver_attendances'=>$attendances,'notices'=>$notices,'official_visits'=>$officials,'reports'=>$reports,'sms_total'=>$smsTotal,'sms_abonman'=>$smsAb,'bill_pay_clicks'=>$billClicks,'bill_pay_effective'=>$eff[$uid]??0,'total'=>$checklists+$attendances+$notices+$officials+$reports];}
usort($out,fn($a,$b)=>$b['total']<=>$a['total']);pp_json(['people'=>$out,'from'=>$from,'to'=>$to]);
