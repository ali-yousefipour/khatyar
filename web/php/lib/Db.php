<?php
class Db {
  private static $pdo = null;
  public static function pdo() {
    if (self::$pdo) return self::$pdo;
    $c = require __DIR__ . '/../config.php';
    $dsn = "mysql:host={$c['db_host']};dbname={$c['db_name']};charset=utf8mb4";
    self::$pdo = new PDO($dsn, $c['db_user'], $c['db_pass'], [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES => false,
      // نکتهٔ مهم: PDO::ATTR_PERSISTENT حذف شد.
      // روی هاست‌های اشتراکی (مشترک بودن PHP-FPM workers)، اتصال‌های persistent به‌ازای هر
      // worker ادامه‌دار می‌مانند حتی وقتی درخواستی در حال اجرا نیست؛ این باعث می‌شود سریعاً
      // محدودیت max_user_connections هاست (که معمولاً ۱۰-۳۰ است) پر شود و خطای SQLSTATE[HY000]
      // [1203] رخ دهد که دقیقاً در ۲۳ مورد در لاگ دیده می‌شود. با اتصال غیر-persistent،
      // هر اسکریپت در پایان اجرایش اتصال را می‌بندد و محدودیت رعایت می‌شود.
      PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci, time_zone = '+03:30'",
    ]);
    return self::$pdo;
  }
  // اجرای کوئری با پارامتر و بازگرداندن همهٔ ردیف‌ها
  public static function all($sql, $params = []) { $st = self::pdo()->prepare($sql); $st->execute($params); return $st->fetchAll(); }
  public static function one($sql, $params = []) { $st = self::pdo()->prepare($sql); $st->execute($params); $r = $st->fetch(); return $r === false ? null : $r; }
  public static function run($sql, $params = []) { $st = self::pdo()->prepare($sql); $st->execute($params); return $st; }
  public static function exec($sql, $params = []) { return self::run($sql, $params)->rowCount(); }
  public static function insert($sql, $params = []) { self::run($sql, $params); return (int) self::pdo()->lastInsertId(); }
}
