<?php
require_once __DIR__.'/UserProfileForms.php';
require_once __DIR__.'/UserProfileRules.php';

/**
 * Authenticated, private personnel attachments. Public URLs and base64 profile
 * values are deliberately forbidden; only opaque server-side storage names are
 * ever persisted. The application document root must remain php/app.
 */
final class UserProfileAttachments {
  private const MAX_BYTES=8388608;
  private const ALLOWED=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp','application/pdf'=>'pdf'];

  public static function ready(): bool {
    $row=Db::one("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='user_profile_attachments'");
    return (int)($row['n']??0)===1;
  }
  private static function fail(string $message): never {throw new InvalidArgumentException($message);}

  public static function inspect(string $bytes,string $filename,string $type): array {
    $length=strlen($bytes);
    if($length<12||$length>self::MAX_BYTES)self::fail('اندازه فایل باید کمتر از ۸ مگابایت باشد');
    if(!in_array($type,['file','image'],true))self::fail('این فیلد مجوز دریافت فایل ندارد');
    if(!function_exists('finfo_open'))self::fail('امکان بررسی امنیت فایل در سرور فراهم نیست');
    $info=finfo_open(FILEINFO_MIME_TYPE);
    $mime=$info?finfo_buffer($info,$bytes):false;
    if($info)finfo_close($info);
    if(!is_string($mime)||!isset(self::ALLOWED[$mime]))self::fail('فقط PDF، JPEG، PNG و WebP مجاز هستند');
    if($type==='image'&&$mime==='application/pdf')self::fail('برای این فیلد فقط تصویر مجاز است');
    if($mime==='application/pdf'){
      if(substr($bytes,0,5)!=='%PDF-')self::fail('ساختار سند PDF نامعتبر است');
    }else{
      if(!function_exists('getimagesizefromstring'))self::fail('بررسی تصویر در سرور فراهم نیست');
      $size=@getimagesizefromstring($bytes);
      if(!$size||($size['mime']??'')!==$mime||(int)$size[0]<1||(int)$size[1]<1
        ||(int)$size[0]>6000||(int)$size[1]>6000)self::fail('ابعاد یا ساختار تصویر معتبر نیست');
    }
    // Strip path separators separately: a trailing backslash in a regex character
    // class would invalidate the entire pattern and silently discard Persian names.
    $clean=str_replace(['/', chr(92)], '_', trim($filename));
    $clean=preg_replace('/[\x00-\x1F\x7F]+/u','_',$clean);
    if(!is_string($clean)||$clean==='')$clean='profile-document.'.self::ALLOWED[$mime];
    $clean=mb_substr($clean,0,160);
    return ['mime_type'=>$mime,'extension'=>self::ALLOWED[$mime],
      'file_size'=>$length,'sha256'=>hash('sha256',$bytes),'original_name'=>$clean];
  }

  /**
   * Reflect existing private uploads in conditional/required form validation.
   * File contents and private storage paths are never exposed as field values.
   */
  public static function effectiveValues(int $userId,array $schema,array $values): array {
    $ids=[];
    foreach($schema['sections']??[] as $section)foreach($section['fields']??[] as $field){
      if(($field['binding']??'')!=='custom'||!in_array($field['type']??'', ['image','file'],true))continue;
      $id=(int)($field['custom_field_id']??0);
      if($id>0)$ids[$id]=true;
    }
    if(!$ids)return $values;
    if(!self::ready())throw new RuntimeException('Private attachment schema is not installed');
    $keys=array_keys($ids);
    $marks=implode(',',array_fill(0,count($keys),'?'));
    $rows=Db::all("SELECT field_id FROM user_profile_attachments WHERE user_id=? AND field_id IN ($marks)",
      array_merge([$userId],$keys));
    $present=array_fill_keys(array_map('intval',array_column($rows,'field_id')),true);
    foreach($keys as $id)$values['cf_'.$id]=isset($present[$id])?'1':null;
    return $values;
  }

  /** Only published, active custom file/image definitions may receive bytes. */
  public static function definition(int $fieldId,int $userId,bool $write,bool $selfEdit): array {
    if($fieldId<1||$userId<1)self::fail('شناسه اطلاعات پرسنلی نامعتبر است');
    $row=Db::one('SELECT id,ftype,is_active,user_editable FROM custom_fields WHERE id=?',[$fieldId]);
    if(!$row||(int)$row['is_active']!==1||!in_array($row['ftype'],['file','image'],true))
      self::fail('فیلد مدرک فعال و معتبر نیست');
    $published=UserProfileForms::published()['schema'];
    $field=null;
    foreach($published['sections']??[] as $section)foreach($section['fields']??[] as $candidate)
      if(($candidate['binding']??'')==='custom'&&(int)($candidate['custom_field_id']??0)===$fieldId){$field=$candidate;break 2;}
    if(!$field||($field['type']??'')!==$row['ftype'])self::fail('فیلد مدرک در فرم منتشرشده وجود ندارد');
    if($selfEdit&&$write){
      if(!(bool)$row['user_editable'])self::fail('ویرایش این مدرک برای کاربر مجاز نیست');
      if(($field['android_visible']??true)===false)self::fail('این مدرک در اندروید قابل ویرایش نیست');
      $user=Db::one('SELECT * FROM users WHERE id=?',[$userId]);
      if(!$user)self::fail('پرونده کاربر یافت نشد');
      $values=$user;
      foreach(Db::all('SELECT field_id,value FROM custom_field_values WHERE user_id=?',[$userId]) as $value)
        $values['cf_'.(int)$value['field_id']]=$value['value'];
      $state=UserProfileRules::state($field,$values);
      if(!$state['visible']||!$state['enabled']||$state['readonly'])self::fail('این مدرک در وضعیت فعلی قابل ویرایش نیست');
      $identity=(int)$userId;
      $role=(int)($user['role_id']??0);
      foreach(['deny_users'=>$identity,'deny_roles'=>$role] as $key=>$candidate)
        if($candidate>0&&in_array($candidate,array_map('intval',(array)($field[$key]??[])),true))
          self::fail('مجوز ویرایش مدرک صادر نشده است');
      $allowUsers=array_map('intval',(array)($field['edit_users']??[]));
      $allowRoles=array_map('intval',(array)($field['edit_roles']??[]));
      if(($allowUsers||$allowRoles)&&!in_array($identity,$allowUsers,true)&&!in_array($role,$allowRoles,true))
        self::fail('مجوز ویرایش مدرک صادر نشده است');
    }
    if(!$selfEdit&&$write&&!empty($field['admin_readonly']))self::fail('این مدرک توسط مدیر قابل ویرایش نیست');
    return $field;
  }

  private static function directory(): string {
    $root=dirname(__DIR__);
    $dir=$root.'/private/profile-attachments';
    $public=realpath($root.'/app');
    if($public!==false&&str_starts_with($dir,$public.'/'))
      throw new RuntimeException('Private storage overlaps application document root');
    if(!is_dir($dir)&&!@mkdir($dir,0700,true)&&!is_dir($dir))
      throw new RuntimeException('Private attachment storage is not writable');
    @chmod($dir,0700);
    return $dir;
  }

  public static function save(int $userId,int $fieldId,int $actorId,array $uploaded,string $type): array {
    if(!self::ready())throw new RuntimeException('Private attachment storage migration missing');
    if(($uploaded['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK)
      self::fail('فایل به‌طور کامل ارسال نشد');
    $tmp=(string)($uploaded['tmp_name']??'');
    if($tmp===''||!is_uploaded_file($tmp))self::fail('فایل آپلود معتبر نیست');
    if((int)($uploaded['size']??0)<12||(int)$uploaded['size']>self::MAX_BYTES)
      self::fail('اندازه فایل بیشتر از حد مجاز است');
    $bytes=file_get_contents($tmp,false,null,0,self::MAX_BYTES+1);
    if(!is_string($bytes))self::fail('خواندن فایل ارسالی ناموفق بود');
    $metadata=self::inspect($bytes,(string)($uploaded['name']??''),$type);
    $name=bin2hex(random_bytes(16)).'.'.$metadata['extension'];
    $dir=self::directory();$destination=$dir.'/'.$name;
    if(!move_uploaded_file($tmp,$destination))throw new RuntimeException('ذخیره مدرک در فضای خصوصی ناموفق بود');
    @chmod($destination,0600);
    $pdo=Db::pdo();$old=null;
    try{
      $pdo->beginTransaction();
      $existing=Db::one('SELECT storage_name FROM user_profile_attachments WHERE user_id=? AND field_id=? FOR UPDATE',[$userId,$fieldId]);
      $old=$existing['storage_name']??null;
      Db::run('INSERT INTO user_profile_attachments(user_id,field_id,storage_name,original_name,mime_type,file_size,sha256,uploaded_by) VALUES(?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE storage_name=VALUES(storage_name),original_name=VALUES(original_name),mime_type=VALUES(mime_type),file_size=VALUES(file_size),sha256=VALUES(sha256),uploaded_by=VALUES(uploaded_by),updated_at=NOW()',
        [$userId,$fieldId,$name,$metadata['original_name'],$metadata['mime_type'],$metadata['file_size'],$metadata['sha256'],$actorId]);
      $pdo->commit();
    }catch(Throwable $error){
      if($pdo->inTransaction())$pdo->rollBack();
      @unlink($destination);
      throw $error;
    }
    if(is_string($old)&&preg_match('/^[a-f0-9]{32}\.(?:pdf|jpg|png|webp)$/D',$old))@unlink($dir.'/'.$old);
    return ['ok'=>true,'exists'=>true,'name'=>$metadata['original_name'],
      'mime_type'=>$metadata['mime_type'],'bytes'=>$metadata['file_size']];
  }

  public static function status(int $userId,int $fieldId): array {
    if(!self::ready())return ['exists'=>false,'unavailable'=>true];
    $row=Db::one('SELECT original_name,mime_type,file_size,created_at,updated_at FROM user_profile_attachments WHERE user_id=? AND field_id=?',[$userId,$fieldId]);
    return $row?['exists'=>true,'name'=>$row['original_name'],'mime_type'=>$row['mime_type'],
      'bytes'=>(int)$row['file_size'],'updated_at'=>$row['updated_at']]:['exists'=>false];
  }

  public static function send(int $userId,int $fieldId): never {
    if(!self::ready())throw new RuntimeException('Private attachment storage migration missing');
    $row=Db::one('SELECT storage_name,original_name,mime_type,file_size FROM user_profile_attachments WHERE user_id=? AND field_id=?',[$userId,$fieldId]);
    if(!$row)Http::error('مدرکی برای این فیلد ثبت نشده است',404);
    $name=(string)$row['storage_name'];
    if(!preg_match('/^[a-f0-9]{32}\.(?:pdf|jpg|png|webp)$/D',$name))throw new RuntimeException('Stored attachment identifier invalid');
    $file=self::directory().'/'.$name;
    if(!is_file($file))throw new RuntimeException('Private attachment not found on disk');
    header('Content-Type: '.$row['mime_type']);
    header('Content-Disposition: attachment; filename="profile-document.'.pathinfo($name,PATHINFO_EXTENSION).'"; filename*=UTF-8\'\''.rawurlencode((string)$row['original_name']));
    header('Content-Length: '.filesize($file));
    header('Cache-Control: private, no-store, max-age=0');
    header('Pragma: no-cache');
    header('X-Content-Type-Options: nosniff');
    readfile($file);
    exit;
  }
}
