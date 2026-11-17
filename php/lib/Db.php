<?php
class Db {
  private static $pdo = null;
  public static function pdo() {
    if (self::$pdo) return self::$pdo;
    $c = require __DIR__ . '/../config.php';
    $dsn = "mysql:host={$c['db_host']};dbname={$c['db_name']};charset=utf8mb4";
    // The DSN already negotiates utf8mb4. Keep session settings as separate,
    // portable statements instead of combining SET NAMES with a variable assignment.
    $options = [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES => false,
      // Shared hosting: never keep idle database connections across PHP requests.
      PDO::ATTR_PERSISTENT => false,
    ];
    // MySQL 1203 is a per-account connection limit. A short, randomized,
    // bounded backoff can bridge transient spikes without retrying SQL writes.
    // Never retry arbitrary SQL after execution (it could have committed).
    for ($attempt = 0; ; ++$attempt) {
      try {
        $pdo = new PDO($dsn, $c['db_user'], $c['db_pass'], $options);
        break;
      } catch (PDOException $e) {
        $driverCode = isset($e->errorInfo[1]) ? (int)$e->errorInfo[1] : 0;
        $isLimit = $driverCode === 1203 || preg_match('/\\[1203\\]|max_user_connections/i', $e->getMessage());
        if (!$isLimit || $attempt >= 2) throw $e;
        error_log('db connection capacity reached; retry attempt=' . ($attempt + 1));
        usleep(random_int(150000, 300000) * ($attempt + 1));
      }
    }
    // Some shared-host MySQL accounts reject SESSION variable changes even
    // though connecting and querying are permitted. Do not convert an optional
    // connection preference into a complete login / API outage.
    self::$pdo = $pdo;
    foreach ([
      "SET SESSION collation_connection = 'utf8mb4_unicode_ci'",
      "SET SESSION time_zone = '+03:30'",
    ] as $statement) {
      try { $pdo->exec($statement); }
      catch (PDOException $error) {
        error_log('db session preference unavailable: '.(str_contains($statement,'time_zone')?'timezone':'collation').' sqlstate='.$error->getCode());
      }
    }
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