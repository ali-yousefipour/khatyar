<?php
require_once __DIR__.'/../lib/GpsWorkIntervals.php';
require_once __DIR__.'/../lib/InternetWorkIntervals.php';

class Db {
  public static function one($sql, $args = []) {
    if (str_contains($sql, 'security_exempt')) return ['security_exempt' => ((int)($args[0] ?? 0) === 17 ? 1 : 0)];
    if (str_contains($sql, 'internet_work_required')) return ['value' => 'true'];
    throw new RuntimeException('Unexpected query: '.$sql);
  }
  public static function all($sql, $args = []) {
    if (str_contains($sql, 'internet_work_waivers')) return [];
    throw new RuntimeException('Exempt user must not query deduction evidence');
  }
  public static function run($sql, $args = []) { return null; }
}

if (!work_deduction_security_exempt(17) || work_deduction_security_exempt(18)) throw new RuntimeException('User exemption mismatch');
if (internet_work_intervals(17, 1700000000, 1700001800) !== []) throw new RuntimeException('Exempt user received internet deduction');
if (internet_work_daily_details(17, [['check_in'=>'2023-11-14 10:00:00','check_out'=>'2023-11-14 10:30:00']]) !== []) throw new RuntimeException('Exempt user received daily deduction');
echo "PASS security-exempt user has no internet-off work deduction\n";
