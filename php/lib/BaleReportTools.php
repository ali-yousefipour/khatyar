<?php
/**
 * ابزارهای گزارش برای ربات بله.
 * مستقل از BaleBot نگه داشته شده تا بتوان آن را از Cron و Webhook نیز اجرا کرد.
 */
class BaleReportTools {
  private static function normalize($s) {
    return strtr((string)$s, ['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']);
  }

  public static function ensureTables() {
    try {
      Db::run("CREATE TABLE IF NOT EXISTS bale_last_report_cache (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        chat_id VARCHAR(120) NOT NULL UNIQUE,
        report_id BIGINT NULL,
        report_code VARCHAR(120) NULL,
        report_title VARCHAR(255) NULL,
        report_text LONGTEXT NULL,
        report_payload_json LONGTEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_bale_last_report_updated(updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Throwable $e) {}
  }

  private static function subscriber($chatId) {
    try { return Db::one("SELECT * FROM bale_subscribers WHERE chat_id=? AND is_active=1 ORDER BY id DESC LIMIT 1", [(string)$chatId]); }
    catch (Throwable $e) { return null; }
  }

  /**
   * آخرین گزارشی که به کاربر ارجاع/تحویل شده را با چند نام رایج جدول گردش گزارش پیدا می‌کند.
   * اگر نسخه دیتابیس یکی از ساختارهای قدیمی را داشته باشد، خطاها عمداً نادیده گرفته می‌شوند.
   */
  public static function findLatestForChat($chatId) {
    self::ensureTables();
    $sub = self::subscriber($chatId);
    if (!$sub) return null;
    $uid = (int)($sub['user_id'] ?? 0);
    $mobile = (string)($sub['mobile'] ?? '');
    $candidates = [
      ["SELECT r.* FROM report_receivers rr INNER JOIN reports r ON r.id=rr.report_id WHERE rr.user_id=? ORDER BY COALESCE(rr.created_at,r.created_at) DESC LIMIT 1", [$uid]],
      ["SELECT r.* FROM report_recipients rr INNER JOIN reports r ON r.id=rr.report_id WHERE rr.user_id=? ORDER BY COALESCE(rr.created_at,r.created_at) DESC LIMIT 1", [$uid]],
      ["SELECT r.* FROM report_references rr INNER JOIN reports r ON r.id=rr.report_id WHERE rr.user_id=? ORDER BY COALESCE(rr.created_at,r.created_at) DESC LIMIT 1", [$uid]],
      ["SELECT * FROM reports WHERE recipient_user_id=? ORDER BY created_at DESC LIMIT 1", [$uid]],
      ["SELECT * FROM reports WHERE referred_to_user_id=? ORDER BY created_at DESC LIMIT 1", [$uid]],
      ["SELECT * FROM reports WHERE user_id=? ORDER BY created_at DESC LIMIT 1", [$uid]],
      ["SELECT * FROM reports WHERE mobile=? ORDER BY created_at DESC LIMIT 1", [$mobile]],
    ];
    foreach ($candidates as $q) {
      if (!$uid && strpos($q[0], 'user_id') !== false) continue;
      try {
        $r = Db::one($q[0], $q[1]);
        if ($r) return self::normalizeReport($r);
      } catch (Throwable $e) {}
    }
    try {
      $cache = Db::one("SELECT * FROM bale_last_report_cache WHERE chat_id=? LIMIT 1", [(string)$chatId]);
      if ($cache) return self::normalizeReport($cache);
    } catch (Throwable $e) {}
    return null;
  }

  private static function normalizeReport($r) {
    $id = $r['id'] ?? $r['report_id'] ?? null;
    $code = $r['report_code'] ?? $r['code'] ?? $r['tracking_code'] ?? ('#'.$id);
    $title = $r['title'] ?? $r['subject'] ?? $r['report_title'] ?? 'گزارش';
    $text = $r['body'] ?? $r['description'] ?? $r['text'] ?? $r['content'] ?? $r['report_text'] ?? '';
    return ['id'=>$id,'code'=>$code,'title'=>$title,'text'=>$text,'row'=>$r];
  }

  public static function remember($chatId, $report) {
    self::ensureTables();
    if (!$chatId || !$report) return;
    try {
      Db::run("INSERT INTO bale_last_report_cache(chat_id,report_id,report_code,report_title,report_text,report_payload_json,created_at,updated_at)
        VALUES(?,?,?,?,?,?,NOW(),NOW())
        ON DUPLICATE KEY UPDATE report_id=VALUES(report_id),report_code=VALUES(report_code),report_title=VALUES(report_title),report_text=VALUES(report_text),report_payload_json=VALUES(report_payload_json),updated_at=NOW()",
        [(string)$chatId,$report['id']??null,$report['code']??null,$report['title']??null,$report['text']??'',json_encode($report['row']??$report,JSON_UNESCAPED_UNICODE)]);
    } catch (Throwable $e) {}
  }

  public static function text($chatId) {
    $r = self::findLatestForChat($chatId);
    if (!$r) return "گزارش دریافتی یا ارجاع‌شده‌ای برای شما پیدا نشد.";
    $parts = ['📄 آخرین گزارش دریافتی','کد گزارش: '.($r['code'] ?: '---'),'عنوان: '.($r['title'] ?: '---')];
    if (trim((string)$r['text']) !== '') $parts[] = "\n".trim((string)$r['text']);
    return implode("\n", $parts);
  }
}
