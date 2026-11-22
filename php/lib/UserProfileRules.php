<?php
/**
 * Safe, deterministic conditional logic for versioned personnel forms.
 * Pure evaluation: never execute user-authored PHP/JS, SQL or regular expressions.
 */
final class UserProfileRules {
  public const OPERATORS=['eq','neq','gt','gte','lt','lte','contains','not_contains',
    'empty','not_empty','in','not_in','true','false','date_between','date_outside'];
  public const ACTIONS=['show','hide','enable','disable','require','optional','readonly','editable'];
  public const FIELD_TYPES=['text','textarea','number','mobile','phone','email','date','time','select',
    'multiselect','radio','checkbox','boolean','national_id','iban','account','card',
    'image','file','address','calculated','description','divider','heading'];
  private const VALUE_FREE=['empty','not_empty','true','false'];
  private const NUMERIC=['gt','gte','lt','lte'];
  private const DATES=['date_between','date_outside'];
  private static function asciiDigits(string $value): string {
    return str_replace(['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹','٠','١','٢','٣','٤','٥','٦','٧','٨','٩'],
      ['0','1','2','3','4','5','6','7','8','9','0','1','2','3','4','5','6','7','8','9'],$value);
  }
  private static function number($value): ?float {
    if(!is_scalar($value)||is_bool($value))return null;
    $text=self::asciiDigits(trim((string)$value));
    if(!preg_match('/^-?\d+(?:\.\d+)?$/D',$text))return null;
    $number=(float)$text;
    return is_finite($number)?$number:null;
  }
  private static function jalali($value): ?string {
    if(!is_string($value))return null;
    $text=str_replace('/','-',self::asciiDigits($value));
    if(!preg_match('/^(1[34]\d{2})-(\d{2})-(\d{2})$/D',$text,$m))return null;
    $month=(int)$m[2];$day=(int)$m[3];
    if($month<1||$month>12||$day<1||$day>($month<=6?31:30))return null;
    return $text;
  }

  private static function fail(string $msg): never {throw new InvalidArgumentException($msg);}
  private static function fieldKey($value): string {
    if(!is_string($value)||!preg_match('/^[a-z][a-z0-9_]{0,63}$/D',$value))
      self::fail('شناسه فیلد باید ثابت و فقط شامل حروف لاتین کوچک، اعداد و زیرخط باشد');
    return $value;
  }
  public static function dependencies(array $rule): array {
    if(array_key_exists('all',$rule)&&array_key_exists('any',$rule))
      self::fail('ترکیب هم‌زمان AND و OR در یک گروه مجاز نیست');
    if(isset($rule['all'])||isset($rule['any'])){
      $key=isset($rule['all'])?'all':'any';
      if(!is_array($rule[$key])||!array_is_list($rule[$key])||count($rule[$key])===0)self::fail('گروه شرطی خالی است');
      $deps=[];
      foreach($rule[$key] as $part){if(!is_array($part))self::fail('شرط نامعتبر است');$deps=array_merge($deps,self::dependencies($part));}
      return array_values(array_unique($deps));
    }
    $field=self::fieldKey($rule['field']??null);
    if(!in_array($rule['op']??null,self::OPERATORS,true))self::fail('عملگر شرطی معتبر نیست');
    if(!in_array($rule['op'],self::VALUE_FREE,true)&&!array_key_exists('value',$rule))self::fail('مقدار شرط تعیین نشده است');
    if(in_array($rule['op'],['in','not_in','date_between','date_outside'],true)&&(!is_array($rule['value'])||!array_is_list($rule['value'])||!count($rule['value'])))self::fail('مقادیر شرط باید فهرست باشند');
    if(in_array($rule['op'],self::DATES,true)&&count($rule['value'])!==2)self::fail('محدوده تاریخ باید دو مقدار داشته باشد');
    return [$field];
  }
  public static function validate(array $schema): void {
    if(!isset($schema['sections'])||!is_array($schema['sections'])||!array_is_list($schema['sections']))self::fail('گروه‌های فرم نامعتبرند');
    if(count($schema['sections'])>64)self::fail('تعداد گروه‌های فرم بیش از حد مجاز است');
    $fields=[];$deps=[];$sectionKeys=[];
    foreach($schema['sections'] as $section){
      if(!is_array($section)||empty($section['key']))self::fail('گروه فاقد شناسه است');
      $sectionKey=self::fieldKey($section['key']);
      if(isset($sectionKeys[$sectionKey]))self::fail('شناسه گروه تکراری است: '.$sectionKey);
      $sectionKeys[$sectionKey]=true;
      if(!isset($section['fields'])||!is_array($section['fields'])||!array_is_list($section['fields']))self::fail('فیلدهای گروه نامعتبرند');
      foreach($section['fields'] as $field){
        if(!is_array($field))self::fail('تعریف فیلد نامعتبر است');
        $key=self::fieldKey($field['key']??null);
        if(isset($fields[$key]))self::fail('شناسه فیلد تکراری است: '.$key);
        if(count($fields)>=400)self::fail('تعداد فیلدهای فرم بیش از حد مجاز است');
        if(!in_array($field['type']??null,self::FIELD_TYPES,true))self::fail('نوع فیلد پشتیبانی نمی‌شود');
        if(isset($field['binding'])&&!in_array($field['binding'],['system','custom','display'],true))self::fail('نوع ذخیره‌سازی نامعتبر است');
        if(isset($field['options'])){
          $choices=$field['options'];
          if(!is_array($choices)||!array_is_list($choices)||count($choices)>100)
            self::fail('گزینه‌های فیلد باید فهرست معتبر باشند');
          $unique=[];
          foreach($choices as $choice){
            if(!is_string($choice)||$choice===''||mb_strlen($choice)>200||str_contains($choice,'|')||isset($unique[$choice]))
              self::fail('گزینه فیلد خالی، تکراری یا نامعتبر است');
            $unique[$choice]=true;
          }
        }
        if(in_array($field['type'],['select','radio','multiselect'],true)&&empty($field['options']))
          self::fail('برای این نوع فیلد حداقل یک گزینه معتبر لازم است');
        $fields[$key]=$field;
      }
    }
    foreach($fields as $key=>$field){
      $deps[$key]=[];
      if(!is_array($field['rules']??[])||count($field['rules']??[])>32)
        self::fail('تعداد قوانین فیلد بیش از حد مجاز است');
      foreach($field['rules']??[] as $rule){
        if(!is_array($rule)||!in_array($rule['action']??null,self::ACTIONS,true)||!isset($rule['when'])||!is_array($rule['when']))self::fail('قانون فیلد نامعتبر است');
        foreach(self::dependencies($rule['when']) as $dep){
          if(!isset($fields[$dep]))self::fail('قانون به فیلد موجود ارجاع نمی‌دهد: '.$dep);
          if($dep===$key)self::fail('فیلد نمی‌تواند به خودش وابسته باشد');
          $op=self::operatorsIn($rule['when'],$dep);
          foreach($op as $operator){
            $type=$fields[$dep]['type'];
            if(in_array($operator,self::NUMERIC,true)&&!in_array($type,['number','calculated'],true))self::fail('عملگر عددی برای فیلد غیرعددی');
            if(in_array($operator,self::DATES,true)&&$type!=='date')self::fail('عملگر تاریخ برای فیلد غیراز تاریخ');
          }
          $deps[$key][]=$dep;
        }
      }
    }
    $seen=[];$visiting=[];
    $visit=function($key)use(&$visit,&$seen,&$visiting,$deps){
      if(isset($visiting[$key]))self::fail('وابستگی حلقوی میان فیلدها مجاز نیست');
      if(isset($seen[$key]))return;
      $visiting[$key]=true;
      foreach($deps[$key] as $dep)$visit($dep);
      unset($visiting[$key]);$seen[$key]=true;
    };
    foreach(array_keys($fields) as $key)$visit($key);
  }
  private static function operatorsIn(array $r,string $key): array {
    if(isset($r['all'])||isset($r['any'])){
      $k=isset($r['all'])?'all':'any';$ops=[];
      foreach($r[$k] as $part)$ops=array_merge($ops,self::operatorsIn($part,$key));
      return $ops;
    }
    return ($r['field']??'')===$key?[$r['op']]:[];
  }
  public static function matches(array $rule,array $values): bool {
    if(isset($rule['all'])){foreach($rule['all'] as $r)if(!self::matches($r,$values))return false;return true;}
    if(isset($rule['any'])){foreach($rule['any'] as $r)if(self::matches($r,$values))return true;return false;}
    $actual=$values[$rule['field']]??null;
    $desired=$rule['value']??null;
    $empty=$actual===null||$actual===''||(is_array($actual)&&count($actual)===0);
    switch($rule['op']){
      case 'empty':return $empty;
      case 'not_empty':return !$empty;
      case 'true':return $actual===true||$actual===1||$actual==='1';
      case 'false':return $actual===false||$actual===0||$actual==='0'||$empty;
      case 'eq':return !$empty&&(string)$actual===(string)$desired;
      case 'neq':return $empty||(string)$actual!==(string)$desired;
      case 'in':
      case 'not_in':
        $options=array_map('strval',$desired);
        // Existing custom_field_values store multi-select answers as "a|b".
        // Parse them only for set-membership operators, preserving ordinary text semantics.
        $selected=is_array($actual)?array_map('strval',$actual):
          ($empty?[]:explode('|',(string)$actual));
        $match=count(array_intersect($selected,$options))>0;
        return $rule['op']==='in'?$match:!$match;
      case 'contains':return is_array($actual)?in_array($desired,$actual,true):is_scalar($actual)&&str_contains((string)$actual,(string)$desired);
      case 'not_contains':return is_array($actual)?!in_array($desired,$actual,true):!is_scalar($actual)||!str_contains((string)$actual,(string)$desired);
      case 'gt':case 'gte':case 'lt':case 'lte':
        $a=self::number($actual);$b=self::number($desired);
        if($a===null||$b===null)return false;
        return match($rule['op']){'gt'=>$a>$b,'gte'=>$a>=$b,'lt'=>$a<$b,default=>$a<=$b};
      case 'date_between':case 'date_outside':
        $a=self::jalali($actual);$lo=self::jalali($desired[0]??null);$hi=self::jalali($desired[1]??null);
        if($a===null||$lo===null||$hi===null||$lo>$hi)return false;
        $inside=$a>=$lo&&$a<=$hi;return $rule['op']==='date_between'?$inside:!$inside;
    }
    return false;
  }
  /** Unmatched rules leave field defaults unchanged. Never erase hidden values here. */
  public static function state(array $field,array $values): array {
    $result=['visible'=>($field['visible']??true)!==false,'enabled'=>($field['enabled']??true)!==false,
      'required'=>!empty($field['required']),'readonly'=>!empty($field['readonly'])];
    foreach($field['rules']??[] as $rule){
      if(!self::matches($rule['when'],$values))continue;
      switch($rule['action']){
        case 'show':$result['visible']=true;break;case 'hide':$result['visible']=false;break;
        case 'enable':$result['enabled']=true;break;case 'disable':$result['enabled']=false;break;
        case 'require':$result['required']=true;break;case 'optional':$result['required']=false;break;
        case 'readonly':$result['readonly']=true;break;case 'editable':$result['readonly']=false;break;
      }
    }
    if(!$result['visible']||!$result['enabled']||$result['readonly'])$result['required']=false;
    return $result;
  }
}
