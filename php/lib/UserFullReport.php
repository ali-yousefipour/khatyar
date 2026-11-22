<?php
/**
 * Configurable administrative users report.
 * Only explicitly approved fields may leave the database.
 */
final class UserFullReport {
  private static function hasColumn(string $table,string $column): bool {
    return (bool)Db::one("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=? LIMIT 1",[$table,$column]);
  }
  private static function hasTable(string $table): bool {
    return (bool)Db::one("SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? LIMIT 1",[$table]);
  }
  private static function base(): array {
    return [
      'id'=>'شناسه کاربری','personnel_photo'=>'عکس پرسنلی','personnel_signature'=>'امضای پرسنلی',
      'personnel_code'=>'شماره پرسنلی','username'=>'نام کاربری',
      'first_name'=>'نام','last_name'=>'نام خانوادگی','role_title'=>'سمت',
      'mobile'=>'تلفن همراه ثبت‌شده','employment_start_date'=>'شروع همکاری','employment_end_date'=>'پایان همکاری','rank_stars'=>'درجه',
      'phone'=>'شماره همراه','email'=>'ایمیل','national_code'=>'کد ملی',
      'birth_date'=>'تاریخ تولد','marital_status'=>'وضعیت تأهل',
      'children_count'=>'تعداد فرزند','address'=>'نشانی','seniority_start'=>'شروع سنوات',
      'is_active'=>'وضعیت فعالیت','can_send_sms'=>'مجوز پیامک',
      'device_model'=>'مدل گوشی','android_version'=>'نسخه اندروید','app_version'=>'نسخه برنامه',
      'father_name'=>'نام پدر','gender'=>'جنسیت','identity_number'=>'شماره شناسنامه',
      'birth_place'=>'محل تولد','issue_place'=>'محل صدور شناسنامه',
      'education'=>'تحصیلات','degree'=>'مدرک تحصیلی','employment_date'=>'تاریخ استخدام',
      'hire_date'=>'تاریخ شروع همکاری','postal_code'=>'کد پستی',
      'emergency_phone'=>'شماره تماس اضطراری'
    ];
  }
  private static function schema(): array {
    $base=[];
    foreach(self::base() as $key=>$label) {
      if($key==='personnel_photo'||$key==='personnel_signature') {
        $source=$key==='personnel_photo'?'photo_path':'signature_data';
        if(self::hasColumn('users',$source))
          $base[]=['key'=>$key,'label'=>$label,'group'=>'مدارک تصویری','type'=>'embedded_image'];
        continue;
      }
      if ($key==='role_title'||($key==='personnel_code')||self::hasColumn('users',$key))
        $base[]=['key'=>$key,'label'=>$label,'group'=>'هویتی و سازمانی'];
    }
    $custom=[];
    if(self::hasTable('custom_fields')) {
      $records=Db::all("SELECT id,label,ftype,options FROM custom_fields WHERE is_active=1 ORDER BY sort_order,id");
      foreach($records as $f) {
        $col=['key'=>'custom:'.(int)$f['id'],'label'=>(string)$f['label'],'group'=>'فیلدهای سفارشی'];
        if(in_array(($f['ftype']??''),['image','file'],true))$col['type']='attachment';
        if(($f['ftype']??'')==='repeater'){
          $config=json_decode((string)($f['options']??''),true);
          $col['type']='repeater';
          $col['columns']=is_array($config)?($config['columns']??[]):[];
        }
        $custom[]=$col;
      }
    }
    $original=array_merge($base,$custom);
    // Published profile definitions control column labels and order without
    // changing existing database mappings or deleting historical values.
    try {
      require_once __DIR__.'/UserProfileForms.php';
      if(!UserProfileForms::available())return $original;
      $published=UserProfileForms::published();
      if(($published['version']??0)<1)return $original;
      return self::orderedByProfile($original,$published['schema']);
    }catch(Throwable $error){
      error_log('User full report dynamic schema unavailable class='.get_class($error));
      // Do not fall back to a broader registry if published visibility rules cannot be evaluated.
      Http::error('تعریف مجاز ستون‌های گزارش در دسترس نیست؛ عملیات متوقف شد',503);
    }
  }
  public static function availableColumns(): array {return self::schema();}
  public static function orderedByProfile(array $original,array $form): array {
    $lookup=array_column($original,null,'key');$ordered=[];$excluded=[];
    foreach($form['sections']??[] as $section){
      foreach($section['fields']??[] as $field){
        if(!is_array($field)||!isset($field['key']))continue;
        $key=$field['binding']==='custom'
          ?'custom:'.(int)($field['custom_field_id']??0):(string)$field['key'];
        if(!isset($lookup[$key]))continue;
        if(($field['report_visible']??true)===false){$excluded[$key]=true;continue;}
        $row=$lookup[$key];
        $row['label']=(string)($field['label']??$row['label']);
        $row['group']=(string)($section['title']??$row['group']);
        if(in_array(($field['type']??''),['image','file'],true))$row['type']='attachment';
        if(($field['type']??'')==='repeater'){
          $row['type']='repeater';
          $row['columns']=$field['columns']??($row['columns']??[]);
        }
        $ordered[$key]=$row;
      }
    }
    foreach($original as $row){
      if(!isset($ordered[$row['key']])&&!isset($excluded[$row['key']]))$ordered[$row['key']]=$row;
    }
    return array_values($ordered);
  }
  public static function formatRepeatRows(string $raw,array $columns): string {
    if($raw==='')return '';
    $rows=json_decode($raw,true);
    if(!is_array($rows)||!array_is_list($rows))return 'داده تکرارشونده نامعتبر';
    if(!$rows)return '';
    $lines=[];
    foreach(array_slice($rows,0,20) as $index=>$row){
      if(!is_array($row))continue;
      $parts=[];
      foreach(array_slice($columns,0,8) as $column){
        $key=$column['key']??null;
        if(!is_string($key)||!array_key_exists($key,$row)||$row[$key]===null||$row[$key]==='')continue;
        if(!is_scalar($row[$key]))continue;
        $value=(string)$row[$key];
        if(($column['type']??'')==='boolean')$value=$value==='1'?'بله':'خیر';
        $parts[]=(string)($column['label']??$key).': '.$value;
      }
      if($parts)$lines[]='ردیف '.($index+1).' - '.implode('؛ ',$parts);
    }
    return implode("\n",$lines);
  }
  /** Resolve images for XLSX without exposing raw base64 or private storage paths in cells. */
  private static function imageBytes(array $u,string $key): ?string {
    $data='';
    if($key==='personnel_photo') {
      if(!empty($u['photo_path'])) {
        $full=Media::fullPath((string)$u['photo_path']);
        if($full&&is_file($full)&&is_readable($full)&&filesize($full)<=5*1024*1024)
          $data=(string)@file_get_contents($full);
      }
      if($data===''&&!empty($u['personnel_photo_b64']))$data=(string)$u['personnel_photo_b64'];
    }elseif($key==='personnel_signature')$data=(string)($u['signature_data']??'');
    if($data==='')return null;
    if(str_contains($data,'base64,')) {
      $data=(string)(base64_decode(substr($data,strpos($data,'base64,')+7),true)?:'');
    }
    if($data===''||strlen($data)>5*1024*1024)return null;
    $info=@getimagesizefromstring($data);
    if(!$info||!in_array($info['mime']??'', ['image/jpeg','image/png'],true))return null;
    return $data;
  }
  public static function run(array $body): void {
    $fields=self::schema();
    if($_SERVER['REQUEST_METHOD']==='GET') {
      header('Content-Type: application/json; charset=utf-8');
      echo json_encode(['columns'=>$fields,'sorts'=>array_map(static fn($c)=>['key'=>$c['key'],'label'=>$c['label']],$fields)],JSON_UNESCAPED_UNICODE);
      exit;
    }
    $lookup=array_column($fields,null,'key');
    $requested=$body['columns']??array_keys($lookup);
    if(!is_array($requested)) Http::error('ستون‌های انتخابی نامعتبر هستند',422);
    $columns=[];foreach($requested as $key) {
      if(!is_string($key)||!isset($lookup[$key])) Http::error('ستون نامعتبر است',422);
      if(!in_array($key,$columns,true))$columns[]=$key;
    }
    if(!$columns||count($columns)>500)Http::error('تعداد ستون‌های انتخابی نامعتبر است',422);
    $sort=(string)($body['sort']??'id');
    if(!isset($lookup[$sort]))Http::error('فیلد مرتب‌سازی نامعتبر است',422);
    $dir=(string)($body['direction']??'asc');
    if(!in_array($dir,['asc','desc'],true))Http::error('جهت مرتب‌سازی نامعتبر است',422);
    $requestedLevels=is_array($body['sorts']??null)?$body['sorts']:[];
    $extraSortKeys=[];foreach($requestedLevels as $level)if(is_array($level)&&is_string($level['key']??null)&&isset($lookup[$level['key']]))$extraSortKeys[]=$level['key'];
    $userKeys=array_filter(array_unique(array_merge($columns,[$sort],$extraSortKeys)),static fn($k)=>strpos($k,'custom:')!==0);
    $select=['u.id','r.title AS role_title'];
    foreach($userKeys as $key) {
      if(in_array($key,['id','role_title','personnel_code','personnel_photo','personnel_signature'],true))continue;
      $select[]='u.`'.$key.'`';
    }
    if(self::hasColumn('users','personnel_code'))$select[]='u.personnel_code';
    $imageKeys=array_values(array_intersect(array_merge($columns,[$sort],$extraSortKeys),['personnel_photo','personnel_signature']));
    if(in_array('personnel_photo',$imageKeys,true)) {
      $select[]='u.photo_path';
      // Avoid retrieving obsolete base64 when the canonical image file exists.
      if(self::hasColumn('users','photo'))$select[]="CASE WHEN u.photo_path IS NULL OR u.photo_path='' THEN u.photo ELSE NULL END AS personnel_photo_b64";
    }
    if(in_array('personnel_signature',$imageKeys,true))$select[]='u.signature_data';
    // Filters are server-validated and parameterized; never interpolate request values.
    $conditions=[];$params=[];
    $active=(string)($body['active']??'all');
    if(!in_array($active,['all','1','0'],true))Http::error('فیلتر وضعیت نامعتبر است',422);
    if($active!=='all'){$conditions[]='u.is_active=?';$params[]=(int)$active;}
    foreach(['role_id','zone_id'] as $filter){
      $value=$body[$filter]??null;
      if($value===null||$value==='')continue;
      if(!ctype_digit((string)$value)||(int)$value<1)Http::error('فیلتر سازمانی نامعتبر است',422);
      $conditions[]='u.`'.$filter.'`=?';$params[]=(int)$value;
    }
    $where=$conditions?' WHERE '.implode(' AND ',$conditions):'';
    $users=Db::all("SELECT ".implode(',',$select)." FROM users u LEFT JOIN roles r ON r.id=u.role_id".$where." ORDER BY u.id",$params);
    $customIds=[];
    foreach(array_merge($columns,[$sort],$extraSortKeys) as $key) if(strpos($key,'custom:')===0)$customIds[]=(int)substr($key,7);
    // Personnel number may be stored as a custom field in older deployments.
    $personnelIds=[];
    if(self::hasTable('custom_fields')) {
      foreach(Db::all("SELECT id,label FROM custom_fields WHERE is_active=1") as $f)
        if(in_array(trim((string)$f['label']),['شماره پرسنلی','کد پرسنلی','شماره پرسنلی کارمند','کد پرسنلی کارمند'],true))$personnelIds[]=(int)$f['id'];
    }
    $customIds=array_values(array_unique(array_merge($customIds,$personnelIds)));
    $values=[];
    if($users&&$customIds&&self::hasTable('custom_field_values')) {
      foreach(array_chunk($customIds,100) as $chunk) {
        $q=implode(',',array_fill(0,count($chunk),'?'));
        foreach(Db::all("SELECT user_id,field_id,value FROM custom_field_values WHERE field_id IN ($q)",$chunk) as $r)
          $values[(int)$r['user_id']][(int)$r['field_id']]=$r['value'];
      }
    }
    // Report document existence, never private storage names, file bytes or raw URLs.
    $attachmentIds=[];
    foreach(array_merge($columns,[$sort],$extraSortKeys) as $key)
      if(($lookup[$key]['type']??'')==='attachment'&&str_starts_with($key,'custom:'))
        $attachmentIds[]=(int)substr($key,7);
    $attachmentIds=array_values(array_unique($attachmentIds));
    if($attachmentIds){
      // Ignore legacy custom_field_values for document fields even if they
      // contain old paths. Only the private attachment registry is authoritative.
      foreach($values as &$userFields)foreach($attachmentIds as $fid)unset($userFields[$fid]);
      unset($userFields);
      if($users&&self::hasTable('user_profile_attachments')){
        foreach(array_chunk($attachmentIds,100) as $chunk){
          $marks=implode(',',array_fill(0,count($chunk),'?'));
          foreach(Db::all("SELECT user_id,field_id FROM user_profile_attachments WHERE field_id IN ($marks)",$chunk) as $attached)
            $values[(int)$attached['user_id']][(int)$attached['field_id']]='ثبت شده';
        }
      }
    }
    $getter=static function(array $u,string $key)use(&$values,$personnelIds) {
      if(strpos($key,'custom:')===0)return $values[(int)$u['id']][(int)substr($key,7)]??'';
      if($key==='personnel_photo')return !empty($u['photo_path'])||!empty($u['personnel_photo_b64'])?'ثبت شده':'';
      if($key==='personnel_signature')return !empty($u['signature_data'])?'ثبت شده':'';
      if($key==='personnel_code') {
        $value=trim((string)($u['personnel_code']??''));
        if($value==='')foreach($personnelIds as $fid) {
          $candidate=trim((string)($values[(int)$u['id']][$fid]??''));
          if($candidate!=='')return $candidate;
        }
        return $value;
      }
      if(in_array($key,['is_active','can_send_sms'],true))return !empty($u[$key])?'بله':'خیر';
      return $u[$key]??'';
    };
    $levels=$body['sorts']??[['key'=>$sort,'direction'=>$dir]];
    if(!is_array($levels)||!array_is_list($levels)||!count($levels)||count($levels)>3)
      Http::error('مرتب‌سازی چندسطحی نامعتبر است',422);
    foreach($levels as $level){
      if(!is_array($level)||!isset($lookup[$level['key']??''])||
        !in_array($level['direction']??'',['asc','desc'],true))
        Http::error('سطح مرتب‌سازی نامعتبر است',422);
    }
    $collator=class_exists('Collator')?new Collator('fa_IR'):null;
    usort($users,static function($a,$b)use($levels,$getter,$collator) {
      foreach($levels as $level){
        $key=$level['key'];$direction=$level['direction'];
        $av=(string)$getter($a,$key);$bv=(string)$getter($b,$key);
        $cmp=is_numeric($av)&&is_numeric($bv)
          ? (float)$av<=>(float)$bv
          : ($collator?$collator->compare($av,$bv):strnatcasecmp($av,$bv));
        if($cmp!==0)return $direction==='desc'?-$cmp:$cmp;
      }
      return (int)$a['id']<=>(int)$b['id'];
    });
    // The preview reuses exactly the same resolved columns, filters, values and sort order.
    if(!empty($body['preview'])) {
      $sample=[];
      foreach(array_slice($users,0,5) as $record) {
        $row=[];
        foreach($columns as $key) {
          $value=(string)$getter($record,$key);
          if(($lookup[$key]['type']??'')==='repeater')
            $value=self::formatRepeatRows($value,(array)($lookup[$key]['columns']??[]));
          $row[]=$value;
        }
        $sample[]=$row;
      }
      header('Content-Type: application/json; charset=utf-8');
      echo json_encode(['count'=>count($users),'columns'=>array_map(static fn($key)=>$lookup[$key]['label'],$columns),'sample'=>$sample],JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);
      exit;
    }
    require_once dirname(__DIR__).'/lib/XlsxWriter.php';
    $writer=new XlsxWriter(array_map(static fn($key)=>$lookup[$key]['label'],$columns));
    $writer->setProfessionalStyle();
    $writer->setFontName('Vazirmatn');
    foreach($columns as $index=>$key) {
      $writer->setColWidth($index, in_array($key,['address','email'],true)?32:20);
      // Keep every value as text: dates, IDs and account references must preserve leading zeros.
      $writer->setTextCol($index);
    }
    foreach($users as $u) {
      $row=[];foreach($columns as $key){
        $value=(string)$getter($u,$key);
        if(($lookup[$key]['type']??'')==='repeater')
          $value=self::formatRepeatRows($value,(array)($lookup[$key]['columns']??[]));
        // Prevent spreadsheet formula injection in user-controlled text.
        if(preg_match('/^[=+@\\-]/u',$value))$value="'".$value;
        $row[]=$value;
      }
      $rowIdx=$writer->addRow($row);
      foreach($columns as $columnIdx=>$key){
        if(($lookup[$key]['type']??'')!=='embedded_image')continue;
        $bytes=self::imageBytes($u,$key);
        if($bytes)$writer->setImage($rowIdx,$columnIdx,$bytes,$key==='personnel_signature'?110:90);
      }
    }
    $writer->output('users_full.xlsx','کاربران');
    exit;
  }
}
