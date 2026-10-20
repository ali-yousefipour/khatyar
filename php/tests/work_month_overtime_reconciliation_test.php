<?php
// Regression checks for the production monthly overtime settlement snippet.
$source = file_get_contents(__DIR__.'/../lib/routes.php');
$start = strpos($source, '    // Keep regular overtime and Friday/holiday work as disjoint minute buckets.');
$end = strpos($source, '    $out[] = array_merge(', $start);
if ($start === false || $end === false || $end <= $start) {
    throw new RuntimeException('Monthly overtime settlement code missing');
}
$settle = substr($source, $start, $end - $start);
$check = static function (string $label, int $expected, int $actual): void {
    if ($expected !== $actual) throw new RuntimeException("$label expected $expected got $actual");
    echo "PASS $label\n";
};
$test = static function(array $input, array $config) use ($settle): array {
    $tot = $input;
    $shift = $config;
    eval($settle);
    return $tot;
};
// Minute values, not HH:MM strings, are canonical in the aggregation layer.
$example = $test(['overtime'=>1000,'friday'=>960,'holiday'=>1374],[]);
$check('regular overtime',1000,$example['regular_overtime']);
$check('Friday accounted once',960,$example['friday_overtime']);
$check('holiday accounted once',1374,$example['holiday_overtime']);
$check('sample daily total 55:34',3334,$example['total_overtime']);
$check('monthly regular overtime excludes off-day work',1000,$example['overtime']);
$check('combined off-day work is disjoint',2334,$example['holiday_friday_overtime']);
$friday = $test(['overtime'=>0,'friday'=>489,'holiday'=>0],[]);
$check('Friday 08:09 not added to regular overtime',0,$friday['overtime']);
$check('Friday 08:09 counted once in total',489,$friday['total_overtime']);
$holiday = $test(['overtime'=>0,'friday'=>0,'holiday'=>480],[]);
$check('public or manual holiday exactly once',480,$holiday['total_overtime']);
$both = $test(['overtime'=>0,'friday'=>480,'holiday'=>0],[]);
$check('Friday also holiday classified Friday only',480,$both['total_overtime']);
$capped = $test(['overtime'=>1000,'friday'=>960,'holiday'=>0],['monthly_ot_cap'=>600]);
$check('gross regular remains unchanged',1000,$capped['regular_overtime']);
$check('monthly cap only payable regular',600,$capped['payable_regular_overtime']);
$check('unpaid capped minutes',400,$capped['capped_overtime_minutes']);
$check('gross Friday not reduced by cap',1960,$capped['total_overtime']);
$check('payable Friday not reduced by cap',1560,$capped['payable_total_overtime']);
$check('visible regular overtime unchanged by cap',1000,$capped['overtime']);
$autoUncapped = $test(['overtime'=>2374,'friday'=>1380,'holiday'=>0],
    ['type'=>'auto','monthly_ot_cap'=>1000]);
$check('automatic shift ignores legacy 1000 minute cap',0,$autoUncapped['monthly_ot_cap']);
$check('automatic shift payable regular 39:34',2374,$autoUncapped['payable_regular_overtime']);
$check('automatic shift Friday 23:00',1380,$autoUncapped['friday_overtime']);
$check('automatic shift gross/payable 62:34',3754,$autoUncapped['payable_total_overtime']);
$check('automatic shift zero capped minutes',0,$autoUncapped['capped_overtime_minutes']);
$zero = $test(['overtime'=>0,'friday'=>0,'holiday'=>0],[]);
$check('zero work',0,$zero['total_overtime']);
// Contracts already exercised by work_shift_regression_test and
// work_month_daily_reconciliation_test must remain present.
if (!str_contains($source, '$dayShift = _active_user_shift_assignment($a[\'user_id\'], $jdate);'))
    throw new RuntimeException('Per-day assignment lookup removed');
if (!str_contains($source, 'JOIN users uu ON uu.id=us.user_id AND uu.is_active=1'))
    throw new RuntimeException('Inactive users filter removed');
if (!str_contains($source, '_work_month_daily_attendance_totals($dailyReport,$lastDay)'))
    throw new RuntimeException('Leave / mission / shortage daily reconciliation removed');
$panel = file_get_contents(__DIR__.'/../tools/panel_source.jsx');
foreach (['<th>جمعه کاری</th>','<th>تعطیل کاری</th>'] as $heading) {
    if (!str_contains($panel,$heading)) throw new RuntimeException('Missing monthly table column: '.$heading);
}
foreach (['$hm($r[\'friday\']??0)', '$hm($r[\'holiday\']??0)'] as $expression) {
    if (!str_contains($source,$expression)) throw new RuntimeException('Missing monthly Excel export field: '.$expression);
}
if (str_contains($panel, '<th>اضافه کاری جمعه</th>')) throw new RuntimeException('Duplicate Friday column returned');
echo "PASS monthly report and Excel deduplicated Friday/holiday columns\n";
echo "PASS monthly overtime integration contracts\n";
