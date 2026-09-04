<?php
/* خطیار — تولید XLSX سمت سرور برای گزارش تردد و کارکرد
 * ورودی: POST JSON {type:"attendance"|"work", data:<same report payload returned by attendance API>}
 * عمداً از دادهٔ گزارش محاسبه‌شده استفاده می‌کند تا منطق تقویم/کارکرد دوباره‌سازی نشود.
 */
ini_set('display_errors','0');
date_default_timezone_set('Asia/Tehran');
$ROOT=__DIR__.'/../../';
require "$ROOT/lib/Db.php";
require "$ROOT/lib/Jwt.php";
require "$ROOT/lib/Http.php";
$CONFIG=require "$ROOT/config.php";

function ax_error($m,$s=400){http_response_code($s);header('Content-Type: application/json; charset=utf-8');echo json_encode(['error'=>$m],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
function ax_auth(){
  global $CONFIG;
  $tok=Http::bearer();
  $p=$tok?Jwt::verify($tok,$CONFIG['jwt_secret']):null;
  if(!$p||empty($p['sub'])) ax_error('توکن منقضی یا نامعتبر است',401);
  $u=Db::one("SELECT u.id,u.is_active,u.is_admin,r.title role_title FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=? LIMIT 1",[$p['sub']]);
  if(!$u||!(int)$u['is_active']) ax_error('کاربر نامعتبر',401);
  $dt=$p['dt']??'web';
  $sess=Db::one("SELECT device_id,revoked_at FROM user_sessions WHERE user_id=? AND device_type=? ORDER BY id DESC LIMIT 1",[$u['id'],$dt]);
  $unlimited=in_array($u['role_title'],['مدیر کل','رییس اداره بازرسی','نیروی اداری ارشد'],true);
  if(!$sess||$sess['revoked_at']||(!$unlimited&&$sess['device_id']!==($p['device_id']??''))) ax_error('نشست منقضی یا باطل شده است',401);
  if(empty($u['is_admin'])) ax_error('دسترسی مدیریتی لازم است',403);
  return $u;
}
function ax_xml($v){return htmlspecialchars((string)$v,ENT_XML1|ENT_COMPAT,'UTF-8');}
function ax_col($n){$s='';while($n>0){$n--; $s=chr(65+($n%26)).$s;$n=intdiv($n,26);}return $s;}
function ax_cell($r,$c,$v,$header=false){$ref=ax_col($c).$r;$txt=ax_xml($v);$style=$header?' s="1"':'';return '<c r="'.$ref.'" t="inlineStr"'.$style.'><is><t xml:space="preserve">'.$txt.'</t></is></c>';}
function ax_sheet($rows){
  $max=1;foreach($rows as $row)$max=max($max,count($row));
  $xml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="20"/><cols>';
  for($i=1;$i<=$max;$i++)$xml.='<col min="'.$i.'" max="'.$i.'" width="18" customWidth="1"/>';
  $xml.='</cols><sheetData>';
  foreach($rows as $ri=>$row){$r=$ri+1;$xml.='<row r="'.$r.'">';foreach(array_values($row) as $ci=>$v)$xml.=ax_cell($r,$ci+1,$v,$ri===0);$xml.='</row>';}
  return $xml.'</sheetData><autoFilter ref="A1:'.ax_col($max).max(1,count($rows)).'"/></worksheet>';
}
function ax_zip($files){
  $data='';$central='';$offset=0;$time=getdate();$dosTime=(($time['hours']<<11)|($time['minutes']<<5)|intdiv($time['seconds'],2));$dosDate=((max(1980,$time['year'])-1980)<<9)|($time['mon']<<5)|$time['mday'];
  foreach($files as $name=>$content){$name=(string)$name;$raw=(string)$content;$crc=crc32($raw);if($crc<0)$crc+=4294967296;$size=strlen($raw);$nb=strlen($name);$data.="\x50\x4b\x03\x04\x14\x00\x00\x00\x00\x00".pack('v',$dosTime).pack('v',$dosDate).pack('V',$crc).pack('V',$size).pack('V',$size).pack('v',$nb).pack('v',0).$name.$raw;$central.="\x50\x4b\x01\x02\x14\x00\x14\x00\x00\x00\x00\x00".pack('v',$dosTime).pack('v',$dosDate).pack('V',$crc).pack('V',$size).pack('V',$size).pack('v',$nb).pack('v',0).pack('v',0).pack('v',0).pack('v',0).pack('V',0).pack('V',$offset).$name;$offset=strlen($data);}
  $count=count($files);return $data.$central."\x50\x4b\x05\x06".pack('v',0).pack('v',0).pack('v',$count).pack('v',$count).pack('V',strlen($central)).pack('V',$offset).pack('v',0);
}
function ax_time($v){return $v===null?'':(string)$v;}
function ax_prepare($type,$data){
  $days=is_array($data['days']??null)?$data['days']:[];
  if(!$days)ax_error('دادهٔ گزارش برای خروجی خالی است',422);
  $rows=[];$summary=[];
  if($type==='attendance'){
    $rows[]=['تاریخ','روز هفته','نوع روز','عنوان تعطیلی/مناسبت','ورود','خروج','کارکرد','حضور در شیفت','کسری کار','اضافه‌کار','جمعه‌کاری','تعطیل‌کاری','شب‌کاری','مازاد'];
    foreach($days as $d){$isFri=!empty($d['is_friday'])||trim((string)($d['weekday']??''))==='جمعه';$p=is_array($d['punches']??null)?$d['punches']:[];$ins=[];$outs=[];foreach($p as $x){if(!empty($x['in']))$ins[]=$x['in'];if(!empty($x['out']))$outs[]=$x['out'];}$rows[]=[(string)($d['jdate']??''),(string)($d['weekday']??''),$isFri?'جمعه':(!empty($d['is_holiday'])?'تعطیل':'عادی'),(string)($d['holiday_title']??''),implode(' | ',$ins),implode(' | ',$outs),(string)($d['worked']??'00:00'),(string)($d['in_shift']??'00:00'),(string)($d['shortage']??'00:00'),(string)($d['overtime']??'00:00'),$isFri?(string)($d['friday_work']??$d['friday']??'00:00'):'00:00',$isFri?'00:00':(string)($d['holiday_work']??$d['holiday']??'00:00'),(string)($d['night_work']??$d['night']??'00:00'),(string)($d['surplus']??'00:00')];}
    $summary=null;
  }else{
    $rows[]=['تاریخ','روز هفته','نوع روز','عنوان تعطیلی/مناسبت','کارکرد','کارکرد مورد انتظار','حضور در شیفت','کسری کار','اضافه‌کار','جمعه‌کاری','تعطیل‌کاری','شب‌کاری','مازاد','تاخیر ورود','تعجیل خروج'];
    $f=$h=$n=$w=$e=$ot=$s=0;
    foreach($days as $d){$isFri=!empty($d['is_friday'])||trim((string)($d['weekday']??''))==='جمعه';$fw=$isFri?ax_minutes($d['friday_work']??$d['friday']??0):0;$hw=$isFri?0:ax_minutes($d['holiday_work']??$d['holiday']??0);$nw=ax_minutes($d['night_work']??$d['night']??0);$f+=$fw;$h+=$hw;$n+=$nw;$w+=ax_minutes($d['worked']??0);$e+=ax_minutes($d['expected']??0);$ot+=ax_minutes($d['overtime']??0);$s+=ax_minutes($d['shortage']??0);$rows[]=[(string)($d['jdate']??''),(string)($d['weekday']??''),$isFri?'جمعه':(!empty($d['is_holiday'])?'تعطیل':'عادی'),(string)($d['holiday_title']??''),(string)($d['worked']??'00:00'),(string)($d['expected']??'00:00'),(string)($d['in_shift']??'00:00'),(string)($d['shortage']??'00:00'),(string)($d['overtime']??'00:00'),ax_hm($fw),ax_hm($hw),ax_hm($nw),(string)($d['surplus']??'00:00'),(string)($d['late_in']??'00:00'),(string)($d['early_out']??'00:00')];}
    $summary=[['شاخص','مقدار'],['کل کارکرد',ax_hm($w)],['کارکرد مورد انتظار',ax_hm($e)],['جمعه‌کاری',ax_hm($f)],['تعطیل‌کاری',ax_hm($h)],['شب‌کاری',ax_hm($n)],['اضافه‌کار',ax_hm($ot)],['کسری کار',ax_hm($s)]];
  }
  return [$rows,$summary];
}
function ax_minutes($v){if(is_numeric($v))return max(0,(int)$v);$s=trim((string)$v);if(preg_match('/^(\d+):(\d{1,2})$/',$s,$m))return (int)$m[1]*60+(int)$m[2];return max(0,(int)preg_replace('/[^0-9-]/','',$s));}
function ax_hm($m){$m=max(0,(int)$m);return sprintf('%02d:%02d',intdiv($m,60),$m%60);}
try{
  ax_auth();
  if($_SERVER['REQUEST_METHOD']!=='POST')ax_error('فقط درخواست POST مجاز است',405);
  $body=json_decode(file_get_contents('php://input'),true);
  if(!is_array($body))ax_error('بدنهٔ JSON نامعتبر است',400);
  $type=($body['type']??'');if(!in_array($type,['attendance','work'],true))ax_error('نوع گزارش نامعتبر است',422);
  $data=$body['data']??null;if(!is_array($data))ax_error('دادهٔ گزارش ارسال نشده است',422);
  [$rows,$summary]=ax_prepare($type,$data);
  $sheet1=ax_sheet($rows);
  $files=['[Content_Types].xml'=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>','_rels/.rels'=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>','xl/_rels/workbook.xml.rels'=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>','xl/workbook.xml'=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="گزارش" sheetId="1" r:id="rId1"/></sheets></workbook>','xl/styles.xml'=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF2F4F7"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="1" borderId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>'];
  $files['xl/worksheets/sheet1.xml']=$sheet1;
  if($summary){$files['xl/worksheets/sheet2.xml']=ax_sheet($summary);$files['xl/workbook.xml']=str_replace('<sheet name="گزارش" sheetId="1" r:id="rId1"/>','<sheet name="گزارش" sheetId="1" r:id="rId1"/><sheet name="خلاصه" sheetId="2" r:id="rId2"/>',$files['xl/workbook.xml']);$files['xl/_rels/workbook.xml.rels']=str_replace('</Relationships>','<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>',$files['xl/_rels/workbook.xml.rels']);$files['[Content_Types].xml']=str_replace('</Types>','<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',$files['[Content_Types].xml']);}
  $name='khatyar-'.$type.'-'.date('Ymd-His').'.xlsx';$xlsx=ax_zip($files);
  header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');header('Content-Disposition: attachment; filename="'.$name.'"');header('Content-Length: '.strlen($xlsx));header('Cache-Control: no-store');echo $xlsx;exit;
}catch(Throwable $e){error_log('admin-attendance-xlsx: '.$e->getMessage().' @ '.$e->getFile().':'.$e->getLine());ax_error('خطای داخلی در تولید فایل Excel',500);}
