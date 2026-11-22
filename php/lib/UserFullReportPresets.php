<?php
require_once __DIR__.'/UserFullReport.php';
require_once __DIR__.'/IranCalendar.php';

/** Server-side named configurations for the authorized administrative personnel export. */
final class UserFullReportPresets {
  private static function schema(): void {
    Db::run("CREATE TABLE IF NOT EXISTS user_full_report_presets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      owner_user_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(120) NOT NULL,
      visibility VARCHAR(10) NOT NULL DEFAULT 'private',
      settings_json LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_ufrp_owner (owner_user_id),
      INDEX idx_ufrp_visibility (visibility)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  }

  /** Reject obsolete, forged, and unauthorized fields before persisting a preset. */
  public static function validated(array $raw,?array $available=null): array {
    $lookup=array_column($available??UserFullReport::availableColumns(),null,'key');
    $columns=$raw['columns']??null;
    if(!is_array($columns)||!array_is_list($columns)||!count($columns)||count($columns)>500)
      throw new InvalidArgumentException('فهرست ستون‌ها معتبر نیست');
    $selected=[];
    foreach($columns as $key){
      if(!is_string($key)||!isset($lookup[$key]))
        throw new InvalidArgumentException('ستون غیرمجاز در تنظیم گزارش');
      if(!in_array($key,$selected,true))$selected[]=$key;
    }
    $sort=(string)($raw['sort']??'id');
    if(!isset($lookup[$sort]))throw new InvalidArgumentException('مرتب‌سازی نامعتبر است');
    $direction=(string)($raw['direction']??'asc');
    if(!in_array($direction,['asc','desc'],true))throw new InvalidArgumentException('جهت مرتب‌سازی نامعتبر است');
    $sorts=$raw['sorts']??[['key'=>$sort,'direction'=>$direction]];
    if(!is_array($sorts)||!array_is_list($sorts)||!count($sorts)||count($sorts)>3)
      throw new InvalidArgumentException('سطوح مرتب‌سازی نامعتبر است');
    $outSorts=[];
    foreach($sorts as $level){
      if(!is_array($level)||!is_string($level['key']??null)||!isset($lookup[$level['key']])||
        !in_array($level['direction']??null,['asc','desc'],true))
        throw new InvalidArgumentException('سطح مرتب‌سازی غیرمجاز است');
      $outSorts[]=['key'=>$level['key'],'direction'=>$level['direction']];
    }
    $active=(string)($raw['active']??'all');
    if(!in_array($active,['all','1','0'],true))throw new InvalidArgumentException('وضعیت انتخابی نامعتبر است');
    $result=['columns'=>$selected,'sort'=>$sort,'direction'=>$direction,'sorts'=>$outSorts,'active'=>$active];
    foreach(['role_id','zone_id'] as $field){
      $value=$raw[$field]??'';
      if($value===null||$value===''){$result[$field]='';continue;}
      if(!ctype_digit((string)$value)||(int)$value<1)throw new InvalidArgumentException('فیلتر سازمانی نامعتبر است');
      $result[$field]=(int)$value;
    }
    foreach(['employment_start_from','employment_start_to',
             'employment_end_from','employment_end_to'] as $key){
      $value=trim((string)($raw[$key]??''));
      if($value===''){$result[$key]='';continue;}
      $normalized=IranCalendar::normalize($value);
      if(!$normalized||!preg_match('/^1[34][0-9]{2}-/',$normalized))
        throw new InvalidArgumentException('فیلتر تاریخ همکاری معتبر نیست');
      $result[$key]=$normalized;
    }
    foreach(['employment_start','employment_end'] as $prefix)
      if($result[$prefix.'_from']!==''&&$result[$prefix.'_to']!==''&&
         $result[$prefix.'_from']>$result[$prefix.'_to'])
        throw new InvalidArgumentException('بازه تاریخ همکاری نامعتبر است');
    return $result;
  }
  public static function listFor(int $actor): array {
    self::schema();
    $rows=Db::all("SELECT id,owner_user_id,name,visibility,settings_json,created_at,updated_at
      FROM user_full_report_presets WHERE owner_user_id=? OR visibility='shared'
      ORDER BY updated_at DESC,id DESC LIMIT 100",[$actor]);
    foreach($rows as &$row){
      $decoded=json_decode((string)$row['settings_json'],true);
      $row['settings']=is_array($decoded)?$decoded:[];
      unset($row['settings_json']);
      $row['id']=(int)$row['id'];
      $row['owner_user_id']=(int)$row['owner_user_id'];
    }unset($row);
    return $rows;
  }
  public static function save(int $actor,bool $admin,array $body): array {
    self::schema();
    $name=trim((string)($body['name']??''));
    if($name===''||mb_strlen($name)>120)throw new InvalidArgumentException('نام تنظیم گزارش باید بین ۱ تا ۱۲۰ کاراکتر باشد');
    $visibility=(string)($body['visibility']??'private');
    if(!in_array($visibility,['private','shared'],true))throw new InvalidArgumentException('دامنه دسترسی نامعتبر است');
    if($visibility==='shared'&&!$admin)throw new DomainException('فقط مدیر کل می‌تواند قالب عمومی ایجاد کند');
    $settings=self::validated((array)($body['settings']??[]));
    $json=json_encode($settings,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
    $id=(int)($body['id']??0);
    if($id>0){
      $previous=Db::one('SELECT id,owner_user_id,visibility FROM user_full_report_presets WHERE id=?',[$id]);
      if(!$previous)throw new DomainException('قالب ذخیره‌شده پیدا نشد');
      if((int)$previous['owner_user_id']!==$actor)throw new DomainException('ویرایش قالب سایر کاربران مجاز نیست');
      if($previous['visibility']==='shared'&&!$admin)throw new DomainException('ویرایش قالب عمومی مجاز نیست');
      Db::run('UPDATE user_full_report_presets SET name=?,visibility=?,settings_json=?,updated_at=NOW() WHERE id=? AND owner_user_id=?',
        [$name,$visibility,$json,$id,$actor]);
    }else{
      $id=(int)Db::insert('INSERT INTO user_full_report_presets(owner_user_id,name,visibility,settings_json) VALUES(?,?,?,?)',
        [$actor,$name,$visibility,$json]);
    }
    return ['id'=>$id,'ok'=>true];
  }
  public static function remove(int $actor,bool $admin,int $id): array {
    self::schema();
    $row=Db::one('SELECT owner_user_id,visibility FROM user_full_report_presets WHERE id=?',[$id]);
    if(!$row)throw new DomainException('قالب انتخابی وجود ندارد');
    if((int)$row['owner_user_id']!==$actor)throw new DomainException('حذف قالب کاربران دیگر مجاز نیست');
    if($row['visibility']==='shared'&&!$admin)throw new DomainException('حذف قالب عمومی مجاز نیست');
    Db::run('DELETE FROM user_full_report_presets WHERE id=? AND owner_user_id=?',[$id,$actor]);
    return ['ok'=>true];
  }
}
