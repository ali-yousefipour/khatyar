<?php
/**
 * مدیریت بکاپ، بازیابی و پاکسازی دیتابیس.
 * چون هاست اشتراکی است و mysqldump همیشه در دسترس نیست، با PDO کار می‌کند.
 */
class Backup {

  // فهرست جداول دیتابیس
  static function tables() {
    $rows = Db::all("SHOW TABLES");
    $out = [];
    foreach ($rows as $r) { $out[] = array_values($r)[0]; }
    return $out;
  }

  /**
   * تولید بکاپ JSON ساختاریافته برای ایمپورت در نرم‌افزار ویندوزی (SQLite).
   * خروجی: { meta, tables: { name: { columns:[{name,type,...}], rows:[[...]] } } }
   * $skipImages: اگر true، ستون‌های تصویری base64 خالی می‌شوند.
   */
  static function streamJson($skipImages = false) {
    $pdo = Db::pdo();
    $tables = self::tables();
    $imgCols = ['attachment_data','photo_data','selfie','vehicles_photo','selfie_data','photo','html'];
    echo '{';
    echo '"meta":' . json_encode([
      'app' => 'taxi-system',
      'generated_at' => date('Y-m-d H:i:s'),
      'site_version' => defined('SITE_VERSION') ? SITE_VERSION : null,
      'light' => (bool)$skipImages,
    ], JSON_UNESCAPED_UNICODE);
    echo ',"tables":{';
    $firstT = true;
    foreach ($tables as $t) {
      // ستون‌ها و نوع‌ها
      $cols = [];
      try { foreach (Db::all("SHOW COLUMNS FROM `$t`") as $c) $cols[] = ['name'=>$c['Field'], 'type'=>$c['Type'], 'null'=>$c['Null'], 'key'=>$c['Key'], 'default'=>$c['Default']]; }
      catch (\Throwable $e) { continue; }
      if (!$cols) continue;
      if (!$firstT) echo ','; $firstT = false;
      echo json_encode($t, JSON_UNESCAPED_UNICODE) . ':{';
      echo '"columns":' . json_encode($cols, JSON_UNESCAPED_UNICODE);
      echo ',"rows":[';
      $colNames = array_column($cols, 'name');
      $st = $pdo->prepare("SELECT * FROM `$t`");
      $st->execute();
      $firstR = true;
      while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        $vals = [];
        foreach ($colNames as $k) {
          $v = $row[$k] ?? null;
          if ($v !== null && $skipImages && in_array($k, $imgCols, true) && strlen((string)$v) > 200) $v = null;
          $vals[] = $v;
        }
        if (!$firstR) echo ','; $firstR = false;
        echo json_encode($vals, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
      }
      echo ']}';
    }
    echo '}}';
  }

  /**
   * تولید فایل SQL بکاپ و نوشتن مستقیم در خروجی (stream) برای دانلود.
   * $skipImages: اگر true، ستون‌های تصویری (base64) خالی نوشته می‌شوند تا حجم کم بماند.
   */
  static function streamDump($skipImages = false) {
    $pdo = Db::pdo();
    $tables = self::tables();
    // ستون‌های سنگین تصویر که در حالت سبک نادیده گرفته می‌شوند
    $imgCols = ['attachment_data','photo_data','selfie','vehicles_photo','selfie_data','photo','html'];

    echo "-- Backup سامانهٔ تاکسیرانی\n";
    echo "-- تاریخ: " . date('Y-m-d H:i:s') . "\n";
    echo "SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n";

    foreach ($tables as $t) {
      // ساختار جدول
      $create = Db::one("SHOW CREATE TABLE `$t`");
      $createSql = $create['Create Table'] ?? ($create['Create View'] ?? null);
      if (!$createSql) continue;
      echo "DROP TABLE IF EXISTS `$t`;\n";
      echo $createSql . ";\n\n";

      // داده‌ها (به‌صورت دسته‌ای برای کاهش مصرف حافظه)
      $st = $pdo->prepare("SELECT * FROM `$t`");
      $st->execute();
      $colNames = null;
      while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
        if ($colNames === null) $colNames = array_keys($row);
        $vals = [];
        foreach ($row as $k => $v) {
          if ($v === null) { $vals[] = 'NULL'; continue; }
          // در حالت سبک، ستون‌های تصویری خالی می‌شوند
          if ($skipImages && in_array($k, $imgCols, true) && strlen((string)$v) > 200) { $vals[] = 'NULL'; continue; }
          $vals[] = $pdo->quote((string)$v);
        }
        $cols = '`' . implode('`,`', $colNames) . '`';
        echo "INSERT INTO `$t` ($cols) VALUES (" . implode(',', $vals) . ");\n";
      }
      echo "\n";
    }
    echo "SET FOREIGN_KEY_CHECKS=1;\n";
  }

  /**
   * بازیابی از محتوای SQL. کل فایل را اجرا می‌کند.
   * خروجی: تعداد دستورات اجراشده.
   */
  static function restoreFromSql($sql) {
    $pdo = Db::pdo();
    // تقسیم به دستورها با احترام به رشته‌ها
    $stmts = self::splitSql($sql);
    $pdo->exec("SET FOREIGN_KEY_CHECKS=0");
    $ok = 0; $errors = [];
    foreach ($stmts as $s) {
      $s = trim($s);
      if ($s === '' || strpos($s, '--') === 0) continue;
      try { $pdo->exec($s); $ok++; }
      catch (\Throwable $e) { if (count($errors) < 10) $errors[] = $e->getMessage(); }
    }
    $pdo->exec("SET FOREIGN_KEY_CHECKS=1");
    return ['executed' => $ok, 'errors' => $errors];
  }

  // تقسیم اسکریپت SQL به دستورهای جداگانه (با احترام به رشته‌های ' و ")
  static function splitSql($sql) {
    $out = []; $cur = ''; $n = strlen($sql); $i = 0; $inStr = null;
    while ($i < $n) {
      $ch = $sql[$i];
      if ($inStr) {
        $cur .= $ch;
        if ($ch === '\\') { if ($i+1 < $n) { $cur .= $sql[$i+1]; $i += 2; continue; } }
        elseif ($ch === $inStr) { $inStr = null; }
      } else {
        if ($ch === "'" || $ch === '"') { $inStr = $ch; $cur .= $ch; }
        elseif ($ch === ';') { $out[] = $cur; $cur = ''; }
        else { $cur .= $ch; }
      }
      $i++;
    }
    if (trim($cur) !== '') $out[] = $cur;
    return $out;
  }

  /**
   * پاکسازی انتخابی داده‌ها بر اساس نوع.
   * $kinds: آرایه‌ای از کلیدها. هر کلید مجموعه‌ای از جداول/ستون‌ها را پاک می‌کند.
   * خروجی: گزارش هر بخش.
   */
  static function purge(array $kinds) {
    $report = [];
    $del = function($table, $where = '1') use (&$report) {
      try { $n = Db::run("DELETE FROM `$table` WHERE $where")->rowCount(); $report[$table] = $n; }
      catch (\Throwable $e) { $report[$table] = 'خطا: ' . $e->getMessage(); }
    };
    foreach ($kinds as $k) {
      switch ($k) {
        case 'reports':        $del('report_routes'); $del('report_archives'); $del('reports'); break;
        case 'notices':        $del('notices'); break;
        case 'checklists':     $del('checklist_submissions'); break;
        case 'attendance':     $del('attendances'); $del('staff_attendance'); break;
        case 'presence':       $del('presence_checks'); break;
        case 'covert':         $del('covert_selfies'); break;
        case 'official_visits':$del('official_visits'); break;
        case 'messages':       $del('message_recipients'); $del('messages'); break;
        case 'outages':        $del('system_outages'); break;
        case 'requests':       $del('requests'); break;
        case 'sms_log':        $del('sms_log'); break;
        case 'locations':      $del('location_pings'); break;
        case 'forms':          $del('form_submissions'); break;
        // پاکسازی همهٔ تصاویر (خالی‌کردن ستون‌های تصویری بدون حذف رکورد)
        case 'all_images':
          foreach ([
            ['reports','attachment_data'],['reports','attachment_path'],
            ['notices','attachment_data'],['notices','attachment_path'],
            ['checklist_submissions','photo_data'],['checklist_submissions','photo_path'],
            ['official_visits','photo_data'],['official_visits','photo_path'],
            ['covert_selfies','photo_data'],['covert_selfies','photo_path'],
            ['presence_checks','selfie'],['presence_checks','selfie_path'],
            ['presence_checks','vehicles_photo'],['presence_checks','vehicles_photo_path'],
            ['messages','attachment_data'],['messages','attachment_path'],
          ] as [$tbl,$col]) {
            try { Db::run("UPDATE `$tbl` SET `$col`=NULL WHERE `$col` IS NOT NULL"); } catch (\Throwable $e) {}
          }
          $report['all_images'] = 'تصاویر خالی شد';
          break;
      }
    }
    return $report;
  }
}
