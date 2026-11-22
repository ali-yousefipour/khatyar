<?php
require_once __DIR__.'/UserProfileRules.php';
/**
 * Published personnel-form schemas are immutable. The legacy users and
 * custom_fields/custom_field_values tables remain the authoritative data store.
 */
final class UserProfileForms {
  private const KEY='personnel_profile';
  private const SYSTEM_FIELDS=['first_name','last_name','email','mobile','address','national_code',
    'marital_status','children_count','birth_date','personnel_code','employment_start_date',
    'employment_end_date','zone_id','role_id','rank_stars'];
  private static function json(array $value): string {
    return json_encode($value,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
  }
  public static function available(): bool {
    $tables=['user_form_definitions','user_form_versions','user_form_audit_logs'];
    $marks=implode(',',array_fill(0,count($tables),'?'));
    $row=Db::one("SELECT COUNT(DISTINCT table_name) AS n FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ($marks)",$tables);
    return (int)($row['n']??0)===count($tables);
  }
  public static function initialSchema(): array {
    $system=[
      ['key'=>'first_name','label'=>'نام','type'=>'text','required'=>true],
      ['key'=>'last_name','label'=>'نام خانوادگی','type'=>'text','required'=>true],
      ['key'=>'national_code','label'=>'کد ملی','type'=>'national_id'],
      ['key'=>'birth_date','label'=>'تاریخ تولد','type'=>'date'],
      ['key'=>'marital_status','label'=>'وضعیت تأهل','type'=>'select','options'=>['مجرد','متاهل','متأهل']],
      ['key'=>'children_count','label'=>'تعداد فرزند','type'=>'number'],
      ['key'=>'mobile','label'=>'تلفن همراه','type'=>'mobile'],
      ['key'=>'email','label'=>'ایمیل','type'=>'email'],
      ['key'=>'address','label'=>'نشانی','type'=>'textarea'],
      ['key'=>'personnel_code','label'=>'شماره پرسنلی','type'=>'text'],
      ['key'=>'employment_start_date','label'=>'شروع همکاری','type'=>'date'],
      ['key'=>'employment_end_date','label'=>'پایان همکاری','type'=>'date'],
      ['key'=>'role_id','label'=>'سمت سازمانی','type'=>'number'],
      ['key'=>'zone_id','label'=>'منطقه','type'=>'number'],
      ['key'=>'rank_stars','label'=>'درجه','type'=>'number']
    ];
    foreach($system as &$field){
      $field['binding']='system';
      $field['readonly']=!in_array($field['key'],
        ['email','mobile','address','national_code','marital_status','children_count','birth_date'],true);
    }unset($field);
    $custom=[];
    foreach(Db::all("SELECT id,label,fkey,ftype,options,required,user_editable FROM custom_fields WHERE is_active=1 ORDER BY sort_order,id") as $row){
      $type=(string)($row['ftype']??'text');
      if(!in_array($type,UserProfileRules::FIELD_TYPES,true))$type='text';
      $field=['key'=>'cf_'.(int)$row['id'],'label'=>(string)$row['label'],
        'type'=>$type,'binding'=>'custom','custom_field_id'=>(int)$row['id'],
        'required'=>(bool)$row['required'],'readonly'=>!(bool)$row['user_editable']];
      if($type==='repeater'){
        $config=json_decode((string)($row['options']??''),true);
        if(is_array($config)){
          $field['columns']=$config['columns']??[];
          $field['min_rows']=$config['min_rows']??0;
          $field['max_rows']=$config['max_rows']??12;
        }else{
          // A malformed legacy definition stays visible but cannot be edited.
          $field['readonly']=true;
          $field['columns']=[['key'=>'child_name','label'=>'نام فرزند','type'=>'text']];
          $field['max_rows']=12;
        }
      }else{
        $field['options']=array_values(array_filter(explode('|',(string)($row['options']??'')),static fn($v)=>$v!==''));
      }
      $custom[]=$field;
    }
    return ['schema_version'=>1,'form_key'=>self::KEY,'sections'=>[
      ['key'=>'identity','title'=>'اطلاعات هویتی و فردی','fields'=>array_slice($system,0,6)],
      ['key'=>'contact','title'=>'اطلاعات تماس و نشانی','fields'=>array_slice($system,6,3)],
      ['key'=>'employment','title'=>'اطلاعات استخدامی و سازمانی','fields'=>array_slice($system,9)],
      ['key'=>'additional','title'=>'اطلاعات تکمیلی پرسنل','fields'=>$custom]
    ]];
  }
  public static function validate(array $schema): void {
    UserProfileRules::validate($schema);
    $keys=[];$customIds=[];
    foreach($schema['sections'] as $section)foreach($section['fields'] as $field){
      $key=$field['key'];$binding=$field['binding']??null;
      foreach(['edit_roles','edit_users','deny_roles','deny_users'] as $permission){
        if(!array_key_exists($permission,$field))continue;
        $list=$field[$permission];
        if(!is_array($list)||!array_is_list($list)||count($list)>500)throw new InvalidArgumentException('فهرست مجوزهای فرم نامعتبر است');
        foreach($list as $id)if(!is_int($id)||$id<1)throw new InvalidArgumentException('شناسه نقش یا کاربر در مجوز نامعتبر است');
      }
      $systemTypes=['first_name'=>'text','last_name'=>'text','email'=>'email','mobile'=>'mobile',
        'address'=>'textarea','national_code'=>'national_id','marital_status'=>'select',
        'children_count'=>'number','birth_date'=>'date','personnel_code'=>'text',
        'employment_start_date'=>'date','employment_end_date'=>'date','zone_id'=>'number',
        'role_id'=>'number','rank_stars'=>'number'];
      if($binding==='system' && ($field['type']??null)!==($systemTypes[$key]??null))
        throw new InvalidArgumentException('نوع فیلد سیستمی محافظت‌شده است');
      if($binding==='system' && (!in_array($key,self::SYSTEM_FIELDS,true)||isset($field['custom_field_id'])))
        throw new InvalidArgumentException('اتصال به فیلد سیستمی غیرمجاز است');
      if($binding==='custom'){
        $id=$field['custom_field_id']??null;
        if(!is_int($id)||$id<1||$key!=='cf_'.$id||isset($customIds[$id]))
          throw new InvalidArgumentException('اتصال فیلد سفارشی نامعتبر یا تکراری است');
        $customIds[$id]=true;
      }elseif($binding!=='system'&&$binding!=='display')
        throw new InvalidArgumentException('فیلد باید به یک منبع مجاز متصل باشد');
      $keys[$key]=true;
    }
    if($customIds){
      $ids=array_keys($customIds);
      $marks=implode(',',array_fill(0,count($ids),'?'));
      $known=Db::all("SELECT id FROM custom_fields WHERE id IN ($marks) AND is_active=1",$ids);
      $actual=array_fill_keys(array_map('intval',array_column($known,'id')),true);
      foreach($ids as $id)if(!isset($actual[$id]))
        throw new InvalidArgumentException('فیلد سفارشی غیرفعال یا ناشناخته است: '.$id);
    }
  }
  public static function published(): array {
    if(!self::available())return ['version'=>0,'schema'=>self::initialSchema(),'source'=>'legacy_fallback'];
    $row=Db::one("SELECT v.version,v.schema_json FROM user_form_definitions f JOIN user_form_versions v ON v.form_id=f.id AND v.version=f.published_version WHERE f.form_key=?", [self::KEY]);
    if(!$row)return ['version'=>0,'schema'=>self::initialSchema(),'source'=>'legacy_fallback'];
    return ['version'=>(int)$row['version'],'schema'=>json_decode((string)$row['schema_json'],true,512,JSON_THROW_ON_ERROR),'source'=>'published'];
  }
  private static function definition(): ?array {
    return Db::one("SELECT id,draft_json,published_version,revision FROM user_form_definitions WHERE form_key=?", [self::KEY]);
  }
  public static function draft(): array {
    if(!self::available())throw new RuntimeException('مهاجرت جداول فرم‌ساز پرسنلی هنوز اجرا نشده است');
    $row=self::definition();
    return ['revision'=>(int)($row['revision']??0),'published_version'=>(int)($row['published_version']??0),
      'schema'=>!empty($row['draft_json'])?json_decode($row['draft_json'],true,512,JSON_THROW_ON_ERROR):self::published()['schema']];
  }
  public static function saveDraft(array $schema,int $revision,int $actor): array {
    self::validate($schema);
    if(!self::available())throw new RuntimeException('مهاجرت فرم‌ساز اجرا نشده است');
    $data=self::json($schema);
    $row=self::definition();
    if(!$row){
      if($revision!==0)throw new DomainException('نسخه ویرایش‌شده قدیمی است');
      Db::insert("INSERT INTO user_form_definitions(form_key,title,draft_json,revision,updated_by) VALUES(?,?,?,1,?)",[self::KEY,'اطلاعات جامع پرسنلی',$data,$actor]);
      $id=Db::one("SELECT id FROM user_form_definitions WHERE form_key=?",[self::KEY])['id'];
      $next=1;
    }else{
      if((int)$row['revision']!==$revision)throw new DomainException('فرم توسط مدیر دیگری ویرایش شده است؛ مجدداً بارگذاری کنید');
      $affected=Db::exec("UPDATE user_form_definitions SET draft_json=?,revision=revision+1,updated_by=? WHERE id=? AND revision=?",[$data,$actor,(int)$row['id'],$revision]);
      if($affected!==1)throw new DomainException('فرم هم‌زمان تغییر یافته است');
      $id=$row['id'];$next=$revision+1;
    }
    Db::run("INSERT INTO user_form_audit_logs(form_id,actor_id,action,metadata_json) VALUES(?,?,?,?)",[(int)$id,$actor,'save_draft','{}']);
    return ['ok'=>true,'revision'=>$next];
  }
  public static function versions(): array {
    if(!self::available())return [];
    return Db::all('SELECT v.version,v.published_by,v.published_at FROM user_form_versions v JOIN user_form_definitions f ON f.id=v.form_id WHERE f.form_key=? ORDER BY v.version DESC LIMIT 100',[self::KEY]);
  }
  public static function restoreDraft(int $version,int $revision,int $actor): array {
    if($version<1||!self::available())throw new DomainException('نسخه معتبر نیست');
    $row=Db::one('SELECT v.schema_json FROM user_form_versions v JOIN user_form_definitions f ON f.id=v.form_id WHERE f.form_key=? AND v.version=?',[self::KEY,$version]);
    if(!$row)throw new DomainException('نسخه قدیمی یافت نشد');
    $schema=json_decode($row['schema_json'],true,512,JSON_THROW_ON_ERROR);
    $result=self::saveDraft($schema,$revision,$actor);
    $id=self::definition()['id'];
    Db::run("INSERT INTO user_form_audit_logs(form_id,actor_id,action,version,metadata_json) VALUES(?,?,?,?,?)",
      [(int)$id,$actor,'restore_draft',$version,'{}']);
    return $result+['restored_from'=>$version,'schema'=>$schema];
  }
  public static function publish(int $revision,int $actor): array {
    if(!self::available())throw new RuntimeException('مهاجرت فرم‌ساز اجرا نشده است');
    $pdo=Db::pdo();$pdo->beginTransaction();
    try{
      $row=Db::one("SELECT id,revision,published_version,draft_json FROM user_form_definitions WHERE form_key=? FOR UPDATE",[self::KEY]);
      if(!$row||(int)$row['revision']!==$revision||empty($row['draft_json']))throw new DomainException('نسخه پیش‌نویس معتبر یا به‌روز نیست');
      $schema=json_decode($row['draft_json'],true,512,JSON_THROW_ON_ERROR);
      self::validate($schema);
      $version=(int)($row['published_version']??0)+1;
      Db::insert("INSERT INTO user_form_versions(form_id,version,schema_json,published_by) VALUES(?,?,?,?)",[(int)$row['id'],$version,self::json($schema),$actor]);
      Db::run("UPDATE user_form_definitions SET published_version=? WHERE id=?",[$version,(int)$row['id']]);
      Db::run("INSERT INTO user_form_audit_logs(form_id,actor_id,action,version,metadata_json) VALUES(?,?,?,?,?)",[(int)$row['id'],$actor,'publish',$version,'{}']);
      $pdo->commit();
      return ['ok'=>true,'version'=>$version];
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
  }
}
