<?php
/**
 * Offline-only Iranian identity and banking structural validation.
 * Never asserts that a national ID was issued or a bank account exists.
 * No external requests or third-party dependencies.
 */
final class IdentityBankingValidation {
  private const BANKS = ['061'=>'بانک شهر','012'=>'بانک ملت','017'=>'بانک ملی ایران','019'=>'بانک صادرات ایران','020'=>'بانک توسعه صادرات','015'=>'بانک سپه','014'=>'بانک مسکن','018'=>'بانک تجارت','013'=>'بانک رفاه کارگران','016'=>'بانک کشاورزی','021'=>'پست بانک ایران','022'=>'بانک توسعه تعاون','054'=>'بانک پارسیان','055'=>'بانک اقتصاد نوین','056'=>'بانک سامان','057'=>'بانک پاسارگاد','058'=>'بانک سرمایه','059'=>'بانک سینا','060'=>'بانک قرض الحسنه مهر ایران','062'=>'بانک آینده','063'=>'بانک انصار','064'=>'بانک گردشگری','065'=>'بانک حکمت ایرانیان','066'=>'بانک دی','069'=>'بانک ایران زمین','070'=>'بانک رسالت'];
  public static function digits($v): string {
    return strtr(trim((string)$v),['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']);
  }
  private static function result(string $field,bool $valid,string $status,array $errors=[],array $warnings=[],array $more=[]): array {
    return array_merge(['field'=>$field,'valid'=>$valid,'status'=>$status,'errors'=>$errors,'warnings'=>$warnings,'verificationLevel'=>'offline_structural'],$more);
  }
  public static function nationalId($raw): array {
    $s=self::digits($raw);
    if($s==='')return self::result('national_code',false,'missing_information',['کد ملی وارد نشده است.']);
    if(!preg_match('/^[0-9]{10}$/D',$s))return self::result('national_code',false,'invalid',['کد ملی باید ۱۰ رقم باشد.']);
    if(preg_match('/^(\\d)\\1{9}$/D',$s))return self::result('national_code',false,'invalid',['کد ملی واردشده از نظر رقم کنترل معتبر نیست.']);
    $sum=0;for($i=0;$i<9;$i++)$sum+=(int)$s[$i]*(10-$i);
    $r=$sum%11;$check=$r<2?$r:11-$r;
    if($check!==(int)$s[9])return self::result('national_code',false,'invalid',['کد ملی واردشده از نظر رقم کنترل معتبر نیست.']);
    return self::result('national_code',true,'structurally_valid',[],['ساختار کد ملی معتبر است؛ هویت صاحب آن به‌صورت آفلاین قابل تأیید نیست.']);
  }
  public static function iban($raw,?string $expectedBank=null,bool $allowWithoutPrefix=false): array {
    $s=strtoupper(preg_replace('/[ \\t\\r\\n\\x{200C}\\x{00A0}-]/u','',self::digits($raw)));
    if($s==='')return self::result('iban',false,'missing_information',['شماره شبا وارد نشده است.']);
    if($allowWithoutPrefix&&preg_match('/^[0-9]{24}$/D',$s))$s='IR'.$s;
    if(!preg_match('/^IR[0-9]{24}$/D',$s))return self::result('iban',false,'invalid',['شماره شبا باید با IR شروع شده و ۲۶ کاراکتر داشته باشد.']);
    $digits=substr($s,4).'1827'.substr($s,2,2);$remainder=0;
    for($i=0,$n=strlen($digits);$i<$n;$i++)$remainder=($remainder*10+(int)$digits[$i])%97;
    if($remainder!==1)return self::result('iban',false,'invalid',['رقم کنترل شماره شبا معتبر نیست.']);
    $bank=substr($s,4,3);$name=self::BANKS[$bank]??null;
    $extra=['bankCode'=>$bank,'bankName'=>$name,'normalized'=>$s];
    if($expectedBank!==null && $bank!==$expectedBank)return self::result('iban',false,'mismatch',['کد بانک داخل شبا با بانک انتخاب‌شده مطابقت ندارد.'],[],$extra);
    return self::result('iban',true,$name?'structurally_valid':'offline_unverifiable',[],array_values(array_filter([
      $name?null:'شناسه بانک در فهرست محلی موجود نیست؛ نیازمند بررسی دستی است.',
      'ساختار شبا معتبر است؛ مالکیت و فعال‌بودن حساب به‌صورت آفلاین تأیید نمی‌شود.'
    ])),$extra);
  }
  public static function account($raw): array {
    $s=self::digits($raw);
    if($s==='')return self::result('account',false,'missing_information',['شماره حساب ثبت نشده است.']);
    if(!preg_match('/^[0-9][0-9 .-]*[0-9]$/D',$s) && !preg_match('/^[0-9]$/D',$s))
      return self::result('account',false,'invalid',['شماره حساب شامل نویسه غیرمجاز است.']);
    return self::result('account',true,'offline_unverifiable',[],['تبدیل و تطبیق شماره حساب داخلی با شبا بدون الگوریتم رسمی بانک قابل تأیید نیست.'],['normalized'=>preg_replace('/[ .-]/','',$s)]);
  }
  /** Masked duplicate review is the caller's responsibility; include inactive users. */
  public static function duplicateNationalIds(array $users): array {
    $index=[];$result=[];
    foreach($users as $user){
      $id=self::digits($user['national_code']??'');
      if(!self::nationalId($id)['valid'])continue;
      $index[$id][]=(int)$user['id'];
    }
    foreach($index as $ids)if(count(array_unique($ids))>1)
      foreach($ids as $id)$result[$id]='این کد ملی قبلاً برای کاربر دیگری ثبت شده است.';
    return $result;
  }
}
