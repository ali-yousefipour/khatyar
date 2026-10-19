<?php
class PayrollError extends RuntimeException {}

class Payroll {
  const FIELDS = ['sequence','first_name','last_name','personnel_code','national_code','account','role','days','leave_days','absence_days','sick_days','effective_days','daily_wage','seniority_wage','job_wage','monthly_wage','married','marriage','children','child_allowance','friday_hours','friday_amount','holiday_hours','holiday_amount','night_hours','night_amount','shift_percent','shift_amount','overtime_hours','overtime_amount','housing','food','housing_food','other','gross','advance','insurance','tax','net','bonus','severance','employer_insurance','employer_total'];
  const LABELS = ['ردیف','نام','نام خانوادگی','شماره پرسنلی','کد ملی','شماره حساب','سمت','روز کارکرد کل','مرخصی','غیبت','استعلاجی','روز کارکرد موثر','دستمزد روزانه','مزد سنوات','مزد شغل','حقوق ماهیانه','وضعیت تاهل','حق تاهل','تعداد فرزند','حق اولاد','ساعت جمعه کاری','مبلغ جمعه کاری','ساعت تعطیل کاری','مبلغ تعطیل کاری','ساعت شب کاری','مبلغ شب کاری','درصد نوبت کاری','مبلغ نوبت کاری','ساعت اضافه کار','مبلغ اضافه کار','حق مسکن','حق بن','حق بن و مسکن','متفرقه','جمع حقوق و مزایا','مساعده/سایر کسورات','بیمه تامین اجتماعی','مالیات','خالص پرداختی','عیدی پاداش','سنوات','بیمه سهم کارفرما','کل مبلغ نیروی انسانی'];

  static function normalize($value) {
    return trim(preg_replace('/\s+/u',' ',strtr((string)$value,['ي'=>'ی','ك'=>'ک','۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9',"\u{200c}"=>' '])));
  }
  static function identity($value, $national=false) {
    $value=self::normalize($value);
    if (!preg_match('/^\d+$/D',$value) || (int)$value===0) return null;
    if ($national) return strlen($value)<=10 ? str_pad($value,10,'0',STR_PAD_LEFT) : null;
    return ltrim($value,'0');
  }
  static function period($year,$month) {
    if (!filter_var($year,FILTER_VALIDATE_INT) || !filter_var($month,FILTER_VALIDATE_INT) || $year<1300 || $year>1500 || $month<1 || $month>12) throw new PayrollError('سال یا ماه حقوق نامعتبر است',422);
    return [(int)$year,(int)$month];
  }
  static function validateXml($xml,$formulas=false) {
    if(preg_match('/<!DOCTYPE|<!ENTITY/i',$xml))throw new PayrollError('ساختار XML فایل مجاز نیست',422);
    $previous=libxml_use_internal_errors(true);libxml_clear_errors();$reader=new XMLReader();
    try{
      if(!$reader->XML($xml,null,LIBXML_NONET))throw new PayrollError('ساختار XML اکسل نامعتبر است',422);
      while($reader->read()){
        if($reader->nodeType===XMLReader::DOC_TYPE)throw new PayrollError('ساختار XML فایل مجاز نیست',422);
        if($formulas && $reader->nodeType===XMLReader::ELEMENT && $reader->localName==='c'){
          $cell=simplexml_load_string($reader->readOuterXML(),SimpleXMLElement::class,LIBXML_NONET);
          if($cell!==false && isset($cell->f) && (!isset($cell->v) || trim((string)$cell->v)===''))throw new PayrollError('نتیجهٔ فرمول در اکسل ذخیره نشده است؛ فایل را در Excel محاسبه و دوباره ذخیره کنید',422);
        }
      }
      if(libxml_get_errors())throw new PayrollError('ساختار XML اکسل ناقص یا نامعتبر است',422);
    }finally{$reader->close();libxml_clear_errors();libxml_use_internal_errors($previous);}
  }
  static function parse($path,$year,$month) {
    self::period($year,$month);
    $zip=new ZipArchive();
    if ($zip->open($path)!==true) throw new PayrollError('فایل XLSX معتبر نیست',422);
    $bytes=0;
    for($index=0;$index<$zip->numFiles;$index++){$stat=$zip->statIndex($index);$bytes+=$stat['size'];if($bytes>40*1024*1024 || $zip->numFiles>5000){$zip->close();throw new PayrollError('حجم بازشدهٔ اکسل بیش از حد مجاز است',422);}}
    try{foreach(['xl/sharedStrings.xml','xl/worksheets/sheet1.xml'] as $entry){$xml=$zip->getFromName($entry);if($xml!==false)self::validateXml($xml,$entry==='xl/worksheets/sheet1.xml');}}finally{$zip->close();}
    unset($xml);
    require_once __DIR__.'/Xlsx.php';
    $rows=[];$headers=[];$seen=[];$title='';
    Xlsx::eachRow($path,function($cells,$index)use(&$rows,&$headers,&$seen,&$title,$year,$month){
      if($index>5000)throw new PayrollError('حداکثر ۵۰۰۰ ردیف مجاز است',422);
      if($index===0){$title=self::normalize($cells[0]??'');return;}
      if($index<3){$headers[$index]=$cells;return;}
      $sequence=self::normalize($cells[0]??'');
      if(!preg_match('/^\d+$/D',$sequence)){
        if(self::normalize($cells[1]??'')!=='' || self::normalize($cells[2]??'')!=='')throw new PayrollError('ردیف پرسنلی بدون شمارهٔ معتبر: '.($index+1),422);
        return;
      }
      if(self::normalize($cells[1]??'')==='' && self::normalize($cells[2]??'')===''){
        if(self::identity($cells[3]??'') || self::identity($cells[4]??'',true) || (float)($cells[38]??0)!==0.0)throw new PayrollError('نام پرسنل در ردیف '.($index+1).' خالی است',422);
        return;
      }
      $data=[];
      foreach(self::FIELDS as $column=>$field){
        $value=self::normalize($cells[$column]??'');
        if(in_array($field,['sequence','first_name','last_name','personnel_code','national_code','account','role'],true)){
          if(mb_strlen($value)>200)throw new PayrollError('متن بیش از حد مجاز در ردیف '.($index+1),422);
          $data[$field]=$value;continue;
        }
        if($value===''){$data[$field]=null;continue;}
        if(!is_numeric($value) || !is_finite((float)$value) || abs((float)$value)>999999999999)throw new PayrollError('عدد نامعتبر: ردیف '.($index+1).'، '.self::LABELS[$column],422);
        $data[$field]=$value;
      }
      $national=self::identity($data['national_code'],true);$personnel=self::identity($data['personnel_code']);
      $data['national_code']=$national??$data['national_code'];
      foreach(['n'=>$national,'p'=>$personnel] as $prefix=>$id){if($id===null)continue;$key=$prefix.$id;if(isset($seen[$key]))throw new PayrollError('شناسهٔ تکراری در ردیف‌های '.$seen[$key].' و '.($index+1),422);$seen[$key]=$index+1;}
      $warnings=[];
      if($data['net']===null || $data['gross']===null)throw new PayrollError('خالص پرداختی یا جمع مزایا خالی است: ردیف '.($index+1),422);
      if(abs((float)$data['gross']-(float)$data['advance']-(float)$data['insurance']-(float)$data['tax']-(float)$data['net'])>2)$warnings[]='جمع مزایا منهای کسورات با خالص اعلامی مغایرت دارد؛ مبالغ شرکت حفظ شده‌اند.';
      $rows[]=['source_row'=>$index+1,'data'=>$data,'warnings'=>$warnings];
    });
    $expected=[0=>'ردیف',1=>'نام',2=>'نام خانوادگی',3=>'شماره پرسنلی',4=>'کد ملی',5=>'شماره حساب',6=>'سمت',7=>'روز کارکرد',12=>'دستمزد',15=>'حقوق ماهیانه',16=>'ضریب حق تاهل',17=>'حق تاهل',18=>'حق اولاد',20=>'جمعه کاری',22=>'تعطیل کاری',24=>'شب کاری',26=>'درصد نوبت کاری',27=>'مبلغ نوبت کاری',28=>'اضافه کار',30=>'حق بن و مسکن',33=>'متفرقه',34=>'جمع حقوق و مزایا',35=>'کسورات',38=>'خالص پرداختی',39=>'عیدی پاداش',40=>'سنوات',41=>'بیمه سهم کارفرما',42=>'کل مبلغ نیروی انسانی'];
    foreach($expected as $column=>$label)if(self::normalize($headers[1][$column]??'')!==$label)throw new PayrollError('قالب ستون‌های اکسل با نمونهٔ شرکت مطابقت ندارد: '.$label,422);
    foreach([7=>'روز کارکرد کل',8=>'مرخصی',9=>'غیبت',10=>'استعلاجی',11=>'روز کارکرد موثر',12=>'دستمزد روزانه',13=>'مزد سنوات',14=>'مزد شغل',16=>'صفر مجرد - یک متاهل',17=>'مبلغ (ریال)',18=>'تعداد فرزند',19=>'مبلغ کل( ریال)',20=>'میزان ساعت',21=>'مبلغ کل( ریال)',22=>'میزان ساعت',23=>'مبلغ کل( ریال)',24=>'ساعت',25=>'مبلغ کل( ریال)',27=>'مبلغ',28=>'میزان ساعت',29=>'مبلغ کل( ریال)',30=>'حق مسکن',31=>'حق بن',32=>'مبلغ (ریال)',35=>'مساعده/سایر کسورات',36=>'بیمه تامین اجتماعی',37=>'مالیات'] as $column=>$label)if(self::normalize($headers[2][$column]??'')!==$label)throw new PayrollError('زیرستون اکسل تغییر کرده است: '.$label,422);
    $months=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
    if(!str_contains($title,(string)$year) || !str_contains($title,$months[$month-1]))throw new PayrollError('ماه و سال انتخاب‌شده با عنوان فایل شرکت مطابقت ندارد',422);
    if(!$rows)throw new PayrollError('ردیف پرسنلی در شیت اول یافت نشد',422);
    return $rows;
  }
  static function matchRows($rows,$users) {
    $nationalIndex=[];$personnelIndex=[];$byId=[];
    foreach($users as $user){$byId[(int)$user['id']]=$user;$national=self::identity(trim((string)($user['national_code']??''))!==''?$user['national_code']:($user['username']??''),true);$personnel=self::identity($user['personnel_code']??'');if($national)$nationalIndex[$national][]=(int)$user['id'];if($personnel)$personnelIndex[$personnel][]=(int)$user['id'];}
    foreach($rows as &$row){
      $national=self::identity($row['data']['national_code'],true);$personnel=self::identity($row['data']['personnel_code']);
      $ids=array_unique(array_merge($nationalIndex[$national??'']??[],$personnelIndex[$personnel??'']??[]));
      $row['user_id']=null;$row['match_status']='unmatched';
      if(count($ids)===1){$id=reset($ids);$user=$byId[$id];$userNational=self::identity(trim((string)($user['national_code']??''))!==''?$user['national_code']:($user['username']??''),true);$userPersonnel=self::identity($user['personnel_code']??'');
        if(($national && $userNational && $national!==$userNational)||($personnel && $userPersonnel && $personnel!==$userPersonnel))$row['match_status']='conflict';
        else{$row['user_id']=$id;$row['match_status']='matched';}
      }elseif(count($ids)>1)$row['match_status']='conflict';
    }unset($row);
    $counts=array_count_values(array_filter(array_column($rows,'user_id')));
    foreach($rows as &$row)if($row['user_id'] && $counts[$row['user_id']]>1){$row['user_id']=null;$row['match_status']='conflict';}unset($row);
    return $rows;
  }
  static function ensure() {
    Db::run("CREATE TABLE IF NOT EXISTS payroll_periods (id INT AUTO_INCREMENT PRIMARY KEY, period_jy INT NOT NULL, period_jm TINYINT NOT NULL, batch_id INT NULL, revision INT NOT NULL DEFAULT 0, UNIQUE KEY period_key(period_jy,period_jm)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    Db::run("CREATE TABLE IF NOT EXISTS payroll_batches (id INT AUTO_INCREMENT PRIMARY KEY, period_id INT NOT NULL, revision INT NOT NULL, file_name VARCHAR(200) NOT NULL, file_sha256 CHAR(64) NOT NULL, uploaded_by INT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX period_revision(period_id,revision)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    Db::run("CREATE TABLE IF NOT EXISTS payroll_rows (id INT AUTO_INCREMENT PRIMARY KEY, batch_id INT NOT NULL, source_row INT NOT NULL, user_id INT NULL, match_status VARCHAR(20) NOT NULL, employee_name VARCHAR(250) NOT NULL, personnel_code VARCHAR(40) NULL, national_code VARCHAR(40) NULL, role_title VARCHAR(200) NULL, net DECIMAL(20,6) NOT NULL, payload LONGTEXT NOT NULL, warnings TEXT NULL, mapped_by INT NULL, mapped_at DATETIME NULL, UNIQUE KEY batch_source(batch_id,source_row), UNIQUE KEY batch_user(batch_id,user_id), INDEX employee(user_id,batch_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  }
  static function fingerprint($year,$month,$hash,$revision,$rows) {
    return hash_hmac('sha256',json_encode([$year,$month,$hash,$revision,$rows],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),$GLOBALS['CONFIG']['jwt_secret']);
  }
  static function import($file,$year,$month,$commit,$token,$replace,$uploader) {
    [$year,$month]=self::period($year,$month);
    if(!$file || ($file['error']??1)!==UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name']??'') || ($file['size']??0)>10*1024*1024 || strtolower(pathinfo($file['name']??'',PATHINFO_EXTENSION))!=='xlsx')throw new PayrollError('فایل XLSX حداکثر ۱۰ مگابایت انتخاب کنید',422);
    $rows=self::parse($file['tmp_name'],$year,$month);$hash=hash_file('sha256',$file['tmp_name']);self::ensure();
    return self::applyImport($rows,$hash,$file['name'],$year,$month,$commit,$token,$replace,$uploader);
  }
  static function applyImport($rows,$hash,$fileName,$year,$month,$commit,$token,$replace,$uploader) {
    $pdo=Db::pdo();
    if($commit)$pdo->beginTransaction();
    try{
      if($commit)Db::run('INSERT IGNORE INTO payroll_periods(period_jy,period_jm) VALUES(?,?)',[$year,$month]);
      $period=Db::one('SELECT * FROM payroll_periods WHERE period_jy=? AND period_jm=?'.($commit?' FOR UPDATE':''),[$year,$month]);
      $users=Db::all('SELECT id,username,national_code,personnel_code FROM users'.($commit?' FOR UPDATE':''));
      $rows=self::matchRows($rows,$users);$revision=(int)($period['revision']??0);
      $fingerprint=self::fingerprint($year,$month,$hash,$revision,$rows);
      if(!$commit)return ['rows'=>$rows,'token'=>$fingerprint,'revision'=>$revision,'count'=>count($rows),'matched'=>count(array_filter($rows,fn($row)=>$row['user_id']!==null)),'labels'=>self::LABELS];
      if(!is_string($token) || !hash_equals($fingerprint,$token))throw new PayrollError('پیش‌نمایش منقضی یا تغییر کرده است؛ فایل را دوباره بررسی کنید',409);
      if($revision && !$replace)throw new PayrollError('برای جایگزینی این ماه باید تأیید صریح بدهید',409);
      $batch=Db::insert('INSERT INTO payroll_batches(period_id,revision,file_name,file_sha256,uploaded_by) VALUES(?,?,?,?,?)',[$period['id'],$revision+1,mb_substr(basename($fileName),0,200),$hash,$uploader]);
      foreach($rows as $row){$data=$row['data'];Db::insert('INSERT INTO payroll_rows(batch_id,source_row,user_id,match_status,employee_name,personnel_code,national_code,role_title,net,payload,warnings) VALUES(?,?,?,?,?,?,?,?,?,?,?)',[$batch,$row['source_row'],$row['user_id'],$row['match_status'],trim($data['first_name'].' '.$data['last_name']),$data['personnel_code'],$data['national_code'],$data['role'],$data['net'],json_encode($data,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),json_encode($row['warnings'],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);}
      Db::run('UPDATE payroll_periods SET batch_id=?,revision=? WHERE id=?',[$batch,$revision+1,$period['id']]);
      $pdo->commit();return ['ok'=>true,'count'=>count($rows),'revision'=>$revision+1];
    }catch(Throwable $error){if($commit && $pdo->inTransaction())$pdo->rollBack();throw $error;}
  }
  static function listing($filters,$userId=null) {
    self::ensure();$where=['r.batch_id=p.batch_id'];$params=[];
    if($userId!==null){$where[]='r.user_id=?';$params[]=$userId;}
    foreach(['year'=>'p.period_jy','month'=>'p.period_jm','user_id'=>'r.user_id'] as $key=>$column)if(!empty($filters[$key]) && ($userId===null || $key!=='user_id')){$where[]=$column.'=?';$params[]=(int)$filters[$key];}
    if($userId===null && ($filters['status']??'')==='pending')$where[]='r.user_id IS NULL';
    if($userId===null && trim($filters['q']??'')!==''){$where[]="CONCAT_WS(' ',r.employee_name,r.personnel_code,r.national_code,r.role_title) LIKE ?";$params[]='%'.self::normalize($filters['q']).'%';}
    $sql=' FROM payroll_rows r JOIN payroll_batches b ON b.id=r.batch_id JOIN payroll_periods p ON p.id=b.period_id WHERE '.implode(' AND ',$where);
    $summary=Db::one('SELECT COUNT(*) count,COALESCE(SUM(r.net),0) total_net,SUM(r.user_id IS NULL) pending'.$sql,$params);
    $page=max(1,(int)($filters['page']??1));$limit=50;$offset=($page-1)*$limit;
    $rows=Db::all('SELECT r.id,r.source_row,r.user_id,r.match_status,r.employee_name,r.personnel_code,r.national_code,r.role_title,r.net,p.period_jy,p.period_jm,b.created_at'.$sql.' ORDER BY p.period_jy DESC,p.period_jm DESC,r.source_row LIMIT '.$limit.' OFFSET '.$offset,$params);
    if($userId!==null){
      payroll_ensure_issue_counter();
      foreach($rows as &$item){
        $issue=Db::one('SELECT download_count FROM payroll_issued_slips WHERE user_id=? AND period_jy=? AND period_jm=?',[$userId,$item['period_jy'],$item['period_jm']]);
        $item['issued_count']=(int)($issue['download_count']??0);
        $item['issued']=$item['issued_count']>=3;
      }unset($item);
    }
    return ['rows'=>$rows,'summary'=>$summary,'page'=>$page,'page_size'=>$limit];
  }
  static function detail($id,$userId=null) {
    self::ensure();$params=[(int)$id];$scope='';if($userId!==null){$scope=' AND r.user_id=?';$params[]=$userId;}
    $row=Db::one('SELECT r.*,p.period_jy,p.period_jm,b.file_name,b.created_at,b.revision FROM payroll_rows r JOIN payroll_batches b ON b.id=r.batch_id JOIN payroll_periods p ON p.id=b.period_id WHERE r.id=? AND r.batch_id=p.batch_id'.$scope,$params);
    if(!$row)throw new PayrollError('فیش یافت نشد',404);
    $row['data']=json_decode($row['payload'],true,512,JSON_THROW_ON_ERROR);$row['warnings']=json_decode($row['warnings']??'[]',true);unset($row['payload']);
    return ['row'=>$row,'fields'=>self::FIELDS,'labels'=>self::LABELS];
  }
  static function map($id,$userId,$actor) {
    if(!filter_var($userId,FILTER_VALIDATE_INT) || (int)$userId<1)throw new PayrollError('کاربر را انتخاب کنید',422);
    self::ensure();$pdo=Db::pdo();$pdo->beginTransaction();
    try{
      $period=Db::one('SELECT p.* FROM payroll_periods p JOIN payroll_batches b ON b.period_id=p.id JOIN payroll_rows r ON r.batch_id=b.id WHERE r.id=? FOR UPDATE',[(int)$id]);
      $row=Db::one('SELECT * FROM payroll_rows WHERE id=? FOR UPDATE',[(int)$id]);
      if(!$row || !$period || (int)$row['batch_id']!==(int)$period['batch_id'])throw new PayrollError('ردیف تغییر کرده است؛ فهرست را تازه کنید',409);
      if($row['user_id']!==null)throw new PayrollError('این ردیف قبلاً تطبیق داده شده است',409);
      if(!Db::one('SELECT id FROM users WHERE id=? FOR UPDATE',[(int)$userId]))throw new PayrollError('کاربر یافت نشد',404);
      if(Db::one('SELECT id FROM payroll_rows WHERE batch_id=? AND user_id=?',[$row['batch_id'],(int)$userId]))throw new PayrollError('برای این کاربر در این ماه فیش دیگری وجود دارد',409);
      Db::run("UPDATE payroll_rows SET user_id=?,match_status='manual',mapped_by=?,mapped_at=NOW() WHERE id=?",[(int)$userId,$actor,(int)$id]);
      Db::run('UPDATE payroll_periods SET revision=revision+1 WHERE id=?',[$period['id']]);$pdo->commit();return ['ok'=>true];
    }catch(Throwable $error){if($pdo->inTransaction())$pdo->rollBack();throw $error;}
  }
}

function payroll_response(callable $callback){header('Cache-Control: private, no-store');try{return $callback();}catch(PayrollError $error){Http::error($error->getMessage(),$error->getCode()?:422);}}
route('POST','/api/admin/payroll/import',fn($p,$b,$u)=>payroll_response(fn()=>Payroll::import($_FILES['file']??null,$_POST['period_jy']??0,$_POST['period_jm']??0,($_POST['mode']??'')==='commit',$_POST['token']??'',($_POST['replace']??'')==='1',$u['id'])),false,ADMIN);
route('GET','/api/admin/payroll',fn()=>payroll_response(fn()=>Payroll::listing($_GET)),false,ADMIN);
route('GET','/api/admin/payroll/{id}',fn($p)=>payroll_response(fn()=>Payroll::detail($p['id'])),false,ADMIN);
route('PUT','/api/admin/payroll/{id}/match',fn($p,$b,$u)=>payroll_response(fn()=>Payroll::map($p['id'],$b['user_id']??null,$u['id'])),false,ADMIN);
route('GET','/api/my/payroll',function($p,$b,$u){if(!_user_app_item_allowed($u,'SalarySlips'))Http::error('دسترسی به فیش حقوقی فعال نیست',403);return payroll_response(fn()=>Payroll::listing($_GET,$u['id']));});
route('GET','/api/my/payroll/{id}',function($p,$b,$u){if(!_user_app_item_allowed($u,'SalarySlips'))Http::error('دسترسی به فیش حقوقی فعال نیست',403);return payroll_response(fn()=>Payroll::detail($p['id'],$u['id']));});

/**
 * Three successful image issuances per account and Persian payroll month.
 * The unique monthly key and conditional UPDATE enforce the limit atomically.
 */
function payroll_ensure_issue_counter() {
  Db::run("CREATE TABLE IF NOT EXISTS payroll_issued_slips (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    period_jy INT NOT NULL,
    period_jm TINYINT NOT NULL,
    payroll_row_id INT NOT NULL,
    download_count INT NOT NULL DEFAULT 0,
    issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_monthly_issue(user_id,period_jy,period_jm)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $column=Db::one("SHOW COLUMNS FROM payroll_issued_slips LIKE 'download_count'");
  if (!$column) Db::run("ALTER TABLE payroll_issued_slips ADD COLUMN download_count INT NOT NULL DEFAULT 1");
}
function payroll_issue_once($id,$user) {
  if (!_user_app_item_allowed($user,'SalarySlips')) Http::error('دسترسی به فیش حقوقی فعال نیست',403);
  return payroll_response(function() use ($id,$user) {
    $row=Payroll::detail($id,$user['id'])['row'];
    payroll_ensure_issue_counter();
    $args=[(int)$user['id'],(int)$row['period_jy'],(int)$row['period_jm']];
    Db::run('INSERT IGNORE INTO payroll_issued_slips(user_id,period_jy,period_jm,payroll_row_id,download_count) VALUES(?,?,?,?,0)',[...$args,(int)$row['id']]);
    $statement=Db::pdo()->prepare('UPDATE payroll_issued_slips SET download_count=download_count+1, payroll_row_id=? WHERE user_id=? AND period_jy=? AND period_jm=? AND download_count<3');
    $statement->execute([(int)$row['id'],...$args]);
    if ($statement->rowCount()!==1) throw new PayrollError('سقف سه بار دریافت تصویر فیش این ماه تکمیل شده است.',409);
    $count=Db::one('SELECT download_count FROM payroll_issued_slips WHERE user_id=? AND period_jy=? AND period_jm=?',$args);
    return ['ok'=>true,'issued'=>true,'issued_count'=>(int)$count['download_count'],'remaining'=>max(0,3-(int)$count['download_count'])];
  });
}
route('POST','/api/my/payroll/{id}/issue',function($p,$b,$u){return payroll_issue_once($p['id'],$u);});
