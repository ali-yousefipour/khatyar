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
      'id'=>'شناسه کاربری','personnel_code'=>'شماره پرسنلی','username'=>'نام کاربری',
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
      if ($key==='role_title'||($key==='personnel_code')||self::hasColumn('users',$key))
        $base[]=['key'=>$key,'label'=>$label,'group'=>'هویتی و سازمانی'];
    }
    $custom=[];
    if(self::hasTable('custom_fields')) {
      $records=Db::all("SELECT id,label FROM custom_fields WHERE is_active=1 ORDER BY sort_order,id");
      foreach($records as $f) $custom[]=['key'=>'custom:'.(int)$f['id'],'label'=>(string)$f['label'],'group'=>'فیلدهای سفارشی'];
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
      return $original;
    }
  }
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
        $ordered[$key]=$row;
      }
    }
    foreach($original as $row){
      if(!isset($ordered[$row['key']])&&!isset($excluded[$row['key']]))$ordered[$row['key']]=$row;
    }
    return array_values($ordered);
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
    if(!$columns||count($columns)>150)Http::error('حداقل یک ستون معتبر انتخاب کنید',422);
    $sort=(string)($body['sort']??'id');
    if(!isset($lookup[$sort]))Http::error('فیلد مرتب‌سازی نامعتبر است',422);
    $dir=(string)($body['direction']??'asc');
    if(!in_array($dir,['asc','desc'],true))Http::error('جهت مرتب‌سازی نامعتبر است',422);
    $userKeys=array_filter(array_unique(array_merge($columns,[$sort])),static fn($k)=>strpos($k,'custom:')!==0);
    $select=['u.id','r.title AS role_title'];
    foreach($userKeys as $key) {
      if(in_array($key,['id','role_title','personnel_code'],true))continue;
      $select[]='u.`'.$key.'`';
    }
    if(self::hasColumn('users','personnel_code'))$select[]='u.personnel_code';
    $users=Db::all("SELECT ".implode(',',$select)." FROM users u LEFT JOIN roles r ON r.id=u.role_id ORDER BY u.id");
    $customIds=[];
    foreach(array_merge($columns,[$sort]) as $key) if(strpos($key,'custom:')===0)$customIds[]=(int)substr($key,7);
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
    $getter=static function(array $u,string $key)use(&$values,$personnelIds) {
      if(strpos($key,'custom:')===0)return $values[(int)$u['id']][(int)substr($key,7)]??'';
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
    $collator=class_exists('Collator')?new Collator('fa_IR'):null;
    usort($users,static function($a,$b)use($sort,$dir,$getter,$collator) {
      $av=(string)$getter($a,$sort);$bv=(string)$getter($b,$sort);
      if(is_numeric($av)&&is_numeric($bv))$cmp=(float)$av<=>(float)$bv;
      else $cmp=$collator?$collator->compare($av,$bv):strnatcasecmp($av,$bv);
      if(!$cmp)$cmp=(int)$a['id']<=>(int)$b['id'];
      return $dir==='desc'?-$cmp:$cmp;
    });
    require_once dirname(__DIR__).'/lib/XlsxWriter.php';
    $writer=new XlsxWriter(array_map(static fn($key)=>$lookup[$key]['label'],$columns));
    foreach($users as $u) {
      $row=[];foreach($columns as $key){
        $value=(string)$getter($u,$key);
        // Prevent spreadsheet formula injection in user-controlled text.
        if(preg_match('/^[=+@\\-]/u',$value))$value="'".$value;
        $row[]=$value;
      }
      $writer->addRow($row);
    }
    $writer->output('users_full.xlsx','کاربران');
    exit;
  }
}
