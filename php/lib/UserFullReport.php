<?php
/**
 * Configurable administrative users report.
 * Only explicitly approved fields may leave the database.
 */
final class UserFullReport {
  private static ?array $userColumns=null;
  private static function hasColumn(string $table,string $column): bool {
    if($table==='users'){
      if(self::$userColumns===null){
        $rows=Db::all("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users'");
        self::$userColumns=array_fill_keys(array_map(
          static fn($row)=>strtolower((string)($row['COLUMN_NAME']??$row['column_name']??'')),$rows),true);
      }
      return isset(self::$userColumns[strtolower($column)]);
    }
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
      'allow_android'=>'مجوز ورود اندروید','allow_web'=>'مجوز ورود وب',
      'presence_required'=>'الزام صحت‌سنجی حضور','security_exempt'=>'معافیت امنیتی',
      'can_be_substitute'=>'اجازه جانشینی','can_welfare'=>'مجوز رفاهیات',
      'can_cultural'=>'مجوز فعالیت فرهنگی','can_manage_temp_drivers'=>'مدیریت رانندگان موقت',
      'commitments_count'=>'تعداد تعهدات انضباطی',
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
      if($key==='commitments_count') {
        if(self::hasTable('user_commitments'))
          $base[]=['key'=>$key,'label'=>$label,'group'=>'اطلاعات اداری'];
        continue;
      }
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
    // Prevent tiny compressed files from expanding into excessive GD memory.
    if((int)($info[0]??0)<1||(int)($info[1]??0)<1||
       (int)$info[0]>2400||(int)$info[1]>2400)return null;
    return $data;
  }
  /** Record metadata only: never store exported personnel values in audit logs. */
  private static function audit(int $actor,string $event,array $meta): void {
    if($actor<1)Http::error('هویت مدیر گزارش‌گیر معتبر نیست',403);
    Db::run('INSERT INTO activity_logs(user_id,event,meta) VALUES(?,?,?)',
      [$actor,$event,json_encode($meta,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
  }
  public static function run(array $body,bool $forceExport=false,int $actorId=0): void {
    $fields=self::schema();
    if(!$forceExport&&($_SERVER['REQUEST_METHOD']??'GET')==='GET') {
      header('Content-Type: application/json; charset=utf-8');
      echo json_encode(['columns'=>$fields,'sorts'=>array_map(static fn($c)=>['key'=>$c['key'],'label'=>$c['label']],$fields)],JSON_UNESCAPED_UNICODE);
      exit;
    }
    if($actorId<1)Http::error('گزارش بدون شناسه مدیر مجاز نیست',403);
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
      if($key==='commitments_count'){$select[]='(SELECT COUNT(*) FROM user_commitments uc WHERE uc.user_id=u.id) AS commitments_count';continue;}
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
    // Persian employment dates are normalized and range-checked server-side.
    $dateRange=[
      'employment_start_from'=>['employment_start_date','>='],
      'employment_start_to'=>['employment_start_date','<='],
      'employment_end_from'=>['employment_end_date','>='],
      'employment_end_to'=>['employment_end_date','<=']
    ];
    foreach($dateRange as $input=>$definition){
      $raw=trim((string)($body[$input]??''));
      if($raw==='')continue;
      $normalized=IranCalendar::normalize($raw);
      if(!$normalized||!preg_match('/^1[34][0-9]{2}-/',$normalized))
        Http::error('تاریخ شمسی فیلتر گزارش معتبر نیست',422);
      [$column,$operator]=$definition;
      if(!self::hasColumn('users',$column))Http::error('فیلتر تاریخ همکاری در پایگاه داده موجود نیست',503);
      $conditions[]="REPLACE(u.$column,'/','-') $operator ?";
      $params[]=$normalized;
    }
    foreach(['employment_start','employment_end'] as $prefix){
      $from=$body[$prefix.'_from']??'';
      $to=$body[$prefix.'_to']??'';
      if($from!==''&&$to!==''&&IranCalendar::normalize($from)>IranCalendar::normalize($to))
        Http::error('تاریخ شروع بازه فیلتر از پایان آن بزرگ‌تر است',422);
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
    $userIds=array_map(static fn($row)=>(int)$row['id'],$users);
    if($userIds&&$customIds&&self::hasTable('custom_field_values')) {
      // Read only selected users. Filtering by zone/role must not load unrelated
      // users' personal data, and report memory should scale with the result set.
      foreach(array_chunk($userIds,250) as $ids){
        $userMarks=implode(',',array_fill(0,count($ids),'?'));
        foreach(array_chunk($customIds,80) as $fieldIds){
          $fieldMarks=implode(',',array_fill(0,count($fieldIds),'?'));
          $sql="SELECT user_id,field_id,value FROM custom_field_values WHERE user_id IN ($userMarks) AND field_id IN ($fieldMarks)";
          foreach(Db::all($sql,array_merge($ids,$fieldIds)) as $r)
            $values[(int)$r['user_id']][(int)$r['field_id']]=$r['value'];
        }
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
      if($userIds&&self::hasTable('user_profile_attachments')){
        foreach(array_chunk($userIds,250) as $ids){
          $userMarks=implode(',',array_fill(0,count($ids),'?'));
          foreach(array_chunk($attachmentIds,80) as $fieldIds){
            $fieldMarks=implode(',',array_fill(0,count($fieldIds),'?'));
            $sql="SELECT user_id,field_id FROM user_profile_attachments WHERE user_id IN ($userMarks) AND field_id IN ($fieldMarks)";
            foreach(Db::all($sql,array_merge($ids,$fieldIds)) as $attached)
              $values[(int)$attached['user_id']][(int)$attached['field_id']]='ثبت شده';
          }
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
      if(in_array($key,['is_active','can_send_sms','allow_android','allow_web',
        'presence_required','security_exempt','can_be_substitute','can_welfare',
        'can_cultural','can_manage_temp_drivers'],true))return !empty($u[$key])?'بله':'خیر';
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
        // Normalize Jalali storage variants before date ordering.
        if(in_array($key,['birth_date','employment_start_date','employment_end_date','seniority_start'],true)){
          $ad=IranCalendar::normalize($av);$bd=IranCalendar::normalize($bv);
          $cmp=$ad&&$bd?strcmp($ad,$bd):strcmp($av,$bv);
        }else{
          $cmp=is_numeric($av)&&is_numeric($bv)
            ? (float)$av<=>(float)$bv
            : ($collator?$collator->compare($av,$bv):strnatcasecmp($av,$bv));
        }
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
      try{self::audit($actorId,'users_full_report_preview',[
        'columns'=>$columns,'sorts'=>$levels,'active'=>$active,
        'role_id'=>$body['role_id']??null,'zone_id'=>$body['zone_id']??null,
        'employment_dates'=>array_intersect_key($body,array_flip(['employment_start_from','employment_start_to','employment_end_from','employment_end_to'])),
        'row_count'=>count($users)
      ]);}catch(Throwable $error){error_log('Users report preview audit failed: '.get_class($error));Http::error('ثبت رویداد پیش‌نمایش گزارش ناموفق بود',503);}
      header('Content-Type: application/json; charset=utf-8');
      echo json_encode(['count'=>count($users),'columns'=>array_map(static fn($key)=>$lookup[$key]['label'],$columns),'sample'=>$sample],JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);
      exit;
    }
    require_once dirname(__DIR__).'/lib/XlsxWriter.php';
    $writer=new XlsxWriter(array_map(static fn($key)=>$lookup[$key]['label'],$columns));
    $writer->setProfessionalStyle();
    $writer->setFontName('Vazirmatn');
    $now=new DateTimeImmutable('now',new DateTimeZone('Asia/Tehran'));
    [$jy,$jm,$jd]=gregorian_to_jalali((int)$now->format('Y'),(int)$now->format('m'),(int)$now->format('d'));
    $writer->setReportHeading('گزارش کامل کاربران',
      sprintf('تاریخ تولید: %04d/%02d/%02d، ساعت %s',$jy,$jm,$jd,$now->format('H:i')),
      'تعداد کاربران: '.count($users).' | تعداد ستون‌ها: '.count($columns));
    foreach($columns as $index=>$key) {
      $writer->setColWidth($index, in_array($key,['address','email'],true)?32:20);
      // Keep every value as text: dates, IDs and account references must preserve leading zeros.
      $writer->setTextCol($index);
    }
    foreach($users as $u) {
      $row=[];foreach($columns as $key){
        $value=(string)$getter($u,$key);
        // An embedded image owns its cell; the status label is only for previews.
        if(($lookup[$key]['type']??'')==='embedded_image')$value='';
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
    // Build the entire ZIP before declaring a successful generation audit entry.
    $tmp=$writer->output('users_full.xlsx','کاربران',true);
    try{
      self::audit($actorId,'users_full_report_generated',[
        'columns'=>$columns,'sorts'=>$levels,'active'=>$active,
        'role_id'=>$body['role_id']??null,'zone_id'=>$body['zone_id']??null,
        'employment_dates'=>array_intersect_key($body,array_flip(['employment_start_from','employment_start_to','employment_end_from','employment_end_to'])),
        'row_count'=>count($users),'column_count'=>count($columns)
      ]);
    }catch(Throwable $error){
      @unlink($tmp);
      error_log('Users report export audit failed: '.get_class($error));
      Http::error('ثبت رویداد گزارش الزامی است؛ دانلود انجام نشد',503);
    }
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="users_full.xlsx"');
    header('Content-Length: '.filesize($tmp));
    try{readfile($tmp);}finally{@unlink($tmp);}
    exit;
  }
}
