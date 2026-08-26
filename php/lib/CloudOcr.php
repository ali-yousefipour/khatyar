<?php
class CloudOcr {
  private static function setting($key, $default=null) {
    try { $r=Db::one("SELECT value FROM app_settings WHERE `key`=?",[$key]); if($r){$v=json_decode($r['value'],true); return $v===null?$default:$v;} } catch(Throwable $e) {}
    return $default;
  }
  public static function config() {
    return [
      'enabled'=>(bool)self::setting('cloud_ocr_enabled',false),
      'provider'=>(string)self::setting('cloud_ocr_provider','generic_json'),
      'api_key'=>(string)self::setting('cloud_ocr_api_key',''),
      'endpoint'=>(string)self::setting('cloud_ocr_endpoint',''),
      'connect_timeout'=>max(2,min(30,(int)self::setting('cloud_ocr_connect_timeout',8))),
      'timeout'=>max(5,min(60,(int)self::setting('cloud_ocr_timeout',20))),
    ];
  }
  private static function decodeImage($value) {
    $value=trim((string)$value);
    if(strpos($value,'data:')===0){$pos=strpos($value,','); if($pos!==false)$value=substr($value,$pos+1);}
    $bin=base64_decode($value,true);
    if($bin===false || strlen($bin)<32) throw new RuntimeException('تصویر Base64 معتبر نیست');
    if(strlen($bin)>8*1024*1024) throw new RuntimeException('حجم تصویر بیشتر از ۸ مگابایت است');
    $fi=new finfo(FILEINFO_MIME_TYPE); $mime=$fi->buffer($bin);
    if(!in_array($mime,['image/jpeg','image/png','image/webp'],true)) throw new RuntimeException('فقط JPG، PNG و WEBP مجاز است');
    return [$bin,$mime];
  }
  public static function recognize($imageBase64,$kind='plate') {
    if(!function_exists('curl_init')) throw new RuntimeException('افزونه cURL روی سرور فعال نیست');
    $c=self::config(); if(empty($c['enabled'])) throw new RuntimeException('OCR ابری غیرفعال است');
    [$bin,$mime]=self::decodeImage($imageBase64);
    $provider=$c['provider']; $headers=['Content-Type: application/json; charset=utf-8'];
    if($provider==='google_vision'){
      if($c['api_key']==='') throw new RuntimeException('کلید Google Vision تنظیم نشده است');
      $endpoint=$c['endpoint']?:'https://vision.googleapis.com/v1/images:annotate';
      $url=$endpoint.(strpos($endpoint,'?')===false?'?':'&').'key='.rawurlencode($c['api_key']);
      $payload=['requests'=>[['image'=>['content'=>base64_encode($bin)],'features'=>[['type'=>'TEXT_DETECTION','maxResults'=>10]],'imageContext'=>['languageHints'=>['fa','en']]]]];
    } else {
      $url=$c['endpoint']; if($url==='') throw new RuntimeException('آدرس API عمومی تنظیم نشده است');
      if($c['api_key']!=='') $headers[]='Authorization: Bearer '.$c['api_key'];
      $payload=['image_base64'=>base64_encode($bin),'mime_type'=>$mime,'kind'=>$kind,'language'=>'fa'];
    }
    $ch=curl_init($url); curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_POST=>true,CURLOPT_HTTPHEADER=>$headers,CURLOPT_POSTFIELDS=>json_encode($payload,JSON_UNESCAPED_UNICODE),CURLOPT_CONNECTTIMEOUT=>$c['connect_timeout'],CURLOPT_TIMEOUT=>$c['timeout'],CURLOPT_FOLLOWLOCATION=>false,CURLOPT_MAXREDIRS=>0]);
    $raw=curl_exec($ch); $err=curl_error($ch); $code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE); curl_close($ch);
    if($raw===false) throw new RuntimeException('خطای اتصال OCR: '.($err?:'curl_error'));
    $json=json_decode($raw,true); if(!is_array($json)) throw new RuntimeException('پاسخ OCR معتبر نیست');
    if($code<200||$code>=300){$msg=$json['error']['message']??$json['message']??('HTTP '.$code); throw new RuntimeException('خطای سرویس OCR: '.$msg);}
    $text='';
    if($provider==='google_vision') $text=(string)($json['responses'][0]['fullTextAnnotation']['text']??$json['responses'][0]['textAnnotations'][0]['description']??'');
    else $text=(string)($json['text']??$json['result']['text']??$json['data']['text']??'');
    return ['ok'=>true,'provider'=>$provider,'text'=>$text,'kind'=>$kind,'http_code'=>$code];
  }
}
