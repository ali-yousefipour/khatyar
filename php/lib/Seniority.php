<?php
require_once __DIR__.'/IranCalendar.php';
class Seniority {
  const BASELINE = '1405-06-31';

  static function ensureSchema() {
    static $ready = false;
    if ($ready) return;
    Db::run("CREATE TABLE IF NOT EXISTS personnel_seniority (
      user_id INT NOT NULL PRIMARY KEY, base_days INT UNSIGNED NOT NULL,
      base_through_jdate CHAR(10) NOT NULL, adjustment_days INT NOT NULL DEFAULT 0,
      source_ref VARCHAR(100) NULL, revision INT UNSIGNED NOT NULL DEFAULT 1,
      updated_by INT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    Db::run("CREATE TABLE IF NOT EXISTS personnel_seniority_months (
      user_id INT NOT NULL, jyear SMALLINT NOT NULL, jmonth TINYINT NOT NULL,
      eligible_days TINYINT UNSIGNED NOT NULL, absent_days TINYINT UNSIGNED NOT NULL,
      credited_days TINYINT UNSIGNED NOT NULL, absence_dates TEXT NOT NULL,
      checked_through_jdate CHAR(10) NOT NULL, updated_by INT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(user_id,jyear,jmonth)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    Db::run("CREATE TABLE IF NOT EXISTS personnel_seniority_history (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
      event_key VARCHAR(160) NULL, kind VARCHAR(20) NOT NULL, period CHAR(7) NULL,
      total_before INT NOT NULL, total_after INT NOT NULL, delta_days INT NOT NULL,
      reason VARCHAR(500) NOT NULL, actor_id INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_seniority_event(event_key), KEY idx_seniority_user(user_id,id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $ready = true;
  }

  static function today() {
    $now = new DateTimeImmutable('now', new DateTimeZone('Asia/Tehran'));
    [$year,$month,$day] = gregorian_to_jalali((int)$now->format('Y'),(int)$now->format('n'),(int)$now->format('j'));
    return sprintf('%04d-%02d-%02d',$year,$month,$day);
  }

  static function validDate($value) {
    $date = ShiftCalc::normJdate($value);
    if (!$date) return null;
    [$year,$month,$day] = array_map('intval',explode('-',$date));
    if ($year<1300 || $year>1600 || $month<1 || $month>12 || $day<1 || $day>IranCalendar::monthLength($year,$month)) return null;
    return $date;
  }

  static function monthCredit($year,$month,$baseline,$reportDays,$today) {
    $prefix = sprintf('%04d-%02d-', $year,$month);
    $length = IranCalendar::monthLength($year,$month);
    $eligible = 0;
    $absent = [];
    $reported = [];
    foreach ($reportDays as $row) {
      $date = ShiftCalc::normJdate($row['jdate']??'');
      if ($date && strpos($date,$prefix)===0 && $date>$baseline && $date<$today && !empty($row['absent'])) $reported[$date] = true;
    }
    for ($day=1;$day<=$length;$day++) {
      $date = $prefix.str_pad($day,2,'0',STR_PAD_LEFT);
      if ($date<=$baseline) continue;
      $eligible++;
      if (isset($reported[$date])) $absent[] = $date;
    }
    return ['eligible_days'=>$eligible,'absent_days'=>count($absent),'credited_days'=>$eligible-count($absent),'absence_dates'=>$absent];
  }

  static function total($row,$monthlyDays) {
    return (int)$row['base_days']+(int)$row['adjustment_days']+(int)$monthlyDays;
  }

  static function listRows() {
    self::ensureSchema();
    $today = static::today();
    [$year,$month] = array_map('intval',explode('-',$today));
    $rows = Db::all("SELECT u.id,u.first_name,u.last_name,u.username,u.national_code,u.personnel_code,u.role_id,u.zone_id,u.is_active,
      r.title role_title,z.name zone_name,s.base_days,s.base_through_jdate,s.adjustment_days,s.revision,s.source_ref,s.updated_at,
      COALESCE(m.total_days,0) monthly_days,COALESCE(cm.credited_days,0) current_month_days,
      cm.absent_days current_month_absent,cm.updated_at current_month_updated_at,
      cm.checked_through_jdate,cm.absence_dates
      FROM users u LEFT JOIN roles r ON r.id=u.role_id LEFT JOIN zones z ON z.id=u.zone_id
      LEFT JOIN personnel_seniority s ON s.user_id=u.id
      LEFT JOIN (SELECT user_id,SUM(credited_days) total_days FROM personnel_seniority_months GROUP BY user_id) m ON m.user_id=u.id
      LEFT JOIN personnel_seniority_months cm ON cm.user_id=u.id AND cm.jyear=? AND cm.jmonth=?
      ORDER BY u.last_name,u.first_name,u.id",[$year,$month]);
    foreach ($rows as &$row) {
      $row['initialized'] = $row['base_days']!==null;
      $row['seniority_days'] = $row['initialized']?self::total($row,$row['monthly_days']):null;
      $row['absence_dates'] = json_decode($row['absence_dates']??'[]',true) ?: [];
    }
    unset($row);
    return ['rows'=>$rows,'today'=>$today,'period'=>sprintf('%04d-%02d',$year,$month),'month_days'=>IranCalendar::monthLength($year,$month),'baseline'=>self::BASELINE];
  }

  static function lockUser($userId,$operation) {
    self::ensureSchema();
    $name = 'seniority:'.substr(hash('sha256',(string)(Db::one('SELECT DATABASE() db_name')['db_name']??'')),0,16).':'.$userId;
    $lock = Db::one('SELECT GET_LOCK(?,0) acquired',[$name]);
    if ((int)($lock['acquired']??0)!==1) Http::error('سنوات این شخص هم‌اکنون در حال تغییر است؛ دوباره تلاش کنید.',409);
    try { return $operation(); }
    finally { Db::one('SELECT RELEASE_LOCK(?) released',[$name]); }
  }

  static function audit($userId,$kind,$period,$before,$after,$reason,$actor) {
    Db::run('INSERT INTO personnel_seniority_history(user_id,kind,period,total_before,total_after,delta_days,reason,actor_id) VALUES(?,?,?,?,?,?,?,?)',
      [$userId,$kind,$period,$before,$after,$after-$before,$reason,$actor]);
  }

  static function save($userId,$body,$actor) {
    $days = filter_var($body['seniority_days']??null,FILTER_VALIDATE_INT);
    $reason = trim((string)($body['reason']??''));
    if ($days===false || $days<0 || $days>1000000 || $reason==='' || mb_strlen($reason)>500) Http::error('تعداد روز معتبر (صفر تا یک میلیون) و دلیل تغییر را وارد کنید.',422);
    return self::lockUser($userId,function() use($userId,$body,$actor,$days,$reason) {
      if (!Db::one('SELECT id FROM users WHERE id=?',[$userId])) Http::error('پرسنل یافت نشد.',404);
      $pdo = Db::pdo();
      $pdo->beginTransaction();
      try {
        $row = Db::one('SELECT * FROM personnel_seniority WHERE user_id=? FOR UPDATE',[$userId]);
        $monthly = (int)(Db::one('SELECT COALESCE(SUM(credited_days),0) days FROM personnel_seniority_months WHERE user_id=?',[$userId])['days']??0);
        if ($row) {
          if ((int)($body['revision']??0)!==(int)$row['revision']) Http::error('اطلاعات توسط کاربر دیگری تغییر کرده است. فهرست را به‌روزرسانی کنید.',409);
          $before = self::total($row,$monthly);
          Db::run('UPDATE personnel_seniority SET adjustment_days=?,revision=revision+1,updated_by=?,updated_at=NOW() WHERE user_id=?',[$days-(int)$row['base_days']-$monthly,$actor,$userId]);
        } else {
          $baseline = self::validDate($body['base_through_jdate']??'');
          if (!$baseline || $baseline>static::today()) Http::error('تاریخ مبنای سنوات معتبر نیست یا در آینده است.',422);
          $before = 0;
          Db::run('INSERT INTO personnel_seniority(user_id,base_days,base_through_jdate,source_ref,updated_by) VALUES(?,?,?,?,?)',[$userId,$days,$baseline,'manual',$actor]);
        }
        self::audit($userId,$row?'edit':'initialize',null,$before,$days,$reason,$actor);
        $pdo->commit();
        return ['ok'=>true,'seniority_days'=>$days];
      } catch (Throwable $failure) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $failure;
      }
    });
  }

  static function recalculate($userId,$actor,$expectedPeriod) {
    $today = static::today();
    [$year,$month] = array_map('intval',explode('-',$today));
    $period = sprintf('%04d-%02d',$year,$month);
    if ($expectedPeriod!==$period) Http::error('ماه جاری تغییر کرده است. فهرست را دوباره دریافت کنید.',409);
    return self::lockUser($userId,function() use($userId,$actor,$today,$year,$month,$period) {
      $person = Db::one('SELECT id,is_active FROM users WHERE id=?',[$userId]);
      if (!$person) Http::error('پرسنل یافت نشد.',404);
      if (!(int)$person['is_active']) Http::error('محاسبه ماهانه برای نیروی غیرفعال انجام نمی‌شود.',422);
      $row = Db::one('SELECT * FROM personnel_seniority WHERE user_id=?',[$userId]);
      if (!$row) Http::error('ابتدا سنوات مبنای این شخص را از فایل اکسل یا به‌صورت دستی ثبت کنید.',422);
      $last = $period.'-'.IranCalendar::monthLength($year,$month);
      if ($row['base_through_jdate']>=$last) return ['ok'=>true,'skipped'=>true,'delta_days'=>0,'reason'=>'این ماه در سنوات مبنا پوشش داده شده است.'];
      $yesterday = ShiftCalc::jdateAddDays($today,-1);
      $from = $period.'-01';
      $report = $yesterday>=$from ? _attendance_report($userId,$from,$yesterday) : ['days'=>[]];
      $credit = self::monthCredit($year,$month,$row['base_through_jdate'],$report['days'],$today);
      $pdo = Db::pdo();
      $pdo->beginTransaction();
      try {
        $row = Db::one('SELECT * FROM personnel_seniority WHERE user_id=? FOR UPDATE',[$userId]);
        $monthly = (int)(Db::one('SELECT COALESCE(SUM(credited_days),0) days FROM personnel_seniority_months WHERE user_id=?',[$userId])['days']??0);
        $previous = Db::one('SELECT credited_days FROM personnel_seniority_months WHERE user_id=? AND jyear=? AND jmonth=?',[$userId,$year,$month]);
        $before = self::total($row,$monthly);
        $delta = $credit['credited_days']-(int)($previous['credited_days']??0);
        if ($before+$delta<0) Http::error('اصلاح غیبت باعث سنوات منفی می‌شود؛ ابتدا اصلاح دستی قبلی را بررسی کنید.',409);
        Db::run('INSERT INTO personnel_seniority_months(user_id,jyear,jmonth,eligible_days,absent_days,credited_days,absence_dates,checked_through_jdate,updated_by) VALUES(?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE eligible_days=VALUES(eligible_days),absent_days=VALUES(absent_days),credited_days=VALUES(credited_days),absence_dates=VALUES(absence_dates),checked_through_jdate=VALUES(checked_through_jdate),updated_by=VALUES(updated_by),updated_at=NOW()',
          [$userId,$year,$month,$credit['eligible_days'],$credit['absent_days'],$credit['credited_days'],json_encode($credit['absence_dates']),$yesterday,$actor]);
        Db::run('UPDATE personnel_seniority SET revision=revision+1,updated_by=?,updated_at=NOW() WHERE user_id=?',[$actor,$userId]);
        self::audit($userId,'recalculate',$period,$before,$before+$delta,'تمام روزهای ماه منهای غیبت روزهای پایان‌یافته؛ بررسی تا '.$yesterday,$actor);
        $pdo->commit();
        return array_merge(['ok'=>true,'period'=>$period,'delta_days'=>$delta,'seniority_days'=>$before+$delta,'checked_through_jdate'=>$yesterday],$credit);
      } catch (Throwable $failure) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $failure;
      }
    });
  }
}
