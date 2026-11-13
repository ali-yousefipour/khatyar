<?php
declare(strict_types=1);
// Public contact endpoint; intentionally independent of authenticated API.
ini_set('display_errors','0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
function respond(int $status,string $message):void { http_response_code($status);echo json_encode(['ok'=>$status===200,'message'=>$message],JSON_UNESCAPED_UNICODE);exit; }
if(($_SERVER['REQUEST_METHOD']??'')!=='POST')respond(405,'روش درخواست مجاز نیست.');
if((int)($_SERVER['CONTENT_LENGTH']??0)>16000)respond(413,'متن پیام بیش از حد مجاز است.');
$host=strtolower((string)($_SERVER['HTTP_HOST']??''));
$origin=(string)($_SERVER['HTTP_ORIGIN']??'');
$allowedOrigin='https://app.yousefipour.ir';
if($origin!==$allowedOrigin)respond(403,'درخواست از مبدأ نامعتبر است.');
$type=(string)($_SERVER['CONTENT_TYPE']??'');
if(stripos($type,'application/x-www-form-urlencoded')!==0)respond(415,'فرمت درخواست نامعتبر است.');
$name=trim((string)($_POST['name']??''));
$email=trim((string)($_POST['email']??''));
$phone=trim((string)($_POST['phone']??''));
$subject=trim((string)($_POST['subject']??''));
$message=trim((string)($_POST['message']??''));
$consent=(string)($_POST['consent']??'');
if(!empty($_POST['company_website']))respond(200,'پیام شما دریافت شد.');
$started=(int)($_POST['started_at']??0);
if($started<1 || time()-$started<3 || time()-$started>7200)respond(422,'لطفاً فرم را دوباره باز کنید و ارسال نمایید.');
if($consent!=='yes')respond(422,'برای ارسال باید با پردازش اطلاعات تماس موافقت کنید.');
if(mb_strlen($name)<3||mb_strlen($name)>100||mb_strlen($subject)<4||mb_strlen($subject)>150||mb_strlen($message)<15||mb_strlen($message)>5000)respond(422,'نام، موضوع یا متن پیام معتبر نیست.');
if(!filter_var($email,FILTER_VALIDATE_EMAIL)||strlen($email)>254||preg_match('/[\r\n]/',$email))respond(422,'نشانی ایمیل معتبر نیست.');
if($phone!=='' && !preg_match('/^[+۰-۹0-9٠-٩()\-\s]{7,24}$/u',$phone))respond(422,'شماره تماس معتبر نیست.');
// Atomic IP-based limiter: one submission per 60 seconds, no raw IP stored in filenames.
$ip=(string)($_SERVER['REMOTE_ADDR']??'unknown');
$dir=sys_get_temp_dir();
$rateFile=$dir.'/khatyar-contact-'.hash('sha256','contact-v1|'.$ip).'.lock';
$fh=@fopen($rateFile,'c+');
if(!$fh)respond(503,'سرویس تماس موقتاً در دسترس نیست.');
if(!flock($fh,LOCK_EX)){fclose($fh);respond(503,'لطفاً دوباره تلاش کنید.');}
$last=(int)trim((string)stream_get_contents($fh));
if($last>time()-60){flock($fh,LOCK_UN);fclose($fh);respond(429,'لطفاً یک دقیقه بعد پیام دیگری ارسال کنید.');}
ftruncate($fh,0);rewind($fh);fwrite($fh,(string)time());fflush($fh);flock($fh,LOCK_UN);fclose($fh);
$esc=static fn(string $value):string=>htmlspecialchars($value,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
$rows='';
foreach(['نام و نام خانوادگی'=>$name,'ایمیل'=>$email,'شماره تماس'=>$phone?:'ثبت نشده','موضوع'=>$subject] as $label=>$value){
  $rows.='<tr><th style="padding:13px;text-align:right;color:#49635b;background:#f3faf6;border-bottom:1px solid #dcece4;width:34%">'.$esc($label).'</th><td dir="auto" style="padding:13px;border-bottom:1px solid #dcece4">'.$esc($value).'</td></tr>';
}
$html='<!doctype html><html lang="fa" dir="rtl"><head><meta charset="UTF-8"></head><body style="margin:0;background:#edf5f0;font-family:Tahoma,Arial,sans-serif;color:#16372d;padding:32px 12px"><div style="max-width:640px;margin:auto;background:white;border-radius:22px;overflow:hidden;border:1px solid #dcece4"><div style="background:#075b4d;padding:28px;color:white"><h1 style="margin:0;font-size:24px">خطیار | پیام جدید از وب‌سایت</h1><p style="margin:10px 0 0;color:#d9f5e4">فرم ارتباط با ما</p></div><div style="padding:24px"><table style="border-collapse:collapse;width:100%;font-size:14px">'.$rows.'</table><h2 style="font-size:17px;color:#075b4d;margin-top:26px">متن پیام</h2><div style="padding:20px;background:#f6faf8;border-radius:14px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:2">'.nl2br($esc($message)).'</div><p style="color:#83968e;font-size:11px;margin-top:25px">ارسال‌شده از فرم عمومی خطیار • '.date('Y-m-d H:i').' (زمان سرور)</p></div></div></body></html>';
$subjectEncoded=function_exists('mb_encode_mimeheader')?mb_encode_mimeheader('خطیار | پیام تماس: '.$subject,'UTF-8','B',"\r\n"):'Khatyar website contact';
$headers=['MIME-Version: 1.0','Content-Type: text/html; charset=UTF-8','From: Khatyar Website <no-reply@app.yousefipour.ir>','Reply-To: '.$email,'X-Auto-Response-Suppress: All'];
$sent=@mail('ali.yousefipour@gmail.com',$subjectEncoded,$html,implode("\r\n",$headers));
if(!$sent){error_log('khatyar_contact_mail_unavailable');respond(503,'ارسال ایمیل در حال حاضر امکان‌پذیر نیست؛ لطفاً بعداً تلاش کنید.');}
respond(200,'پیام شما با موفقیت ارسال شد.');
