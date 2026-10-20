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
      PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci, time_zone = '+03:30'",
    ]);
    return self::$pdo;
  }
  private static function queryTiming($sql, $start) {
    $ms = (int)round((microtime(true) - $start) * 1000);
    $threshold = max(100, (int)(getenv('KHATYAR_SLOW_SQL_MS') ?: 350));
    if ($ms < $threshold) return;
    // Never log SQL parameters, personal data or raw dynamic query text.
    $verb = strtoupper(strtok(ltrim((string)$sql), " \t\r\n") ?: 'SQL');
    error_log("slow_sql operation={$verb} hash=".substr(hash('sha256',(string)$sql),0,12)." elapsed_ms={$ms}");
  }
  public static function all($sql, $params = []) {
    $start=microtime(true);
    try { $st=self::pdo()->prepare($sql); $st->execute($params); return $st->fetchAll(); }
    finally { self::queryTiming($sql,$start); }
  }
  public static function one($sql, $params = []) {
    $start=microtime(true);
    try { $st=self::pdo()->prepare($sql); $st->execute($params); $r=$st->fetch(); return $r === false ? null : $r; }
    finally { self::queryTiming($sql,$start); }
  }
  public static function run($sql, $params = []) {
    $start=microtime(true);
    try { $st=self::pdo()->prepare($sql); $st->execute($params); return $st; }
    finally { self::queryTiming($sql,$start); }
  }
  public static function exec($sql, $params = []) { return self::run($sql, $params)->rowCount(); }
  public static function insert($sql, $params = []) { self::run($sql, $params); return (int) self::pdo()->lastInsertId(); }
  public static function lastId() { return (int) self::pdo()->lastInsertId(); }
  public static function query($sql, $params = []) { return self::run($sql, $params); }
  public static function lastInsertId() { return (int) self::pdo()->lastInsertId(); }
}