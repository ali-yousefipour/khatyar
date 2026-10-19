<?php
// Regression: monthly shortfall must equal the sum of actual daily shortfalls,
// not the difference between expected duty and in-shift presence.
$source = file_get_contents(__DIR__ . '/../app/api/admin-attendance-report.php');
$start = strpos($source, 'function aar_reconcile_day_totals(');
$end = strpos($source, "\ntry {", $start);
if ($start === false || $end === false) throw new RuntimeException('Reconciliation helper missing');
function aar_normalize_jdate($value) { return str_replace('/', '-', (string)$value); }
eval(substr($source, $start, $end - $start));
function checkValue($name, $actual, $expected) {
  if ($actual !== $expected) throw new RuntimeException("$name: expected $expected, got $actual");
}
$report = [
  'days' => [
    ['jdate'=>'1405-07-01','expected'=>300,'in_shift'=>178,'worked'=>480,'shortage'=>0],
    ['jdate'=>'1405-07-02','expected'=>300,'in_shift'=>300,'worked'=>480,'shortage'=>0],
    ['jdate'=>'1405-07-03','expected'=>0,'in_shift'=>0,'worked'=>480,'shortage'=>0],
    ['jdate'=>'1405-07-04','expected'=>300,'in_shift'=>200,'worked'=>200,'shortage'=>100],
    ['jdate'=>'1405-07-05','expected'=>300,'in_shift'=>0,'shortage'=>300,'is_future'=>true],
  ],
  'totals'=>['shortage'=>122],
  'work_totals'=>['shortage'=>122],
  'summary'=>['shortage'=>122]
];
$result = aar_reconcile_day_totals($report);
foreach (['totals','work_totals','summary'] as $field) {
  checkValue("$field daily shortage", $result[$field]['shortage'], 100);
  checkValue("$field expected", $result[$field]['expected'], 900);
  checkValue("$field in-shift", $result[$field]['in_shift'], 678);
}
checkValue('future duty excluded', $result['summary']['expected'], 900);
checkValue('actual shortage not hidden', $result['summary']['shortage'], 100);
echo "PASS daily-to-monthly attendance reconciliation\n";
