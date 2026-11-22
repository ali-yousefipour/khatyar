<?php
/**
 * Period-scoped, non-destructive seniority calculations.
 * Legacy personnel_seniority_months remains the definitive monthly ledger.
 */
require_once __DIR__.'/Seniority.php';
final class SeniorityPeriods {
  static function period($value) {
    $value = str_replace('/', '-', trim((string)$value));
    if (!preg_match('/^(1[34-6][0-9]{2})-(0[1-9]|1[0-2])$/D', $value, $m)) Http::error('ماه و سال شمسی معتبر نیست.',422);
    $y=(int)$m[1]; $month=(int)$m[2];
    if ($y<1300 || $y>1600) Http::error('سال انتخاب‌شده خارج از محدوده مجاز است.',422);
    return sprintf('%04d-%02d',$y,$month);
  }
  static function type($period) {
    return strcmp($period,substr(Seniority::today(),0,7))>0?'forecast':'final';
  }
  static function schema() {
    Seniority::ensureSchema();
    Db::run("CREATE TABLE IF NOT EXISTS personnel_seniority_period_runs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      period CHAR(7) NOT NULL, run_type VARCHAR(12) NOT NULL,
      status VARCHAR(16) NOT NULL, actor_id INT NOT NULL,
      eligible_count INT NOT NULL DEFAULT 0, processed_count INT NOT NULL DEFAULT 0,
      skipped_count INT NOT NULL DEFAULT 0, failed_count INT NOT NULL DEFAULT 0,
      error_summary TEXT NULL, started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME NULL,
      KEY idx_seniority_runs_period(period,run_type,id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    Db::run("CREATE TABLE IF NOT EXISTS personnel_seniority_forecasts (
      user_id INT NOT NULL, jyear SMALLINT NOT NULL, jmonth TINYINT NOT NULL,
      eligible_days TINYINT UNSIGNED NOT NULL, credited_days TINYINT UNSIGNED NOT NULL,
      actor_id INT NOT NULL, run_id BIGINT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(user_id,jyear,jmonth)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  }
  static function status($period) {
    self::schema(); $period=self::period($period);
    [$year,$month]=array_map('intval',explode('-',$period));
    $final=Db::one('SELECT COUNT(*) n FROM personnel_seniority_months WHERE jyear=? AND jmonth=?',[$year,$month]);
    $forecast=Db::one('SELECT COUNT(*) n FROM personnel_seniority_forecasts WHERE jyear=? AND jmonth=?',[$year,$month]);
    $run=Db::one('SELECT r.*, CONCAT_WS(\' \',u.first_name,u.last_name) actor_name FROM personnel_seniority_period_runs r LEFT JOIN users u ON u.id=r.actor_id WHERE r.period=? ORDER BY r.id DESC LIMIT 1',[$period]);
    $f=(int)($final['n']??0); $p=(int)($forecast['n']??0);
    return ['period'=>$period,'type'=>self::type($period),'final_count'=>$f,'forecast_count'=>$p,
      'status'=>($run&&in_array($run['status'],['partial','failed','running'],true))?$run['status']:($f?'calculated':($p?'forecast':'not_calculated')),
      'latest_run'=>$run];
  }
  static function history($limit=100,$offset=0) {
    self::schema(); $limit=max(1,min(200,(int)$limit));$offset=max(0,(int)$offset);
    $rows=Db::all('SELECT r.*, CONCAT_WS(\' \',u.first_name,u.last_name) actor_name FROM personnel_seniority_period_runs r LEFT JOIN users u ON u.id=r.actor_id ORDER BY r.id DESC LIMIT '.$limit.' OFFSET '.$offset);
    $count=Db::one('SELECT COUNT(*) n FROM personnel_seniority_period_runs');
    return ['rows'=>$rows,'total'=>(int)($count['n']??0)];
  }
  static function run($period,$ids,$actor) {
    $period=self::period($period);
    if (!is_array($ids) || !$ids || count($ids)>10000) Http::error('فهرست پرسنل معتبر نیست.',422);
    $selected=[];
    foreach($ids as $id) {
      if (filter_var($id,FILTER_VALIDATE_INT)===false || (int)$id<1) Http::error('شناسه پرسنل معتبر نیست.',422);
      $selected[(int)$id]=true;
    }
    if (count($selected)>2000) Http::error('حداکثر دو هزار نفر در هر عملیات مجاز است.',422);
    self::schema();
    $type=self::type($period);
    [$year,$month]=array_map('intval',explode('-',$period));
    $end=$period.'-'.IranCalendar::monthLength($year,$month);
    $today=Seniority::today();
    $yesterday=ShiftCalc::jdateAddDays($today,-1);
    $lockName='seniority-period:'.substr(hash('sha256',(string)(Db::one('SELECT DATABASE() db_name')['db_name']??'')),0,14).':'.$period.':'.$type;
    $locked=Db::one('SELECT GET_LOCK(?,0) acquired',[$lockName]);
    if ((int)($locked['acquired']??0)!==1) Http::error('محاسبه این ماه توسط مدیر دیگری در حال انجام است.',409);
    try {
      $eligible=count($selected); $done=0;$skipped=0;$failed=0;$errors=[];
      Db::run('INSERT INTO personnel_seniority_period_runs(period,run_type,status,actor_id,eligible_count) VALUES(?,?,?,?,?)',[$period,$type,'running',$actor,$eligible]);
      $runId=(int)(Db::one('SELECT LAST_INSERT_ID() id')['id']??0);
      foreach(array_keys($selected) as $uid) {
        try {
          Seniority::lockUser($uid,function() use($uid,$period,$year,$month,$end,$today,$yesterday,$type,$actor,$runId,&$done,&$skipped) {
            $person=Db::one('SELECT id,is_active FROM users WHERE id=?',[$uid]);
            $base=Db::one('SELECT * FROM personnel_seniority WHERE user_id=?',[$uid]);
            if (!$person || !(int)$person['is_active'] || !$base) { $skipped++;return; }
            if ($base['base_through_jdate'] >= $end) {$skipped++;return;}
            $existing=Db::one('SELECT credited_days FROM personnel_seniority_months WHERE user_id=? AND jyear=? AND jmonth=?',[$uid,$year,$month]);
            if ($type==='final' && $existing) {$skipped++;return;}
            if ($type==='forecast') {
              $forecast=Db::one('SELECT user_id FROM personnel_seniority_forecasts WHERE user_id=? AND jyear=? AND jmonth=?',[$uid,$year,$month]);
              if ($forecast) {$skipped++;return;}
              $credit=Seniority::monthCredit($year,$month,$base['base_through_jdate'],[],$today);
            } else {
              // Legacy attendance may perform DDL: read before beginning a transaction.
              $from=$period.'-01';
              $until=strcmp($end,$yesterday)<0?$end:$yesterday;
              $report=($until>=$from)?_attendance_report($uid,$from,$until):['days'=>[]];
              $credit=Seniority::monthCredit($year,$month,$base['base_through_jdate'],$report['days'],$today);
            }
            $pdo=Db::pdo();$pdo->beginTransaction();
            try {
              $base=Db::one('SELECT * FROM personnel_seniority WHERE user_id=? FOR UPDATE',[$uid]);
              if ($type==='forecast') {
                Db::run('INSERT IGNORE INTO personnel_seniority_forecasts(user_id,jyear,jmonth,eligible_days,credited_days,actor_id,run_id) VALUES(?,?,?,?,?,?,?)',
                  [$uid,$year,$month,$credit['eligible_days'],$credit['credited_days'],$actor,$runId]);
              } else {
                $existing=Db::one('SELECT credited_days FROM personnel_seniority_months WHERE user_id=? AND jyear=? AND jmonth=?',[$uid,$year,$month]);
                if ($existing) { $pdo->commit();$skipped++;return; }
                $old=(int)(Db::one('SELECT COALESCE(SUM(credited_days),0) days FROM personnel_seniority_months WHERE user_id=?',[$uid])['days']??0);
                $before=Seniority::total($base,$old);
                Db::run('INSERT INTO personnel_seniority_months(user_id,jyear,jmonth,eligible_days,absent_days,credited_days,absence_dates,checked_through_jdate,updated_by) VALUES(?,?,?,?,?,?,?,?,?)',
                  [$uid,$year,$month,$credit['eligible_days'],$credit['absent_days'],$credit['credited_days'],json_encode($credit['absence_dates']),$until,$actor]);
                Db::run('UPDATE personnel_seniority SET revision=revision+1,updated_by=?,updated_at=NOW() WHERE user_id=?',[$actor,$uid]);
                Seniority::audit($uid,'recalculate',$period,$before,$before+$credit['credited_days'],'محاسبه قطعی دوره انتخابی بدون بازنویسی دوره‌های قبلی',$actor);
              }
              $pdo->commit();$done++;
            } catch(Throwable $e) {if($pdo->inTransaction())$pdo->rollBack();throw $e;}
          });
        } catch(Throwable $e) { $failed++;error_log('Seniority period '.$period.' user '.$uid.': '.$e->getMessage());$errors[]=['user_id'=>$uid,'reason'=>'خطای پردازش؛ برای بررسی به مدیر فنی مراجعه کنید.']; }
      }
      $state=$failed?($done||$skipped?'partial':'failed'):'success';
      Db::run('UPDATE personnel_seniority_period_runs SET status=?,processed_count=?,skipped_count=?,failed_count=?,error_summary=?,finished_at=NOW() WHERE id=?',
        [$state,$done,$skipped,$failed,json_encode($errors,JSON_UNESCAPED_UNICODE),$runId]);
      return ['run_id'=>$runId,'period'=>$period,'type'=>$type,'status'=>$state,'processed'=>$done,'skipped'=>$skipped,'failed'=>$failed,'errors'=>$errors];
    } finally { Db::one('SELECT RELEASE_LOCK(?) released',[$lockName]); }
  }
}
