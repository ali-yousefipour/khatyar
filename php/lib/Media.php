<?php
/**
 * مدیریت ذخیرهٔ فیزیکی تصاویر روی هاست (به‌جای base64 در دیتابیس).
 * - دریافت base64 یا فایل آپلودی، فشرده‌سازی، ذخیره در public/uploads/{type}/
 * - بازگرداندن مسیر نسبی برای ذخیره در ستون *_path
 * - سرو امن تصویر از طریق مسیر نسبی
 *
 * اگر افزونهٔ GD نباشد، تصویر بدون فشرده‌سازی ذخیره می‌شود (بدون خطا).
 */
class Media {
  const MAX_IMAGE_BYTES = 12582912; // 12MB ورودی؛ خروجی همیشه JPEG فشرده است

  /** تنظیمات سراسری تصویر از پنل سایت. مقادیر صریح فقط سقف محلی هستند. */
  static function configured($maxW = 1280, $quality = 70) {
    try {
      if (class_exists('Db')) {
        $rq = Db::one("SELECT value FROM app_settings WHERE `key`='image_quality'");
        $rw = Db::one("SELECT value FROM app_settings WHERE `key`='image_max_width'");
        $q = $rq ? json_decode($rq['value'], true) : null;
        $w = $rw ? json_decode($rw['value'], true) : null;
        if (is_numeric($q)) $quality = (int)$q;
        if (is_numeric($w)) $maxW = (int)$w;
      }
    } catch (\Throwable $e) {}
    return [max(240, min(4096, (int)$maxW)), max(10, min(95, (int)$quality))];
  }
  static function configuredHeight($default = 1920) {
    try {
      if (class_exists('Db')) {
        $r=Db::one("SELECT value FROM app_settings WHERE `key`='image_max_height'");
        $v=$r?json_decode($r['value'],true):null;
        if(is_numeric($v))$default=(int)$v;
      }
    } catch (\Throwable $e) {}
    return max(240,min(4096,(int)$default));
  }

  static function assertSafeType($raw) {
    if (!is_string($raw) || strlen($raw) < 32 || strlen($raw) > self::MAX_IMAGE_BYTES) return false;
    $ext = self::extFromBytes($raw);
    if (!in_array($ext, ['jpg','png','webp','gif'], true)) return false;
    if (function_exists('getimagesizefromstring') && @getimagesizefromstring($raw) === false) return false;
    return true;
  }
  // ریشهٔ ذخیرهٔ فایل‌ها: کنار همین پوشه، داخل public/uploads
  static function baseDir() {
    $d = __DIR__ . '/../public/uploads';
    if (!is_dir($d)) @mkdir($d, 0755, true);
    return $d;
  }

  /**
   * ذخیرهٔ یک تصویر base64 (data URI یا رشتهٔ خام base64) به‌صورت فایل فیزیکی.
   * $type: زیرپوشه (مثل reports, notices, checklists, visits, selfies, covert, users)
   * $maxW: حداکثر عرض برای فشرده‌سازی (px). 0 = بدون تغییر اندازه
   * $quality: کیفیت JPEG (0..100)
   * خروجی: مسیر نسبی مثل "uploads/reports/2026/06/abc123.jpg" یا null در صورت خطا
   */
  static function saveBase64($b64, $type, $maxW = 1280, $quality = 70) {
    [$maxW, $quality] = self::configured($maxW, $quality);
    if (!$b64 || !is_string($b64)) return null;
    // جدا کردن هدر data URI
    $data = $b64;
    if (strpos($b64, 'base64,') !== false) {
      $data = substr($b64, strpos($b64, 'base64,') + 7);
    }
    $raw = base64_decode($data, true);
    if ($raw === false || !self::assertSafeType($raw)) return null;

    // مسیر بر اساس سال/ماه برای جلوگیری از انباشت در یک پوشه
    $sub = $type . '/' . date('Y') . '/' . date('m');
    $dir = self::baseDir() . '/' . $sub;
    if (!is_dir($dir)) @mkdir($dir, 0755, true);

    $name = bin2hex(random_bytes(12));
    $relBase = 'uploads/' . $sub . '/' . $name;

    // تلاش برای فشرده‌سازی با GD
    if (function_exists('imagecreatefromstring')) {
      $img = @imagecreatefromstring($raw);
      if ($img !== false) {
        $w = imagesx($img); $h = imagesy($img);
        $maxH = self::configuredHeight(1920);
        $scale = min($maxW>0?$maxW/$w:1, $maxH>0?$maxH/$h:1, 1);
        if ($scale < 1) {
          $nw = max(1,(int)round($w*$scale)); $nh = max(1,(int)round($h*$scale));
          $resized = imagecreatetruecolor($nw, $nh);
          // پس‌زمینهٔ سفید برای تصاویر شفاف
          $white = imagecolorallocate($resized, 255, 255, 255);
          imagefilledrectangle($resized, 0, 0, $nw, $nh, $white);
          imagecopyresampled($resized, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
          imagedestroy($img); $img = $resized;
        }
        $full = self::baseDir() . '/' . $sub . '/' . $name . '.jpg';
        imagejpeg($img, $full, max(10, min(95, (int)$quality)));
        imagedestroy($img);
        if (is_file($full)) return $relBase . '.jpg';
      }
    }

    // الزام خروجی JPG: بدون GD فقط ورودی JPEG قابل ذخیره است.
    if (self::extFromBytes($raw) !== 'jpg') return null;
    $full = self::baseDir() . '/' . $sub . '/' . $name . '.jpg';
    if (@file_put_contents($full, $raw) !== false) return $relBase . '.jpg';
    return null;
  }

  // تشخیص پسوند از بایت‌های ابتدایی
  static function extFromBytes($raw) {
    $sig = substr($raw, 0, 4);
    if (strpos($raw, "\xFF\xD8\xFF") === 0) return 'jpg';
    if (substr($raw, 0, 8) === "\x89PNG\r\n\x1a\n") return 'png';
    if (substr($raw, 0, 4) === 'RIFF' && substr($raw, 8, 4) === 'WEBP') return 'webp';
    if (substr($raw, 0, 3) === 'GIF') return 'gif';
    return 'jpg';
  }

  // مسیر کامل فایل از مسیر نسبی
  static function fullPath($rel) {
    if (!$rel) return null;
    $rel = ltrim($rel, '/');
    // فقط داخل uploads مجاز است (جلوگیری از path traversal)
    if (strpos($rel, '..') !== false) return null;
    if (strpos($rel, 'uploads/') !== 0) return null;
    return __DIR__ . '/../public/' . $rel;
  }

  // حذف فایل فیزیکی
  static function delete($rel) {
    $f = self::fullPath($rel);
    if ($f && is_file($f)) @unlink($f);
  }

  /**
   * ذخیرهٔ فایل آپلودشده (از $_FILES) — بدون تبدیل base64.
   * برای آپلود مستقیم از موبایل (multipart/form-data).
   * @param array $file  یک عنصر از $_FILES
   * @param string $type  نوع (notices, reports, ...)
   * @param int $maxW     حداکثر عرض (برای فشرده‌سازی با GD)
   * @param int $quality  کیفیت JPEG
   */
  static function saveUploadedFile($file, $type, $maxW = 1280, $quality = 80) {
    [$maxW, $quality] = self::configured($maxW, $quality);
    if (!$file || ($file['error'] ?? 1) !== 0 || empty($file['tmp_name'])) return null;
    $raw = @file_get_contents($file['tmp_name']);
    if ($raw === false || !self::assertSafeType($raw)) return null;

    // مسیر بر اساس سال/ماه
    $sub = $type . '/' . date('Y') . '/' . date('m');
    $dir = self::baseDir() . '/' . $sub;
    if (!is_dir($dir)) @mkdir($dir, 0755, true);

    $name = bin2hex(random_bytes(12));
    $relBase = 'uploads/' . $sub . '/' . $name;

    // فشرده‌سازی با GD
    if (function_exists('imagecreatefromstring')) {
      $img = @imagecreatefromstring($raw);
      if ($img !== false) {
        $w = imagesx($img); $h = imagesy($img);
        $maxH = self::configuredHeight(1920);
        $scale = min($maxW>0?$maxW/$w:1, $maxH>0?$maxH/$h:1, 1);
        if ($scale < 1) {
          $nw = max(1,(int)round($w*$scale)); $nh = max(1,(int)round($h*$scale));
          $resized = imagecreatetruecolor($nw, $nh);
          $white = imagecolorallocate($resized, 255, 255, 255);
          imagefilledrectangle($resized, 0, 0, $nw, $nh, $white);
          imagecopyresampled($resized, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
          imagedestroy($img); $img = $resized;
        }
        $full = self::baseDir() . '/' . $sub . '/' . $name . '.jpg';
        imagejpeg($img, $full, max(10, min(95, (int)$quality)));
        imagedestroy($img);
        if (is_file($full)) return $relBase . '.jpg';
      }
    }

    // الزام خروجی JPG: بدون GD فقط ورودی JPEG قابل ذخیره است.
    if (self::extFromBytes($raw) !== 'jpg') return null;
    $full = self::baseDir() . '/' . $sub . '/' . $name . '.jpg';
    if (@file_put_contents($full, $raw) !== false) return $relBase . '.jpg';
    return null;
  }

  /** ساخت بندانگشتی JPG از تصویر ذخیره‌شده با تنظیمات پنل. */
  static function makeThumbnail($rel, $type = 'thumbs') {
    $src = self::fullPath($rel);
    if (!$src || !is_file($src) || !function_exists('imagecreatefromstring')) return null;
    try {
      $raw = @file_get_contents($src); if ($raw === false) return null;
      $img = @imagecreatefromstring($raw); if ($img === false) return null;
      $size = 320; $quality = 70;
      try {
        if (class_exists('Db')) {
          $rs=Db::one("SELECT value FROM app_settings WHERE `key`='thumbnail_size'");
          $rq=Db::one("SELECT value FROM app_settings WHERE `key`='thumbnail_quality'");
          $sv=$rs?json_decode($rs['value'],true):null; $qv=$rq?json_decode($rq['value'],true):null;
          if(is_numeric($sv))$size=max(120,min(800,(int)$sv));
          if(is_numeric($qv))$quality=max(30,min(90,(int)$qv));
        }
      } catch (\Throwable $e) {}
      $w=imagesx($img); $h=imagesy($img); if($w<1||$h<1){imagedestroy($img);return null;}
      $scale=min($size/$w,$size/$h,1); $nw=max(1,(int)round($w*$scale)); $nh=max(1,(int)round($h*$scale));
      $canvas=imagecreatetruecolor($nw,$nh); $white=imagecolorallocate($canvas,255,255,255); imagefilledrectangle($canvas,0,0,$nw,$nh,$white);
      imagecopyresampled($canvas,$img,0,0,0,0,$nw,$nh,$w,$h); imagedestroy($img);
      $sub=$type.'/'.date('Y').'/'.date('m'); $dir=self::baseDir().'/'.$sub; if(!is_dir($dir))@mkdir($dir,0755,true);
      $name=bin2hex(random_bytes(12)).'_thumb.jpg'; $full=$dir.'/'.$name;
      imagejpeg($canvas,$full,$quality); imagedestroy($canvas);
      return is_file($full)?'uploads/'.$sub.'/'.$name:null;
    } catch (\Throwable $e) { return null; }
  }

  /**
   * سرو امن تصویر: مسیر نسبی را گرفته، فایل را با هدر مناسب برمی‌گرداند.
   * برای استفاده در endpoint سرو تصویر.
   */
  static function serve($rel) {
    $f = self::fullPath($rel);
    if (!$f || !is_file($f)) { http_response_code(404); echo 'not found'; exit; }
    $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));
    $mime = ['jpg'=>'image/jpeg','jpeg'=>'image/jpeg','png'=>'image/png','webp'=>'image/webp','gif'=>'image/gif','pdf'=>'application/pdf'][$ext] ?? 'application/octet-stream';
    header('X-Content-Type-Options: nosniff');
    header('Content-Disposition: inline; filename="file.' . $ext . '"');
    header('Content-Type: ' . $mime);
    header('Cache-Control: private, max-age=86400');
    header('Content-Length: ' . filesize($f));
    readfile($f);
    exit;
  }
}
