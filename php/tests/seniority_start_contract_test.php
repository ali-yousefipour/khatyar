<?php
// Regression guard: canonical Jalali seniority start remains a single editor/export field.
// This test does not connect to the production database or mutate files.
$root=dirname(__DIR__);
$panel=file_get_contents($root.'/tools/panel_source.jsx');
$routes=file_get_contents($root.'/lib/routes.php');
$entry=file_get_contents($root.'/app/index.php');
$report=file_get_contents($root.'/lib/UserFullReport.php');
$checks=[
  'create form uses canonical label'=>str_contains($panel,'<label>شروع سنوات (اختیاری)</label>'),
  'edit form uses canonical label'=>str_contains($panel,'<label>شروع سنوات</label>'),
  'edit form synchronizes legacy input'=>str_contains($panel,'seniority_start:v,employment_start_date:v'),
  'report exports single canonical date'=>str_contains($report,"'seniority_start'=>'شروع سنوات'") && !str_contains($report,"'employment_start_date'=>'شروع همکاری'"),
  'report filters use canonical date'=>str_contains($report,"'employment_start_from'=>['seniority_start','>=']"),
  'create persists both compatibility columns'=>str_contains($routes,'birth_date,seniority_start,employment_start_date,must_change_pw'),
  'update checks conflicting dates'=>str_contains($entry,'تاریخ شروع سنوات و فیلد قدیمی شروع همکاری متفاوت هستند'),
  'update copies canonical to legacy'=>str_contains($entry,"$"."body['employment_start_date'] = $"."canonical;"),
  'historical seniority ledger remains untouched'=>!str_contains($entry,'UPDATE personnel_seniority') && !str_contains($routes,'UPDATE personnel_seniority_months')
];
foreach($checks as $name=>$ok){if(!$ok){fwrite(STDERR,"FAIL: $name\n");exit(1);}}
echo "Seniority date source/compatibility contract checks passed (".count($checks).").\n";
