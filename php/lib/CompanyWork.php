<?php
require_once __DIR__.'/Payroll.php';
require_once __DIR__.'/IranCalendar.php';

/** Organization inputs and generated company reports are immutable, private archives. */
class CompanyWork {
  const MONTHS=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  const DAY_MINUTES=453;
  static function fail($message,$code=422){throw new PayrollError($message,$code);}
  static function xml($text){
    if($text===false)self::fail('بخش لازم در فایل اکسل موجود نیست');
    Payroll::validateXml($text);
    $doc=new DOMDocument();
    if(!$doc->loadXML($text,LIBXML_NONET))self::fail('ساختار اکسل نامعتبر است');
    return $doc;
  }
  static function xpath($doc){$xp=new DOMXPath($doc);$xp->registerNamespace('s','http://schemas.openxmlformats.org/spreadsheetml/2006/main');return $xp;}
  static function parse($path,$year,$month){
    Payroll::period($year,$month);
    if(!is_file($path)||filesize($path)>10*1024*1024)self::fail('حداکثر حجم فایل ۱۰ مگابایت است');
    $zip=new ZipArchive();if($zip->open($path)!==true)self::fail('فایل XLSX معتبر نیست');
    try{
      $bytes=0;
      for($i=0;$i<$zip->numFiles;$i++){
        $st=$zip->statIndex($i);$bytes+=$st['size'];
        if($bytes>40*1024*1024||$zip->numFiles>5000)self::fail('حجم بازشدهٔ اکسل بیش از حد مجاز است');
        if(preg_match('~vbaProject|externalLinks/~i',$st['name']))self::fail('فایل باید XLSX بدون ماکرو یا پیوند خارجی باشد');
      }
      $book=self::xml($zip->getFromName('xl/workbook.xml'));
      $sheet=self::xpath($book)->query('//s:sheets/s:sheet')->item(0);
      if(!$sheet)self::fail('شیت اول فایل یافت نشد');
      $rid=$sheet->getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
      $rels=self::xml($zip->getFromName('xl/_rels/workbook.xml.rels'));$part=null;
      foreach($rels->getElementsByTagName('Relationship') as $rel)if($rel->getAttribute('Id')===$rid && $rel->getAttribute('TargetMode')!=='External')$part=$rel->getAttribute('Target');
      if(!$part||str_contains($part,'..')||!preg_match('~^/?(?:xl/)?worksheets/[A-Za-z0-9_.-]+\.xml$~D',$part))self::fail('مسیر شیت اکسل نامعتبر است');
      $part=ltrim($part,'/');if(!str_starts_with($part,'xl/'))$part='xl/'.$part;
      $strings=[];$shared=$zip->getFromName('xl/sharedStrings.xml');
      if($shared!==false){$doc=self::xml($shared);$xp=self::xpath($doc);foreach($xp->query('//s:si') as $si){$value='';foreach($xp->query('.//s:t',$si) as $t)$value.=$t->textContent;$strings[]=$value;}}
      $doc=self::xml($zip->getFromName($part));$xp=self::xpath($doc);$cells=[];$cellCount=0;
      foreach($xp->query('//s:sheetData/s:row') as $row){
        $n=(int)$row->getAttribute('r');if($n<1||$n>5000)self::fail('حداکثر ۵۰۰۰ ردیف با شمارهٔ معتبر مجاز است');
        foreach($xp->query('s:c',$row) as $cell){
          $ref=$cell->getAttribute('r');if(!preg_match('/^[A-Z]{1,3}([1-9][0-9]*)$/D',$ref,$address)||(int)$address[1]!==$n||array_key_exists($ref,$cells))self::fail('نشانی سلول نامعتبر یا تکراری است');
          if(++$cellCount>60000)self::fail('تعداد سلول‌های فایل بیش از حد مجاز است');
          $v=$xp->query('s:v',$cell)->item(0);$type=$cell->getAttribute('t');
          if($type==='e')self::fail('خطای اکسل در سلول '.$ref);
          if($xp->query('s:f',$cell)->length && (!$v||trim($v->textContent)===''))self::fail('نتیجهٔ فرمول ذخیره نشده است: '.$ref.'؛ فایل را در Excel محاسبه و ذخیره کنید');
          if($type==='inlineStr'){$value='';foreach($xp->query('.//s:t',$cell) as $t)$value.=$t->textContent;}
          elseif($type==='s')$value=$strings[(int)($v->textContent??-1)]??'';
          else $value=$v?$v->textContent:'';
          if(mb_strlen($value)>500)self::fail('متن سلول بیش از حد مجاز است: '.$ref);
          $cells[$ref]=Payroll::normalize($value);
        }
      }
      // Only expand the two grouping columns; names and identifiers must be explicit.
      foreach($xp->query('//s:mergeCells/s:mergeCell') as $merge){
        if(preg_match('/^([BC])(\d+):([BC])(\d+)$/D',$merge->getAttribute('ref'),$m)){
          if((int)$m[4]>5000)self::fail('محدودهٔ ادغام بیش از حد مجاز است');
          $value=$cells[$m[1].$m[2]]??'';
          for($r=(int)$m[2];$r<=(int)$m[4];$r++)for($c=ord($m[1]);$c<=ord($m[3]);$c++)$cells[chr($c).$r]=$value;
        }
      }
      foreach(['C2'=>'سمت','E2'=>'نام','F2'=>'نام خانوادگی','G2'=>'شماره پرسنلی','H3'=>'جمعه','I3'=>'تعطیل','J3'=>'اضافه'] as $ref=>$label)
        if(!str_contains($cells[$ref]??'',$label))self::fail('ستون‌های فایل با نمونهٔ سازمان مطابقت ندارد: '.$ref);
      $title=$cells['A1']??'';
      if(!str_contains($title,(string)$year)||!str_contains($title,self::MONTHS[$month-1]))self::fail('ماه و سال انتخابی با عنوان فایل سازمان مطابقت ندارد');
      $rows=[];
      for($n=4;$n<=5000;$n++){
        $first=$cells['E'.$n]??'';$last=$cells['F'.$n]??'';$code=$cells['G'.$n]??'';
        if($first===''&&$last===''&&$code==='')continue;
        $row=['source_row'=>$n,'first_name'=>$first,'last_name'=>$last,'personnel_code'=>$code,'role'=>$cells['C'.$n]??''];
        foreach(['H'=>'friday_hours','I'=>'holiday_hours','J'=>'overtime_hours'] as $c=>$key){
          $v=str_replace('٫','.',$cells[$c.$n]??'');
          if(preg_match('/[,٬]/u',$v)&&!preg_match('/^\d{1,3}(?:[,٬]\d{3})+(?:\.\d+)?$/uD',$v))self::fail('جداکنندهٔ عدد نامعتبر در سلول '.$c.$n);
          $v=str_replace([',','٬'],'',$v);
          if($v===''){$row[$key]=null;continue;}
          if(preg_match('/^(\d{1,3}):([0-5]\d)$/D',$v,$t))$v=(int)$t[1]+(int)$t[2]/60;
          if(!is_numeric($v)||!is_finite((float)$v)||(float)$v<0||(float)$v>1000)self::fail('ساعت نامعتبر در سلول '.$c.$n);
          $row[$key]=(float)$v;
        }
        $rows[]=$row;
      }
      if(!$rows)self::fail('هیچ ردیف پرسنلی در شیت اول یافت نشد');
      return $rows;
    }finally{$zip->close();}
  }
  static function matchRows($rows,$users){
    $codes=[];$names=[];
    foreach($users as $u){$key=Payroll::identity($u['personnel_code']??'');if($key!==null)$codes[$key][]=$u;$name=Payroll::normalize(($u['first_name']??'').' '.($u['last_name']??''));$names[$name][]=$u;}
    $seen=[];
    foreach($rows as &$r){
      $r['errors']=[];$r['user_id']=null;$key=Payroll::identity($r['personnel_code']);$candidates=$codes[$key??'']??[];
      $name=Payroll::normalize($r['first_name'].' '.$r['last_name']);
      if($key===null||count($candidates)!==1)$r['errors'][]='شماره پرسنلی یافت نشد یا یکتا نیست';
      elseif(Payroll::normalize($candidates[0]['first_name'].' '.$candidates[0]['last_name'])!==$name)$r['errors'][]='نام و نام خانوادگی با شماره پرسنلی مطابقت ندارد';
      else $r['user_id']=(int)$candidates[0]['id'];
      if($r['errors'] && count($names[$name]??[])===1)$r['suggested_code']=$names[$name][0]['personnel_code'];
      if($r['role']==='')$r['errors'][]='سمت در فایل سازمان خالی است';
      foreach(['friday_hours'=>'جمعه‌کاری','holiday_hours'=>'تعطیل‌کاری','overtime_hours'=>'اضافه‌کاری'] as $k=>$label)if($r[$k]===null)$r['errors'][]='ساعت '.$label.' خالی است';
      if($key!==null)$seen[$key]=($seen[$key]??0)+1;
    }unset($r);
    foreach($rows as &$r)if(($seen[Payroll::identity($r['personnel_code'])??'']??0)>1){$r['errors'][]='شماره پرسنلی تکراری در فایل سازمان';$r['user_id']=null;}unset($r);
    return $rows;
  }
  static function users(){return Db::all('SELECT u.id,u.first_name,u.last_name,u.username,u.national_code,u.personnel_code,u.marital_status,u.children_count,u.employment_start_date,u.employment_end_date,u.is_active,u.zone_id,z.name AS zone_name,r.title AS role_title FROM users u LEFT JOIN zones z ON z.id=u.zone_id LEFT JOIN roles r ON r.id=u.role_id');}
  static function schema(){
    static $ready=false;if($ready)return;
    Db::run("CREATE TABLE IF NOT EXISTS company_work_sources (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,jy SMALLINT NOT NULL,jm TINYINT NOT NULL,file_name VARCHAR(255) NOT NULL,storage_key CHAR(32) NOT NULL,sha256 CHAR(64) NOT NULL,rows_json LONGTEXT NOT NULL,created_by BIGINT NOT NULL,created_at DATETIME DEFAULT CURRENT_TIMESTAMP,UNIQUE KEY period_hash(jy,jm,sha256)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    Db::run("CREATE TABLE IF NOT EXISTS company_work_files (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,source_id BIGINT UNSIGNED NOT NULL,jy SMALLINT NOT NULL,jm TINYINT NOT NULL,storage_key CHAR(32) NOT NULL,sha256 CHAR(64) NOT NULL,snapshot_json LONGTEXT NOT NULL,created_by BIGINT NOT NULL,created_at DATETIME DEFAULT CURRENT_TIMESTAMP,KEY period_idx(jy,jm),KEY source_idx(source_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    Db::run("CREATE TABLE IF NOT EXISTS company_work_deleted (kind VARCHAR(10) NOT NULL,archive_id BIGINT UNSIGNED NOT NULL,deleted_by BIGINT NOT NULL,deleted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(kind,archive_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");$ready=true;
  }
  static function reconciliationSchema(){
    Db::run("CREATE TABLE IF NOT EXISTS company_work_reconciliations (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,jy SMALLINT NOT NULL,jm TINYINT NOT NULL,source_id BIGINT UNSIGNED NOT NULL,source_name VARCHAR(255) NOT NULL,source_hash CHAR(64) NOT NULL,backup_json LONGTEXT NOT NULL,backup_hash CHAR(64) NOT NULL,plan_json LONGTEXT NOT NULL,reason VARCHAR(1500) NOT NULL,created_by BIGINT NOT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,reverted_by BIGINT NULL,reverted_at DATETIME NULL,revert_reason VARCHAR(1500) NULL,KEY period_idx(jy,jm)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    Db::run("CREATE TABLE IF NOT EXISTS company_work_reconciliation_state (jy SMALLINT NOT NULL,jm TINYINT NOT NULL,batch_id BIGINT UNSIGNED NULL,PRIMARY KEY(jy,jm)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  }
  /** Monetary allocation only: never change punches, missions or finalized evidence. */
  static function reconciliationPlan($sourceRows,$monthly,$daily,$year,$month,$people=[],$officeScope=null,$selected=[]){
    $byId=array_column($monthly,null,'user_id');$peopleById=array_column($people,null,'id');$result=[];$errors=[];$calendar=[];$conflicts=[];
    foreach($daily as $report)foreach($report['days']??[] as $d){$j=IranCalendar::normalize($d['jdate']??$d['date']??'');if(!$j||substr($j,0,7)!==sprintf('%04d-%02d',$year,$month)||!array_key_exists('is_holiday',$d))continue;$h=(bool)$d['is_holiday'];if(isset($calendar[$j])&&$calendar[$j]!==$h)$conflicts[$j]=true;$calendar[$j]=$h;}
    if($officeScope!==null&&!in_array($officeScope,['role','zone'],true))self::fail('مبنای انتخاب گروه اداری نامعتبر است');
    foreach($sourceRows as $r){
      $uid=(int)($r['user_id']??0);$issues=$r['errors']??[];$m=$byId[$uid]??null;$report=$daily[$uid]??null;
      $person=$peopleById[$uid]??[];$warnings=[];$office=$officeScope&&Payroll::normalize($person[$officeScope==='role'?'role_title':'zone_name']??'')===Payroll::normalize('نیروی اداری مقیم سازمان');
      if(!$uid)$issues[]='هویت شخص با اطلاعات پرسنل تطبیق ندارد';
      if(!is_array($report)||!isset($report['days'])){
        $warnings[]='جزئیات این شخص در نسخهٔ اصلی موجود نیست؛ مبنای پرداخت فقط تأیید سازمان است';$report=['days'=>[]];
        for($n=1;$n<=IranCalendar::monthLength($year,$month);$n++){$j=sprintf('%04d-%02d-%02d',$year,$month,$n);if(!array_key_exists($j,$calendar)||isset($conflicts[$j])){$issues[]='تقویم کامل و سازگار در نسخهٔ اصلی ماه موجود نیست';continue;}$report['days'][]=['jdate'=>$j,'worked'=>null,'is_holiday'=>$calendar[$j]];}
      }
      if(!$m)$warnings[]='خلاصهٔ اولیه موجود نیست؛ مقدار ثبت‌شده نامعلوم و قابل پرداخت مطابق سازمان است';
      foreach(['employment_start_date','employment_end_date'] as $f)if(!empty($person[$f])&&!self::date($person[$f]))$issues[]='تاریخ همکاری نامعتبر است';
      $actual=['overtime'=>0,'holiday'=>0,'friday'=>0];$target=$actual;$bonus=$actual;$days=[];
      if($m){
        foreach(['regular_overtime','mission_min','shortage','holiday','friday'] as $k)if(!isset($m[$k])||!is_numeric($m[$k]))$issues[]='مقدار اصلی '.$k.' در نسخه نهایی موجود نیست';
        $actual=['overtime'=>((int)($m['regular_overtime']??0)+(int)($m['mission_min']??0)-(int)($m['shortage']??0))*60,'holiday'=>(int)($m['holiday']??0)*60,'friday'=>(int)($m['friday']??0)*60];
      }
      foreach(['overtime','holiday','friday'] as $k){
        $v=$r[$k.'_hours']??null;
        if(!is_numeric($v)||!is_finite((float)$v)||(float)$v<0||(float)$v>IranCalendar::monthLength($year,$month)*24)$issues[]='ساعت سازمان نامعتبر است: '.$k;
        else $target[$k]=(int)round((float)$v*3600);
        if(!$m)$actual[$k]=null;
        $bonus[$k]=$actual[$k]===null?null:$target[$k]-$actual[$k];
      }
      $eligible=[];$seen=[];
      if(count($report['days']??[])!==IranCalendar::monthLength($year,$month))$issues[]='تمام روزهای ماه در نسخهٔ اصلی موجود نیست';
      foreach($report['days']??[] as $d){
        $j=IranCalendar::normalize($d['jdate']??$d['date']??'');
        if(!$j||substr($j,0,7)!==sprintf('%04d-%02d',$year,$month)||isset($seen[$j])){$issues[]='تاریخ روزهای نسخهٔ اصلی نامعتبر یا تکراری است';continue;}$seen[$j]=true;
        if(!empty($d['outside_employment_period']))continue;
        $employmentStart=IranCalendar::normalize($person['employment_start_date']??'');$employmentEnd=IranCalendar::normalize($person['employment_end_date']??'');if(($employmentStart&&$j<$employmentStart)||($employmentEnd&&$j>$employmentEnd))continue;
        try{$worked=isset($d['worked'])?self::minutes($d['worked']):null;}catch(PayrollError $e){$issues[]='حضور روزانه در نسخهٔ اصلی نامعتبر است';continue;}
        $eligible[$j]=$d;
      }
      ksort($eligible);$groups=['overtime'=>[],'holiday'=>[],'friday'=>[]];$parts=[];
      foreach($eligible as $j=>$d){
        $friday=self::date($j)->format('w')==='5';$holiday=!empty($d['is_holiday']);
        if(!$friday&&!array_key_exists('is_holiday',$d))$issues[]='وضعیت تعطیلی روز در نسخهٔ اصلی مشخص نیست';
        $k=$friday?'friday':($holiday?'holiday':'overtime');$groups[$k][]=$j;
        $parts[$j]=['overtime'=>0,'holiday'=>0,'friday'=>0];
      }
      foreach($bonus as $k=>$v){$v=$v??0;$n=count($groups[$k]);if(($v!==0||$target[$k]!==0)&&!$n){$issues[]='روز تقویمی واجد شرایط برای تخصیص '.$k.' در نسخهٔ اصلی موجود نیست';continue;}
        $amount=abs($v);foreach($groups[$k] as $i=>$j)$parts[$j][$k]=($v<0?-1:1)*(intdiv($amount,$n)+($i<$amount%$n?1:0));
      }
      $approved=[];foreach($eligible as $j=>$d)$approved[$j]=['overtime'=>0,'holiday'=>0,'friday'=>0];
      foreach($target as $k=>$v){$n=count($groups[$k]);foreach($groups[$k] as $i=>$j)$approved[$j][$k]=intdiv($v,$n)+($i<$v%$n?1:0);}
      $officeDays=0;foreach($eligible as $j=>$d){$officeDay=$office&&in_array($uid,$selected,true)&&in_array($j,$groups['overtime'],true);if($officeDay)$officeDays++;$days[]=['jdate'=>$j,'worked'=>$d['worked']??null,'incentive_seconds'=>$parts[$j],'payable_seconds'=>$approved[$j],'ordinary_day'=>in_array($j,$groups['overtime'],true),'organization_schedule'=>$officeDay?['from'=>'07:00','to'=>'14:33','minutes'=>453,'source'=>'organization_approved_schedule']:null];}
      $payable=$target;
      $issues=array_values(array_unique($issues));$row=['user_id'=>$uid,'name'=>trim(($r['first_name']??'').' '.($r['last_name']??'')),'personnel_code'=>(string)($r['personnel_code']??''),'actual_seconds'=>$actual,'organization_seconds'=>$target,'incentive_seconds'=>$bonus,'payable_seconds'=>$payable,'days'=>$days,'office_schedule_days'=>$officeDays,'office_schedule_minutes'=>$officeDays*453,'office_group'=>$office,'group_basis'=>$officeScope,'warnings'=>$warnings,'errors'=>$issues];
      if($issues)$errors[]=$row['personnel_code'];$result[]=$row;
    }
    if(!$result)self::fail('فایل سازمان فاقد ردیف قابل تطبیق است');
    return ['year'=>$year,'month'=>$month,'rows'=>$result,'has_errors'=>(bool)$errors,'unit'=>'seconds','allocation_version'=>3,'office_scope'=>$officeScope,'allocation'=>'تخصیص حسابداری: جمعه‌کاری فقط جمعه‌ها، تعطیل‌کاری فقط تعطیلات غیرجمعه و اضافه‌کار روزهای عادی؛ تردد و مأموریت واقعی تغییر نمی‌کند'];
  }
  static function reconciliationCandidates($plan){
    $start=self::date(sprintf('%04d-%02d-01',$plan['year'],$plan['month']));$end=$start->modify('+'.IranCalendar::monthLength($plan['year'],$plan['month']).' days');
    $ids=array_values(array_unique(array_filter(array_map('intval',array_column($plan['rows'],'user_id')))));$evidence=[];
    if($ids){$marks=implode(',',array_fill(0,count($ids),'?'));$evidence=Db::all("SELECT id,user_id,check_in,check_out FROM staff_attendance WHERE user_id IN ($marks) AND ((check_in>=? AND check_in<?) OR (check_out>=? AND check_out<?) OR (check_in<? AND (check_out>=? OR check_out IS NULL))) ORDER BY user_id,id",array_merge($ids,[$start->format('Y-m-d H:i:s'),$end->format('Y-m-d H:i:s'),$start->format('Y-m-d H:i:s'),$end->format('Y-m-d H:i:s'),$start->format('Y-m-d H:i:s'),$start->format('Y-m-d H:i:s')]));}
    $present=array_fill_keys(array_map('intval',array_column($evidence,'user_id')),true);$candidates=[];
    foreach($plan['rows'] as $r)if($r['user_id']&&!isset($present[(int)$r['user_id']]))$candidates[]=['user_id'=>(int)$r['user_id'],'name'=>$r['name'],'personnel_code'=>$r['personnel_code'],'eligible'=>!empty($r['office_group'])&&!$r['errors']];
    return ['candidates'=>$candidates,'attendance_hash'=>hash('sha256',self::json($evidence))];
  }
  static function selectOfficeCandidates($plan,$candidates,$selected){
    if(!is_array($selected)||count($selected)>count($candidates))self::fail('فهرست انتخاب پرسنل نامعتبر است');
    $allowed=[];foreach($candidates as $c)if($c['eligible'])$allowed[]=$c['user_id'];$ids=[];
    foreach($selected as $id){if(!is_int($id)||!in_array($id,$allowed,true)||in_array($id,$ids,true))self::fail('انتخاب فقط برای افراد واجد شرایط و بدون تردد این ماه مجاز است');$ids[]=$id;}
    foreach($plan['rows'] as &$r){$chosen=in_array((int)$r['user_id'],$ids,true);$count=0;foreach($r['days'] as &$d){$friday=self::date($d['jdate'])->format('w')==='5';$d['organization_schedule']=null;if($chosen&&!$friday&&!empty($d['ordinary_day'])){$count++;$d['organization_schedule']=['from'=>'07:00','to'=>'14:33','minutes'=>453,'source'=>'organization_approved_schedule'];}}unset($d);$r['office_schedule_days']=$count;$r['office_schedule_minutes']=$count*453;$r['office_selected']=$chosen;}unset($r);
    $plan['selected_user_ids']=$ids;$plan['allocation_version']=4;return $plan;
  }
  static function reconciliationPreview($sourceId,$officeScope=null){
    $s=self::source($sourceId);$y=(int)$s['jy'];$m=(int)$s['jm'];$final=_final_work_month($y,$m);
    if(!$final)self::fail('ابتدا کارکرد ماه انتخابی را نهایی کنید',409);
    $backup=['year'=>$y,'month'=>$m,'monthly_json'=>$final['monthly_json'],'daily_json'=>$final['daily_json'],'finalized_at'=>$final['finalized_at']??null,'finalized_by'=>$final['finalized_by']??null];
    $people=self::users();$plan=self::reconciliationPlan(self::matchRows(json_decode($s['rows_json'],true,512,JSON_THROW_ON_ERROR),$people),_work_snapshot_decode($final['monthly_json']),_work_snapshot_decode($final['daily_json']),$y,$m,$people,$officeScope);
    $eligibility=self::reconciliationCandidates($plan);
    $active=Db::one('SELECT batch_id FROM company_work_reconciliation_state WHERE jy=? AND jm=?',[$y,$m]);
    $token=hash('sha256',self::json([$s['sha256'],$backup,$plan,$eligibility,(int)($active['batch_id']??0)]));
    return $eligibility+['plan'=>$plan,'token'=>$token,'source_id'=>(int)$s['id'],'source_name'=>$s['file_name'],'source_hash'=>$s['sha256'],'backup_hash'=>hash('sha256',self::json($backup)),'backup'=>$backup,'active_id'=>(int)($active['batch_id']??0)];
  }
  static function reconciliationApply($sourceId,$token,$reason,$actor,$officeScope=null,$selected=[]){
    $reason=trim((string)$reason);if(mb_strlen($reason)<3||mb_strlen($reason)>500)self::fail('علت ثبت را بین ۳ تا ۵۰۰ نویسه وارد کنید');
    $s=self::source($sourceId);$y=(int)$s['jy'];$m=(int)$s['jm'];$lock='company-work-reconcile:'.$y.':'.$m;
    if((int)(Db::one('SELECT GET_LOCK(?,10) acquired',[$lock])['acquired']??0)!==1)self::fail('عملیات دیگری برای این ماه در حال اجراست',409);
    $pdo=Db::pdo();try{
      $p=self::reconciliationPreview($sourceId,$officeScope);
      if(!is_string($token)||!hash_equals($p['token'],$token))self::fail('پیش‌نمایش تغییر کرده است؛ مقایسه را دوباره اجرا کنید',409);
      if($p['active_id'])self::fail('برای این ماه تعدیل فعال وجود دارد؛ ابتدا آن را برگشت دهید',409);
      if($p['plan']['has_errors'])self::fail('مغایرت‌های پیش‌نمایش باید پیش از ثبت برطرف شوند',422);
      $pdo->beginTransaction();
      $fresh=self::reconciliationCandidates($p['plan']);if($fresh!==array_intersect_key($p,$fresh))self::fail('وضعیت تردد تغییر کرده است؛ پیش‌نمایش را تازه کنید',409);
      $p['plan']=self::selectOfficeCandidates($p['plan'],$p['candidates'],$selected);
      $id=Db::insert('INSERT INTO company_work_reconciliations(jy,jm,source_id,source_name,source_hash,backup_json,backup_hash,plan_json,reason,created_by) VALUES(?,?,?,?,?,?,?,?,?,?)',[$y,$m,$sourceId,$p['source_name'],$p['source_hash'],self::json($p['backup']),$p['backup_hash'],self::json($p['plan']),$reason,$actor]);
      Db::run('INSERT INTO company_work_reconciliation_state(jy,jm,batch_id) VALUES(?,?,?) ON DUPLICATE KEY UPDATE batch_id=VALUES(batch_id)',[$y,$m,$id]);$pdo->commit();return ['id'=>$id];
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}finally{Db::one('SELECT RELEASE_LOCK(?) released',[$lock]);}
  }
  static function reconciliationRecord($id){$r=Db::one('SELECT * FROM company_work_reconciliations WHERE id=?',[(int)$id]);if(!$r)self::fail('نسخهٔ تطبیق یافت نشد',404);return $r;}
  static function reconciliationRevert($id,$reason,$actor){
    $r=self::reconciliationRecord($id);$reason=trim((string)$reason);if(mb_strlen($reason)<3||mb_strlen($reason)>500)self::fail('علت برگشت را بین ۳ تا ۵۰۰ نویسه وارد کنید');
    $lock='company-work-reconcile:'.$r['jy'].':'.$r['jm'];if((int)(Db::one('SELECT GET_LOCK(?,10) acquired',[$lock])['acquired']??0)!==1)self::fail('عملیات دیگری در حال اجراست',409);
    $pdo=Db::pdo();try{$pdo->beginTransaction();$state=Db::one('SELECT batch_id FROM company_work_reconciliation_state WHERE jy=? AND jm=? FOR UPDATE',[$r['jy'],$r['jm']]);
      if((int)($state['batch_id']??0)!==(int)$id)self::fail('این نسخه فعال نیست؛ فهرست را تازه‌سازی کنید',409);
      Db::run('UPDATE company_work_reconciliations SET reverted_by=?,reverted_at=CURRENT_TIMESTAMP,revert_reason=? WHERE id=?',[$actor,$reason,$id]);
      Db::run('UPDATE company_work_reconciliation_state SET batch_id=NULL WHERE jy=? AND jm=?',[$r['jy'],$r['jm']]);$pdo->commit();return ['reverted'=>true];
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}finally{Db::one('SELECT RELEASE_LOCK(?) released',[$lock]);}
  }
  static function directory(){
    $dir=dirname(__DIR__).'/storage/company_work';
    if(!is_dir($dir)&&!mkdir($dir,0700,true)&&!is_dir($dir))throw new RuntimeException('ساخت آرشیو خصوصی ممکن نشد');
    return $dir;
  }
  static function path($key){if(!preg_match('/^[a-f0-9]{32}$/D',(string)$key))throw new RuntimeException('Invalid archive key');return static::directory().'/'.$key.'.xlsx';}
  static function json($value){return json_encode($value,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);}
  static function archiveRecord($kind,$id){
    $table=match($kind){'sources'=>'company_work_sources','files'=>'company_work_files',default=>null};
    if(!$table||(int)$id<=0)self::fail('شناسهٔ آرشیو نامعتبر است',422);
    $r=Db::one("SELECT a.*,d.deleted_at FROM $table a LEFT JOIN company_work_deleted d ON d.kind=? AND d.archive_id=a.id WHERE a.id=?",[$kind,(int)$id]);
    if(!$r)self::fail('مورد آرشیو یافت نشد',404);return $r;
  }
  static function archiveChange($kind,$id,$actor,$restore=false){
    self::archiveRecord($kind,$id);
    if($restore)Db::run('DELETE FROM company_work_deleted WHERE kind=? AND archive_id=?',[$kind,(int)$id]);
    else Db::run('INSERT INTO company_work_deleted(kind,archive_id,deleted_by) VALUES(?,?,?) ON DUPLICATE KEY UPDATE archive_id=VALUES(archive_id)',[$kind,(int)$id,$actor]);
    return ['id'=>(int)$id,'deleted'=>!$restore];
  }
  static function activeArchive($kind,$id){$r=self::archiveRecord($kind,$id);if(!empty($r['deleted_at']))self::fail('این مورد حذف شده است؛ ابتدا آن را از بخش حذف‌شده‌ها بازیابی کنید',409);return $r;}
  static function source($id){return self::activeArchive('sources',$id);}
  static function import($path,$name,$year,$month,$actor,$commit){
    $rows=self::parse($path,$year,$month);$matched=self::matchRows($rows,self::users());
    if(!$commit)return ['rows'=>$matched,'sha256'=>hash_file('sha256',$path)];
    $hash=hash_file('sha256',$path);$old=Db::one('SELECT id FROM company_work_sources WHERE jy=? AND jm=? AND sha256=?',[$year,$month,$hash]);
    if($old){Db::run("DELETE FROM company_work_deleted WHERE kind='sources' AND archive_id=?",[(int)$old['id']]);return ['id'=>(int)$old['id'],'duplicate'=>true,'rows'=>$matched];}
    $key=bin2hex(random_bytes(16));$target=static::path($key);
    if(!copy($path,$target))throw new RuntimeException('ذخیرهٔ فایل سازمان ناموفق بود');chmod($target,0600);
    try{$id=Db::insert('INSERT INTO company_work_sources(jy,jm,file_name,storage_key,sha256,rows_json,created_by) VALUES(?,?,?,?,?,?,?)',[$year,$month,mb_substr(basename($name),0,250),$key,$hash,self::json($rows),$actor]);}
    catch(Throwable $e){unlink($target);$old=Db::one('SELECT id FROM company_work_sources WHERE jy=? AND jm=? AND sha256=?',[$year,$month,$hash]);if($old){Db::run("DELETE FROM company_work_deleted WHERE kind='sources' AND archive_id=?",[(int)$old['id']]);return ['id'=>(int)$old['id'],'duplicate'=>true,'rows'=>$matched];}throw $e;}
    return ['id'=>$id,'rows'=>$matched];
  }
  static function date($v){$date=IranCalendar::normalize($v);if(!$date)return null;[$gy,$gm,$gd]=IranCalendar::toGregorian(...array_map('intval',explode('-',$date)));return new DateTimeImmutable(sprintf('%04d-%02d-%02d',$gy,$gm,$gd),new DateTimeZone('Asia/Tehran'));}
  /** Union daily and hourly leave so duplicate/overlapping legacy requests cannot inflate totals. */
  static function leaveDays($requests,$from,$to){
    $daily=[];$hourly=[];
    foreach($requests as $r){
      $type=$r['type'];if(!in_array($type,['annual','sick'],true))continue;
      $unit=$r['unit']??'daily';$a=self::date(($unit==='hourly'?$r['the_date']??null:$r['from_jdate']??null)?:($r['the_date']??''));$b=$unit==='hourly'?$a:(self::date(($r['to_jdate']??'')?:($r['from_jdate']??$r['the_date']??'')));
      if(!$a||!$b||$b<$a)self::fail('تاریخ یکی از مرخصی‌های تأییدشده نامعتبر است');
      if($unit==='hourly'){
        $start=$r['from_time']??'';$end=$r['to_time']??'';
        if(!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/D',$start)||!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/D',$end)||$end<=$start)self::fail('ساعت یکی از مرخصی‌های تأییدشده نامعتبر است');
        if($a<$from||$a>$to)continue;$key=$a->format('Y-m-d');$hourly[$type][$key][]= [(int)substr($start,0,2)*60+(int)substr($start,3,2),(int)substr($end,0,2)*60+(int)substr($end,3,2)];
      }else{
        $a=max($a,$from);$b=min($b,$to);for($d=$a;$d<=$b;$d=$d->modify('+1 day'))$daily[$type][$d->format('Y-m-d')]=true;
      }
    }
    $out=[];foreach(['annual','sick'] as $type){
      $minutes=count($daily[$type]??[])*self::DAY_MINUTES;
      foreach($hourly[$type]??[] as $day=>$spans){if(isset($daily[$type][$day]))continue;usort($spans,fn($a,$b)=>$a[0]<=>$b[0]);$end=-1;foreach($spans as [$a,$b]){$minutes+=max(0,$b-max($a,$end));$end=max($end,$b);}}
      $out[$type]=$minutes/self::DAY_MINUTES;
    }return $out;
  }
  /** Build period-specific, auditable notes for the organization's XLSX column W. */
  static function workNotes($user,$requests,$year,$month,$absenceDays){
    $first=sprintf('%04d-%02d-01',(int)$year,(int)$month);
    $last=sprintf('%04d-%02d-%02d',(int)$year,(int)$month,IranCalendar::monthLength($year,$month));
    $human=static fn($date)=>strtr(str_replace('-','/',$date),array_combine(str_split('0123456789'),preg_split('//u','۰۱۲۳۴۵۶۷۸۹',-1,PREG_SPLIT_NO_EMPTY)));
    $notes=[];
    $begin=IranCalendar::normalize($user['employment_start_date']??'');
    $finish=IranCalendar::normalize($user['employment_end_date']??'');
    if($begin && $begin>=$first && $begin<=$last)
      $notes[]='این فرد در تاریخ '.$human($begin).' شروع به کار نموده است';
    // Show any already-effective termination date, but never state a future
    // termination as completed in a report for an earlier month.
    if($finish && $finish<=$last)
      $notes[]='این فرد در تاریخ '.$human($finish).' به همکاری خود پایان داده است';
    if((float)$absenceDays>0)
      $notes[]='تعداد روز غیبت: '.$human((string)(floor((float)$absenceDays)==(float)$absenceDays?(int)$absenceDays:(float)$absenceDays));
    $sick=[];
    foreach($requests as $request){
      if(($request['type']??'')!=='sick')continue;
      $hourly=($request['unit']??'daily')==='hourly';
      $from=IranCalendar::normalize($hourly?($request['the_date']??''):($request['from_jdate']??$request['the_date']??''));
      $to=$hourly?$from:IranCalendar::normalize($request['to_jdate']??$request['from_jdate']??$request['the_date']??'');
      if(!$from||!$to||$to<$first||$from>$last)continue;
      $from=max($from,$first);$to=min($to,$last);
      $key=$from.'|'.$to;
      $sick[$key]='استعلاجی از تاریخ '.$human($from).' تا تاریخ '.$human($to);
    }
    ksort($sick,SORT_STRING);
    foreach($sick as $part)$notes[]=$part;
    return implode('؛ ',$notes);
  }
  static function minutes($v){if(is_numeric($v))return (float)$v;if(preg_match('/^(\d+):([0-5]\d)$/D',(string)$v,$m))return (int)$m[1]*60+(int)$m[2];self::fail('مقدار شب‌کاری گزارش معتبر نیست');}
  static function metrics($user,$report,$requests,$year,$month,$today){
    $from=self::date(sprintf('%04d-%02d-01',$year,$month));$to=$from->modify('+'.(IranCalendar::monthLength($year,$month)-1).' days');
    foreach(['employment_start_date','employment_end_date'] as $field)if(!empty($user[$field])&&!self::date($user[$field]))self::fail('تاریخ همکاری پرسنل نامعتبر است');
    $start=self::date($user['employment_start_date']??'');$end=self::date($user['employment_end_date']??'');if($start)$from=max($from,$start);if($end)$to=min($to,$end);
    $days=$to<$from?0:(int)$from->diff($to)->days+1;$cut=min($to,$today);$absence=0;$night=0;
    foreach($report['days']??[] as $d){$date=self::date($d['jdate']??'');if(!$date||$date<$from||$date>$cut||!empty($d['outside_employment_period']))continue;
      // Today's shift may still be in progress. Never create absence for today/future.
      if($date<$today)$absence+=!empty($d['absent'])?1:0;
      $night+=self::minutes($d['night']??'00:00');
    }
    $leave=$cut<$from?['annual'=>0,'sick'=>0]:self::leaveDays($requests,$from,$cut);
    return ['days'=>$days,'leave_days'=>$leave['annual'],'absence_days'=>$absence,'sick_days'=>$leave['sick'],'night_hours'=>$night/60];
  }
  static function activeOfficeBasis($year,$month,$sourceId){
    if(!function_exists('_db_table_exists_safe')||!_db_table_exists_safe('company_work_reconciliation_state'))return null;
    $b=Db::one('SELECT b.id,b.source_id,b.plan_json FROM company_work_reconciliation_state s JOIN company_work_reconciliations b ON b.id=s.batch_id WHERE s.jy=? AND s.jm=?',[$year,$month]);
    if(!$b)return null;
    if((int)$b['source_id']!==(int)$sourceId)self::fail('تعدیل فعال این ماه به فایل سازمان دیگری مربوط است؛ ابتدا نسخهٔ مناسب را تعیین کنید',409);
    $plan=json_decode($b['plan_json'],true,512,JSON_THROW_ON_ERROR);
    return ['id'=>(int)$b['id'],'rows'=>array_column($plan['rows'],null,'user_id')];
  }
  static function officePaymentReport($report,$approved){
    $original=[];foreach($report['days']??[] as $d){$j=IranCalendar::normalize($d['jdate']??$d['date']??'');if($j)$original[$j]=$d;}
    $days=$original;$covered=0;
    foreach($approved['days'] as $p){$j=$p['jdate'];$d=$original[$j]??['jdate'=>$j,'absent'=>0,'night'=>'00:00'];
      if(!empty($p['organization_schedule'])){if(!empty($d['absent']))$covered++;$d['absent']=0;}$days[$j]=$d;
    }
    if($approved['days']){$first=$approved['days'][0]['jdate'];[$y,$m]=array_map('intval',explode('-',substr($first,0,7)));for($n=1;$n<=IranCalendar::monthLength($y,$m);$n++){$j=sprintf('%04d-%02d-%02d',$y,$m,$n);if(!isset($days[$j]))$days[$j]=['jdate'=>$j,'outside_employment_period'=>true,'absent'=>0,'night'=>'00:00'];}}
    ksort($days);return ['report'=>array_replace($report,['days'=>array_values($days)]),'covered_absence_days'=>$covered];
  }
  static function collect($source,$accountField){
    // Archives load cheaply; the explicit generate action alone runs monthly calculations.
    @set_time_limit(300);
    $collectStage='staff_lookup'; $currentUserId=0;
    // A reference connects the user-visible error to its exact server-side exception.
    $diagnosticRef=bin2hex(random_bytes(6));
    try {
    $year=(int)$source['jy'];$month=(int)$source['jm'];$users=self::users();$byId=array_column($users,null,'id');
    $collectStage='identity_matching';
    $rows=self::matchRows(json_decode($source['rows_json'],true,512,JSON_THROW_ON_ERROR),$users);
    $periodStart=self::date(sprintf('%04d/%02d/01',$year,$month));
    $periodEnd=$periodStart->modify('+'.IranCalendar::monthLength($year,$month).' days');
    $fileIds=[];
    $discrepancies=['inactive_in_file'=>[],'unmatched_in_file'=>[],'worked_not_in_file'=>[]];
    foreach($rows as &$r){
      $uid=(int)($r['user_id']??0);
      if(!$uid){
        $discrepancies['unmatched_in_file'][]=['source_row'=>$r['source_row']??null,'name'=>trim(($r['first_name']??'').' '.($r['last_name']??'')),'personnel_code'=>$r['personnel_code']??'','reason'=>implode('؛ ',$r['errors']??[])];
        continue;
      }
      $fileIds[$uid]=true;
      $person=$byId[$uid];
      if(!(int)($person['is_active']??0)){
        $r['errors'][]='کاربر در سامانه غیرفعال است؛ وضعیت همکاری و کارکرد دوره بررسی شود';
        $discrepancies['inactive_in_file'][]=['source_row'=>$r['source_row']??null,'user_id'=>$uid,'name'=>trim($person['first_name'].' '.$person['last_name']),'personnel_code'=>$person['personnel_code']];
      }
    }unset($r);
    // Historical attendance is checked independently of present-day active status.
    $worked=Db::all('SELECT DISTINCT user_id FROM staff_attendance WHERE check_in>=? AND check_in<?',
      [$periodStart->format('Y-m-d H:i:s'),$periodEnd->format('Y-m-d H:i:s')]);
    foreach($worked as $entry){
      $uid=(int)($entry['user_id']??0);
      if(!$uid||isset($fileIds[$uid]))continue;
      $person=$byId[$uid]??null;
      $discrepancies['worked_not_in_file'][]=['user_id'=>$uid,
        'name'=>$person?trim($person['first_name'].' '.$person['last_name']):'کاربر فاقد پرونده',
        'personnel_code'=>$person['personnel_code']??''];
    }
    $collectStage='staff_reconciliation';
    $collectStage='account_field';
    $field=Db::one('SELECT id,label FROM custom_fields WHERE id=? AND is_active=1',[(int)$accountField]);if(!$field)self::fail('فیلد شماره حساب پرسنل را انتخاب کنید');
    $collectStage='account_values';
    $accounts=array_column(Db::all('SELECT user_id,value FROM custom_field_values WHERE field_id=?',[(int)$accountField]),'value','user_id');
    $collectStage='seniority';
    $seniority=array_column(Seniority::listRows()['rows'],null,'id');
    $from=sprintf('%04d/%02d/01',$year,$month);$to=sprintf('%04d/%02d/%02d',$year,$month,IranCalendar::monthLength($year,$month));$today=new DateTimeImmutable('today',new DateTimeZone('Asia/Tehran'));
    if(self::date($from)>$today)self::fail('تولید فایل برای ماه آینده مجاز نیست');
    $collectStage='rotation';
    // Rotate only for the source file's explicitly selected Jalali period.
    $rotationReport=_shift_rotation_report($year,$month);$rotation=array_column($rotationReport['rows'],null,'user_id');
    if(!function_exists('attendance_report_owned_by_entry_date'))require_once dirname(__DIR__).'/app/api/admin-attendance-report-owned.php';
    // The general live report covers only currently active staff. Inactive staff
    // in the approved organization source still need their historical punches.
    // Fetch them together, rather than issuing an attendance query per employee.
    if($rotationReport['source']==='live'){
      $missingUsers=[];
      foreach($rows as $row){
        $id=(int)($row['user_id']??0);
        if($id>0 && empty($row['errors']) && !isset($rotation[$id]) && isset($byId[$id]))$missingUsers[$id]=$byId[$id];
      }
      if($missingUsers){
        $ids=array_keys($missingUsers);
        $marks=implode(',',array_fill(0,count($ids),'?'));
        $start=self::date($from);$end=self::date($to)->modify('+1 day');
        $punches=Db::all("SELECT id attendance_id,user_id,check_in,check_out FROM staff_attendance WHERE user_id IN ($marks) AND check_in>=? AND check_in<? ORDER BY check_in,id",
          array_merge($ids,[$start->format('Y-m-d H:i:s'),$end->format('Y-m-d H:i:s')]));
        foreach(_shift_rotation_rows(array_values($missingUsers),$punches,$start,$end) as $result)
          $rotation[(int)$result['user_id']]=$result;
      }
    }
    $collectStage='approved_organization_basis';
    $officeBasis=self::activeOfficeBasis($year,$month,(int)$source['id']);$hasErrors=false;
    foreach($rows as &$r){
      if(!$r['user_id']||$r['errors']){$hasErrors=true;continue;}$uid=$r['user_id'];$currentUserId=(int)$uid;$collectStage='personnel_metrics';$u=$byId[$uid];
      $r['national_code']=Payroll::identity(($u['national_code']??'')?:($u['username']??''),true);$r['account']=Payroll::normalize($accounts[$uid]??'');
      if(!$r['national_code'])$r['errors'][]='کد ملی معتبر در اطلاعات پرسنل موجود نیست';
      if(!preg_match('/^\d[0-9 .-]{2,38}\d$/D',$r['account'])||strlen(preg_replace('/\D/','',$r['account']))<4||!preg_match('/[1-9]/',$r['account']))$r['errors'][]='شماره حساب معتبر در فیلد انتخاب‌شده موجود نیست';
      $r['seniority_days']=$seniority[$uid]['seniority_days']??null;if($r['seniority_days']===null)$r['errors'][]='مبنای سنوات پرسنل ثبت نشده است';
      $r['married']=Payroll::normalize($u['marital_status']??'');$r['children']=$u['children_count'];
      $r['marital_code']=in_array($r['married'],['متاهل','متأهل'],true)?1:($r['married']==='مجرد'?0:null);
      // Employment seniority is not proof of all prior insurance contributions.
      $r['child_allowance_warning']=((int)$r['children']>0 && $r['seniority_days']!==null && (int)$r['seniority_days']<720)
        ?'سابقه ثبت‌شده کمتر از ۷۲۰ روز است؛ سابقه بیمه تأمین اجتماعی پیشین و شرایط قانونی حق اولاد بررسی شود.':null;
      if(!in_array($r['married'],['مجرد','متاهل','متأهل'],true))$r['errors'][]='وضعیت تأهل ثبت نشده یا نامعتبر است';
      if($r['children']===null||!preg_match('/^\d+$/D',(string)$r['children']))$r['errors'][]='تعداد فرزند ثبت نشده یا نامعتبر است';
      $approvedOffice=$officeBasis['rows'][$uid]??null;$approvedOffice=!empty($approvedOffice['office_group'])&&!empty($approvedOffice['office_schedule_days'])?$approvedOffice:null;
      $rot=$rotation[$uid]??null;
      // The live fallback for former employees was computed in one batch above.
      // Never fabricate rotation rows when a finalized snapshot lacks this person.
      if($approvedOffice){
        $r['recorded_rotation']=$rot;$planned=[];
        foreach($approvedOffice['days'] as $d)if(!empty($d['organization_schedule'])){$g=self::date($d['jdate'])->format('Y-m-d');$planned[]=['user_id'=>$uid,'check_in'=>$g.' 07:00:00','check_out'=>$g.' 14:33:00','method'=>'organization_approved_schedule'];}
        $rot=_shift_rotation_rows([$u],$planned,self::date($from),self::date($to)->modify('+1 day'))[0]??null;
      }
      if(!$rot||!empty($rot['missing_source']))$r['errors'][]='منبع محاسبهٔ چرخش شیفت موجود نیست';
      foreach(['morning','afternoon','night'] as $k)$r[$k]=$rot[$k]??null;
      $collectStage='attendance_daily';
      $report=attendance_report_owned_by_entry_date($uid,$from,$to);
      if($approvedOffice){$r['organization_basis']=['batch_id'=>$officeBasis['id'],'source'=>'organization_approved_schedule','office_schedule_minutes'=>$approvedOffice['office_schedule_minutes']];$r['recorded_absence_days']=self::metrics($u,$report,[],$year,$month,$today)['absence_days'];$paid=self::officePaymentReport($report,$approvedOffice);$report=$paid['report'];$r['covered_absence_days']=$paid['covered_absence_days'];}
      if(!isset($report['days'])||count($report['days'])!==IranCalendar::monthLength($year,$month))$r['errors'][]='جزئیات کامل روزهای ماه در گزارش تردد موجود نیست';
      $collectStage='approved_leaves';
      $requests=Db::all("SELECT type,unit,from_jdate,to_jdate,the_date,from_time,to_time FROM requests WHERE user_id=? AND status='approved' AND type IN('annual','sick')",[$uid]);
      $collectStage='metrics';
      try{
        $r=array_merge($r,self::metrics($u,$report,$requests,$year,$month,$today));
        $r['notes']=self::workNotes($u,$requests,$year,$month,$r['recorded_absence_days']??$r['absence_days']);
      }catch(PayrollError $e){$r['errors'][]=$e->getMessage();}
      if($r['errors'])$hasErrors=true;
    }unset($r);
    if($discrepancies['worked_not_in_file'])$hasErrors=true;
    return ['discrepancies'=>$discrepancies,'rows'=>$rows,'has_errors'=>$hasErrors,'year'=>$year,'month'=>$month,'account_field'=>['id'=>(int)$field['id'],'label'=>$field['label']],'attendance_source'=>$rotationReport['source'],'as_of'=>$today->format('Y-m-d'),'partial'=>self::date($to)>=$today,'leave_minutes_per_day'=>self::DAY_MINUTES];
    }catch(Throwable $e){
      // A stable diagnostic stage is useful on shared hosting where the admin
      // cannot see the raw exception. Log no employee names or identity data.
      error_log(sprintf('company_work_collect ref=%s stage=%s source=%d period=%d/%d user_id=%d exception=%s message=%s',
        $diagnosticRef,$collectStage,(int)($source['id']??0),(int)($source['jy']??0),(int)($source['jm']??0),
        $currentUserId,get_class($e),str_replace(["\\r","\\n"],' ',substr($e->getMessage(),0,350))));
      if($e instanceof PayrollError)throw $e;
      $stageNames=[
        'staff_lookup'=>'دریافت اطلاعات پرسنل','identity_matching'=>'تطبیق اطلاعات پرسنل',
        'account_field'=>'انتخاب فیلد شماره حساب','account_values'=>'دریافت شماره حساب‌ها',
        'seniority'=>'محاسبه سنوات','rotation'=>'محاسبه چرخش شیفت',
        'approved_organization_basis'=>'تطبیق کارکرد سازمان','personnel_metrics'=>'محاسبات پرسنلی',
        'attendance_daily'=>'دریافت کارکرد روزانه','approved_leaves'=>'دریافت مرخصی‌ها',
        'metrics'=>'محاسبه خلاصه کارکرد'
      ];
      self::fail('محاسبه کارکرد در بخش «'.($stageNames[$collectStage]??'اطلاعات کارکرد').'» با خطای سرور مواجه شد. کد پیگیری: '.$diagnosticRef,503);
    }
  }
  static function setCell($doc,$row,$col,$number,$value,$formula=null){
    $ns=$doc->documentElement->namespaceURI;$cell=null;
    foreach($row->childNodes as $node)if($node instanceof DOMElement && $node->localName==='c' && $node->getAttribute('r')===$col.$number){$cell=$node;break;}
    if(!$cell){$cell=$doc->createElementNS($ns,'c');$row->appendChild($cell);}
    $cell->setAttribute('r',$col.$number);while($cell->firstChild)$cell->removeChild($cell->firstChild);$cell->removeAttribute('t');
    if($formula!==null){$f=$doc->createElementNS($ns,'f');$f->appendChild($doc->createTextNode($formula));$cell->appendChild($f);}
    if(is_int($value)||is_float($value)){$v=$doc->createElementNS($ns,'v');$v->appendChild($doc->createTextNode((string)$value));$cell->appendChild($v);}
    else{
      $cell->setAttribute('t','inlineStr');$is=$doc->createElementNS($ns,'is');$t=$doc->createElementNS($ns,'t');$t->appendChild($doc->createTextNode((string)$value));$is->appendChild($t);$cell->appendChild($is);
    }
    return $cell;
  }
  /** Clone the sanitized reference's styles. All strings are literal cells, never formulas. */
  static function write($snapshot,$target){
    if(empty($snapshot['rows'])||!empty($snapshot['has_errors']))self::fail('ابتدا مغایرت‌های پرسنلی را رفع کنید');
    if(!copy(__DIR__.'/company-work-template.xlsx',$target))throw new RuntimeException('قالب اکسل در دسترس نیست');
    $zip=new ZipArchive();if($zip->open($target)!==true)throw new RuntimeException('ساخت اکسل ناموفق بود');
    try{
      $doc=self::xml($zip->getFromName('xl/worksheets/sheet1.xml'));$xp=self::xpath($doc);$ns=$doc->documentElement->namespaceURI;
      $data=$xp->query('//s:sheetData')->item(0);$pattern=$xp->query('//s:row[@r="4"]')->item(0)->cloneNode(true);$footer=$xp->query('//s:row[@r="111"]')->item(0)->cloneNode(true);
      foreach(iterator_to_array($xp->query('s:row',$data)) as $row)if((int)$row->getAttribute('r')>=4)$data->removeChild($row);
      $styles=self::xml($zip->getFromName('xl/styles.xml'));$sx=self::xpath($styles);$xfs=$sx->query('//s:cellXfs')->item(0);$decimalStyles=[];
      $noteStyles=[];
      $sums=array_fill_keys(range('H','S'),0);$n=3;
      foreach($snapshot['rows'] as $r){
        $n++;$row=$pattern->cloneNode(true);$row->setAttribute('r',(string)$n);$data->appendChild($row);
        foreach($row->childNodes as $cell)if($cell instanceof DOMElement && $cell->localName==='c')$cell->setAttribute('r',preg_replace('/\d+$/',(string)$n,$cell->getAttribute('r')));
        $values=[
          'A'=>$n-3,'B'=>$r['first_name'],'C'=>$r['last_name'],'D'=>$r['personnel_code'],'E'=>$r['national_code'],'F'=>$r['account'],'G'=>$r['role'],
          'H'=>(float)$r['days'],'I'=>(float)$r['leave_days'],'J'=>(float)$r['absence_days'],'K'=>(float)$r['sick_days'],'L'=>$r['days']-$r['absence_days']-$r['sick_days'],
          'M'=>$r['marital_code'],'N'=>(int)$r['children'],'O'=>(float)$r['friday_hours'],'P'=>(float)$r['holiday_hours'],'Q'=>(float)$r['night_hours'],'R'=>(float)$r['overtime_hours'],
          'S'=>$r['seniority_days']/365,'T'=>(float)$r['morning'],'U'=>(float)$r['afternoon'],'V'=>(float)$r['night'],'W'=>(string)($r['notes']??''),'X'=>(float)$r['seniority_days']];
        foreach($values as $col=>$value){
          $cell=self::setCell($doc,$row,$col,$n,$value,$col==='L'?"H$n-J$n-K$n":($col==='S'?"X$n/365":null));
          if($col==='W' && $value!==''){
            // Long Persian notes must remain readable in the generated file.
            $original=(int)$cell->getAttribute('s');
            if(!isset($noteStyles[$original])){
              $xf=$sx->query('s:xf',$xfs)->item($original)->cloneNode(true);
              $alignment=null;
              foreach($xf->childNodes as $part)if($part instanceof DOMElement && $part->localName==='alignment'){$alignment=$part;break;}
              if(!$alignment){$alignment=$styles->createElementNS($styles->documentElement->namespaceURI,'alignment');$xf->appendChild($alignment);}
              $alignment->setAttribute('wrapText','1');
              $alignment->setAttribute('vertical','center');
              $xf->setAttribute('applyAlignment','1');
              $noteStyles[$original]=$sx->query('s:xf',$xfs)->length;
              $xfs->appendChild($xf);
            }
            $cell->setAttribute('s',(string)$noteStyles[$original]);
            $row->setAttribute('ht',(string)min(120,max(30,(int)ceil(mb_strlen((string)$value)/45)*18)));
            $row->setAttribute('customHeight','1');
          }
          if(in_array($col,['I','K','L','O','P','Q','R','S','T','U','V'],true)){
            $original=(int)$cell->getAttribute('s');if(!isset($decimalStyles[$original])){$xf=$sx->query('s:xf',$xfs)->item($original)->cloneNode(true);$xf->setAttribute('numFmtId','4');$xf->setAttribute('applyNumberFormat','1');$decimalStyles[$original]=$sx->query('s:xf',$xfs)->length;$xfs->appendChild($xf);}$cell->setAttribute('s',(string)$decimalStyles[$original]);
          }
          if(array_key_exists($col,$sums)&&is_numeric($value))$sums[$col]+=(float)$value;
        }
      }
      $last=$n;$n++;$footer->setAttribute('r',(string)$n);
      foreach($footer->childNodes as $cell)if($cell instanceof DOMElement && $cell->localName==='c'){$cell->setAttribute('r',preg_replace('/\d+$/',(string)$n,$cell->getAttribute('r')));while($cell->firstChild)$cell->removeChild($cell->firstChild);$cell->removeAttribute('t');}
      $data->appendChild($footer);
      self::setCell($doc,$footer,'A',$n,'جمع کل');foreach($sums as $col=>$sum){
        $cell=self::setCell($doc,$footer,$col,$n,$sum,'SUM('.$col.'4:'.$col.$last.')');
        if(in_array($col,['I','K','L','O','P','Q','R','S'],true)){
          $original=(int)$cell->getAttribute('s');if(!isset($decimalStyles[$original])){$xf=$sx->query('s:xf',$xfs)->item($original)->cloneNode(true);$xf->setAttribute('numFmtId','4');$xf->setAttribute('applyNumberFormat','1');$decimalStyles[$original]=$sx->query('s:xf',$xfs)->length;$xfs->appendChild($xf);}$cell->setAttribute('s',(string)$decimalStyles[$original]);
        }
      }
      $titleRow=$xp->query('//s:row[@r="1"]')->item(0);self::setCell($doc,$titleRow,'A',1,'صورت وضعیت کارکرد پرسنل مدیریت پیمان خطوط تاکسیرانی شهر مشهد مقدس ('.self::MONTHS[$snapshot['month']-1].' '.$snapshot['year'].')');
      foreach($xp->query('//s:mergeCell') as $merge)if(preg_match('/^A111:G111$/',$merge->getAttribute('ref')))$merge->setAttribute('ref','A'.$n.':G'.$n);
      $dimension=$xp->query('//s:dimension')->item(0);if($dimension)$dimension->setAttribute('ref','A1:X'.$n);
      if(!$xp->query('//s:sheetViews')->length){$views=$doc->createElementNS($ns,'sheetViews');$view=$doc->createElementNS($ns,'sheetView');$view->setAttribute('workbookViewId','0');$views->appendChild($view);$before=$xp->query('//s:sheetFormatPr | //s:cols | //s:sheetData')->item(0);$doc->documentElement->insertBefore($views,$before);}
      foreach($xp->query('//s:sheetView') as $view){$view->setAttribute('rightToLeft','1');$pane=$xp->query('s:pane',$view)->item(0);if(!$pane){$pane=$doc->createElementNS($ns,'pane');$view->insertBefore($pane,$view->firstChild);}$pane->setAttribute('ySplit','3');$pane->setAttribute('topLeftCell','A4');$pane->setAttribute('state','frozen');$pane->setAttribute('activePane','bottomLeft');}
      $setup=$xp->query('//s:pageSetup')->item(0);if(!$setup){$setup=$doc->createElementNS($ns,'pageSetup');$doc->documentElement->appendChild($setup);}$setup->setAttribute('orientation','landscape');$setup->setAttribute('fitToWidth','1');$setup->setAttribute('fitToHeight','0');
      $pr=$xp->query('//s:sheetPr')->item(0);if(!$pr){$pr=$doc->createElementNS($ns,'sheetPr');$doc->documentElement->insertBefore($pr,$doc->documentElement->firstChild);}$fit=$doc->createElementNS($ns,'pageSetUpPr');$fit->setAttribute('fitToPage','1');$pr->appendChild($fit);
      $zip->addFromString('xl/worksheets/sheet1.xml',$doc->saveXML());
      $xfs->setAttribute('count',(string)$sx->query('s:xf',$xfs)->length);$zip->addFromString('xl/styles.xml',$styles->saveXML());
      $book=self::xml($zip->getFromName('xl/workbook.xml'));$bx=self::xpath($book);$sheet=$bx->query('//s:sheets/s:sheet')->item(0);$sheetName="'".str_replace("'","''",$sheet->getAttribute('name'))."'";
      if(!$bx->query('//s:bookViews')->length){$views=$book->createElementNS($ns,'bookViews');$views->appendChild($book->createElementNS($ns,'workbookView'));$book->documentElement->insertBefore($views,$sheet->parentNode);}
      $names=$bx->query('//s:definedNames')->item(0);if(!$names){$names=$book->createElementNS($ns,'definedNames');$calc=$bx->query('//s:calcPr')->item(0);$book->documentElement->insertBefore($names,$calc);}
      foreach(['_xlnm.Print_Area'=>$sheetName.'!$A$1:$X$'.$n,'_xlnm.Print_Titles'=>$sheetName.'!$1:$3'] as $key=>$value){$name=null;foreach($names->childNodes as $node)if($node instanceof DOMElement && $node->getAttribute('name')===$key)$name=$node;if(!$name){$name=$book->createElementNS($ns,'definedName');$name->setAttribute('name',$key);$name->setAttribute('localSheetId','0');$names->appendChild($name);}$name->textContent=$value;}
      $calc=$bx->query('//s:calcPr')->item(0);if(!$calc){$calc=$book->createElementNS($ns,'calcPr');$book->documentElement->appendChild($calc);}$calc->setAttribute('calcMode','auto');$calc->setAttribute('fullCalcOnLoad','1');
      $zip->addFromString('xl/workbook.xml',$book->saveXML());
    }finally{$zip->close();}
  }
  static function generate($source,$accountField,$actor){
    // Keep a stage-specific, non-sensitive diagnostic in PHP logs. Never report
    // a successful archive when its actual XLSX or database insert has failed.
    $stage='preflight';$target=null;
    $reference=substr(bin2hex(random_bytes(6)),0,12);
    try{
      $template=__DIR__.'/company-work-template.xlsx';
      if(!is_readable($template) || filesize($template)<100)
        self::fail('قالب اکسل فایل شرکت روی سرور موجود نیست یا قابل خواندن نیست؛ با پشتیبانی تماس بگیرید. کد پیگیری: '.$reference,503);
      if(!class_exists('ZipArchive') || !class_exists('DOMDocument'))
        self::fail('افزونه‌های موردنیاز ساخت اکسل روی سرور فعال نیستند. کد پیگیری: '.$reference,503);
      $stage='collect';
      $snapshot=self::collect($source,$accountField);
      if($snapshot['has_errors'])return ['generated'=>false,'snapshot'=>$snapshot];
      $stage='archive_directory';
      $key=bin2hex(random_bytes(16));$target=static::path($key);
      if(!is_writable(dirname($target)))
        self::fail('پوشه آرشیو خصوصی فایل شرکت قابل نوشتن نیست. کد پیگیری: '.$reference,503);
      $stage='xlsx';
      self::write($snapshot,$target);
      @chmod($target,0600);
      if(!is_file($target)||filesize($target)<100)
        self::fail('ساخت یا ذخیره فایل اکسل کامل نشد. کد پیگیری: '.$reference,503);
      $hash=hash_file('sha256',$target);
      if(!is_string($hash)||strlen($hash)!==64)
        self::fail('اعتبارسنجی فایل خروجی ناموفق بود. کد پیگیری: '.$reference,503);
      $stage='database_archive';
      $id=Db::insert('INSERT INTO company_work_files(source_id,jy,jm,storage_key,sha256,snapshot_json,created_by) VALUES(?,?,?,?,?,?,?)',[(int)$source['id'],(int)$source['jy'],(int)$source['jm'],$key,$hash,self::json($snapshot),$actor]);
      return ['generated'=>true,'id'=>$id,'snapshot'=>$snapshot];
    }catch(Throwable $e){
      if($target!==null && is_file($target))@unlink($target);
      error_log(sprintf('company_work_generate failure ref=%s source=%d period=%d/%d stage=%s exception=%s message=%s',
        $reference,(int)($source['id']??0),(int)($source['jy']??0),(int)($source['jm']??0),
        $stage,get_class($e),str_replace(["\\r","\\n"],' ',substr($e->getMessage(),0,350))));
      if($e instanceof PayrollError)throw $e;
      self::fail('ساخت و آرشیو فایل شرکت در مرحله «'.[
        'preflight'=>'آماده‌سازی','collect'=>'محاسبه کارکرد','archive_directory'=>'دسترسی آرشیو',
        'xlsx'=>'ساخت اکسل','database_archive'=>'ثبت آرشیو'
      ][$stage].'» با خطای سرور مواجه شد. کد پیگیری: '.$reference,503);
    }
  }
  static function download($record,$filename){
    $path=self::path($record['storage_key']);if(!is_file($path)||!hash_equals($record['sha256'],hash_file('sha256',$path)))self::fail('فایل آرشیو موجود نیست یا صحت آن تأیید نشد',409);
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');header("Content-Disposition: attachment; filename=report.xlsx; filename*=UTF-8''".rawurlencode($filename));header('Content-Length: '.filesize($path));header('Cache-Control: private, no-store');header('X-Content-Type-Options: nosniff');readfile($path);exit;
  }
}
