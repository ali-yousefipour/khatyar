<?php
require_once __DIR__.'/UserProfileRules.php';
/** Pure, fail-closed input planner; the controller commits the plan atomically. */
final class UserProfileFormValues {
  private const SELF_EDIT=['email','mobile','address','national_code','marital_status','children_count','birth_date'];
  private static function fail(string $message): never {throw new InvalidArgumentException($message);}
  private static function permitted(array $field,array $context): bool {
    $uid=(int)($context['id']??0);$role=(int)($context['role_id']??0);
    $denyUsers=array_map('intval',(array)($field['deny_users']??[]));
    $denyRoles=array_map('intval',(array)($field['deny_roles']??[]));
    if(in_array($uid,$denyUsers,true)||in_array($role,$denyRoles,true))return false;
    $users=array_map('intval',(array)($field['edit_users']??[]));
    $roles=array_map('intval',(array)($field['edit_roles']??[]));
    if(!$users&&!$roles)return true;
    return $uid>0&&in_array($uid,$users,true)||$role>0&&in_array($role,$roles,true);
  }
  public static function plan(array $schema,array $submitted,array $stored,bool $selfEdit=true,array $context=[]): array {
    $fields=[];
    foreach($schema['sections']??[] as $section)foreach($section['fields']??[] as $field) {
      if(!empty($field['key']))$fields[$field['key']]=$field;
    }
    $effective=$stored;
    foreach($submitted as $key=>$value){
      if(!is_string($key)||!isset($fields[$key]))self::fail('فیلد اطلاعاتی ناشناخته است');
      if(is_array($value)){
        if(!array_is_list($value)||count($value)>50)self::fail('فرمت پاسخ چندانتخابی نامعتبر است');
        foreach($value as $part)if(!is_string($part)||mb_strlen($part)>300)self::fail('گزینه انتخابی نامعتبر است');
      }elseif(!is_string($value)&&!is_int($value)&&!is_float($value)&&!is_bool($value)&&$value!==null)
        self::fail('نوع مقدار نامعتبر است');
      $effective[$key]=$value;
    }
    $result=['system'=>[],'custom'=>[]];
    foreach($fields as $key=>$field){
      $state=UserProfileRules::state($field,$effective);
      $has=array_key_exists($key,$submitted);
      if($has){
        if($selfEdit&&($field['android_visible']??true)===false)self::fail('این فیلد در فرم اندروید قابل ویرایش نیست');
        if($selfEdit&&!self::permitted($field,$context))self::fail('مجوز ویرایش این فیلد برای نقش یا کاربر صادر نشده است');
        if(!$state['visible']||!$state['enabled']||$state['readonly'])
          self::fail('ویرایش این فیلد در وضعیت فعلی مجاز نیست: '.($field['label']??$key));
        if(($field['binding']??null)==='system' && ($selfEdit&&!in_array($key,self::SELF_EDIT,true)))
          self::fail('ویرایش فیلد سیستمی توسط کاربر مجاز نیست');
        if(!in_array($field['binding']??null,['system','custom'],true))
          self::fail('فیلد قابل ذخیره نیست');
        if(!$selfEdit && !empty($field['admin_readonly']))self::fail('فیلد توسط مدیر قابل ویرایش نیست');
        $value=self::validateValue($field,$submitted[$key]);
        if(($field['binding']??null)==='system')$result['system'][$key]=$value;
        else $result['custom'][(int)($field['custom_field_id']??0)]=$value;
      }
      if($selfEdit&&$state['visible']&&$state['enabled']&&$state['required']&&!$state['readonly']
        &&self::permitted($field,$context)
        &&(($field['binding']??'')!=='system'||in_array($key,self::SELF_EDIT,true))){
        $value=$effective[$key]??null;
        $empty=$value===null||$value===''||(is_array($value)&&!count($value));
        if(($field['type']??'')==='repeater'&&!$empty){
          $records=is_string($value)?json_decode($value,true):$value;
          $empty=is_array($records)&&array_is_list($records)&&count($records)===0;
        }
        if($empty)
          self::fail('تکمیل فیلد «'.($field['label']??$key).'» الزامی است');
      }
    }
    return $result;
  }
  /** Validate one configured custom field without bypassing the profile rules. */
  public static function normalizeField(array $field,$value): mixed {
    return self::validateValue($field,$value);
  }
  private static function checkCard(string $value): array {
    $value=str_replace(['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹','٠','١','٢','٣','٤','٥','٦','٧','٨','٩'],['0','1','2','3','4','5','6','7','8','9','0','1','2','3','4','5','6','7','8','9'],$value);
    if(!preg_match('/^\\d{16}$/D',$value))return ['valid'=>false];
    $sum=0;
    foreach(str_split($value) as $i=>$digit){
      $num=(int)$digit;
      if($i%2===0){$num*=2;if($num>9)$num-=9;}
      $sum+=$num;
    }
    return ['valid'=>$sum%10===0,'normalized'=>$value];
  }
  private static function validateValue(array $field,$value): mixed {
    $type=$field['type']??'text';
    if(in_array($type,['file','image','calculated','description','divider','heading'],true))
      self::fail('این فیلد با درخواست متنی قابل ثبت نیست؛ مسیر امن اختصاصی لازم است');
    if($type==='repeater'){
      if($value===null||$value==='')$value='[]';
      if(!is_string($value)||strlen($value)>20000)
        self::fail('حجم اطلاعات تکرارشونده بیش از حد مجاز است');
      try{$rows=json_decode($value,true,32,JSON_THROW_ON_ERROR);}
      catch(JsonException $e){self::fail('ساختار اطلاعات تکرارشونده معتبر نیست');}
      $max=$field['max_rows']??12;
      $min=max((int)($field['min_rows']??0),!empty($field['required'])?1:0);
      if(!is_array($rows)||!array_is_list($rows)||count($rows)>$max||count($rows)<$min)
        self::fail('تعداد ردیف‌های اطلاعات تکرارشونده معتبر نیست');
      $columns=$field['columns']??[];
      if(!$columns||count($columns)>8)self::fail('تعریف ستون‌های تکرارشونده معتبر نیست');
      $lookup=[];
      foreach($columns as $column)$lookup[$column['key']]=$column;
      $normalized=[];
      foreach($rows as $row){
        if(!is_array($row)||array_is_list($row))self::fail('ردیف تکرارشونده معتبر نیست');
        foreach($row as $key=>$unused)if(!is_string($key)||!isset($lookup[$key]))
          self::fail('فیلد ناشناخته در ردیف تکرارشونده');
        $clean=[];
        foreach($columns as $column){
          $key=$column['key'];
          $entry=$row[$key]??null;
          if(!is_scalar($entry)&&$entry!==null)self::fail('نوع مقدار ردیف تکرارشونده معتبر نیست');
          if(!empty($column['required'])&&($entry===null||trim((string)$entry)===''))
            self::fail('تکمیل «'.$column['label'].'» در تمام ردیف‌ها الزامی است');
          $clean[$key]=self::validateValue($column,$entry);
        }
        $normalized[]=$clean;
      }
      $result=json_encode($normalized,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
      if(strlen($result)>20000)self::fail('حجم ردیف‌های تکرارشونده بیش از حد مجاز است');
      return $result;
    }
    if($value===null||$value==='')return null;
    // Legacy Android inputs serialize a multi-select as pipe-delimited options.
    // Accept the same format as a JSON list, without relaxing option validation.
    if($type==='multiselect'&&is_string($value)&&$value!==''){
      $value=explode('|',$value);
      if(count($value)>50)self::fail('تعداد گزینه‌های انتخاب‌شده بیش از حد مجاز است');
    }
    if(is_array($value)){
      if($type!=='multiselect')self::fail('این فیلد چندانتخابی نیست');
      $choices=$field['options']??[];
      if(count($value)!==count(array_unique($value)))self::fail('گزینه تکراری مجاز نیست');
      foreach($value as $one)if(!is_string($one)||!in_array($one,$choices,true)||str_contains($one,'|'))
        self::fail('گزینه نامعتبر است');
      return implode('|',$value);
    }
    if($type==='boolean'||$type==='checkbox') {
      if(!in_array($value,[true,false,1,0,'1','0'],true))self::fail('مقدار بله یا خیر نامعتبر است');
      return ($value===true||$value===1||$value==='1')?'1':'0';
    }
    if(!is_scalar($value))self::fail('نوع مقدار نامعتبر است');
    $value=trim((string)$value);
    if(mb_strlen($value)>5000)self::fail('مقدار ورودی بیش از حد طولانی است');
    if(isset($field['max_length'])&&mb_strlen($value)>(int)$field['max_length'])self::fail('طول مقدار از حد مجاز بیشتر است');
    if(isset($field['min_length'])&&mb_strlen($value)<(int)$field['min_length'])self::fail('مقدار کوتاه‌تر از حد مجاز است');
    if($type==='number'||$type==='calculated'){
      $normalized=str_replace(['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹','٠','١','٢','٣','٤','٥','٦','٧','٨','٩'],['0','1','2','3','4','5','6','7','8','9','0','1','2','3','4','5','6','7','8','9'],$value);
      if(!is_numeric($normalized))self::fail('مقدار عددی معتبر نیست');
      $num=(float)$normalized;
      if(isset($field['min'])&&$num<(float)$field['min'])self::fail('مقدار کمتر از حد مجاز است');
      if(isset($field['max'])&&$num>(float)$field['max'])self::fail('مقدار بیشتر از حد مجاز است');
      return $normalized;
    }
    if($type==='email'&&!filter_var($value,FILTER_VALIDATE_EMAIL))self::fail('نشانی ایمیل نامعتبر است');
    if($type==='mobile'){
      $v=str_replace(['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹','٠','١','٢','٣','٤','٥','٦','٧','٨','٩'],['0','1','2','3','4','5','6','7','8','9','0','1','2','3','4','5','6','7','8','9'],$value);
      if(!preg_match('/^09\\d{9}$/D',$v))self::fail('شماره همراه ایران نامعتبر است');
      return $v;
    }
    if($type==='phone'||$type==='time'){
      $normalized=str_replace(['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹','٠','١','٢','٣','٤','٥','٦','٧','٨','٩'],
        ['0','1','2','3','4','5','6','7','8','9','0','1','2','3','4','5','6','7','8','9'],$value);
      if($type==='phone'&&!preg_match('/^0[1-9][0-9]{9}$/D',$normalized))
        self::fail('تلفن ثابت با کد شهر باید ۱۱ رقم معتبر باشد');
      if($type==='time'&&!preg_match('/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/D',$normalized))
        self::fail('ساعت باید در قالب ۲۴ ساعته HH:MM باشد');
      return $normalized;
    }
    if($type==='date'){
      $date=str_replace(['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹','٠','١','٢','٣','٤','٥','٦','٧','٨','٩'],
        ['0','1','2','3','4','5','6','7','8','9','0','1','2','3','4','5','6','7','8','9'],$value);
      $date=str_replace('/','-',$date);
      if(!preg_match('/^(1[34]\\d{2})-(\\d{2})-(\\d{2})$/D',$date,$parts))
        self::fail('تاریخ شمسی نامعتبر است');
      $month=(int)$parts[2];$day=(int)$parts[3];
      if($month<1||$month>12||$day<1||$day>($month<=6?31:30))
        self::fail('روز یا ماه شمسی معتبر نیست');
      return $date;
    }
    if(in_array($type,['select','radio'],true)&&!in_array($value,$field['options']??[],true))
      self::fail('گزینه انتخابی معتبر نیست');
    if($type==='national_id'){
      require_once __DIR__.'/IdentityBankingValidation.php';
      $check=IdentityBankingValidation::nationalId($value);
      if(empty($check['valid']))self::fail('کد ملی از نظر ساختار نامعتبر است');
      return $check['normalized']??$value;
    }
    if($type==='iban'||$type==='account'||$type==='card'){
      require_once __DIR__.'/IdentityBankingValidation.php';
      $check=match($type){
        'iban'=>IdentityBankingValidation::iban($value),
        'account'=>IdentityBankingValidation::account($value),
        default=>self::checkCard($value)
      };
      if(empty($check['valid']))self::fail('اطلاعات بانکی از نظر ساختار معتبر نیست');
      return $check['normalized']??$value;
    }
    return $value;
  }
}
