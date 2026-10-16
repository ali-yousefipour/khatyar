<?php
require_once __DIR__.'/../lib/XlsxWriter.php';
require_once __DIR__.'/../lib/Seniority.php';
$source=file_get_contents(__DIR__.'/../lib/routes.php');
$start=strpos($source,'function gregorian_to_jalali(');
$end=strpos($source,'function j_to_ts(',$start);
eval(substr($source,$start,$end-$start));
if (($argv[1]??'')==='legacy') {
  $writer=new XlsxWriter(['نام','کد']);
  $writer->setProfessionalStyle(true);
  $writer->addRow(['نمونه','0012']);
} else {
  $writer=Seniority::exportWorkbook([
    ['first_name'=>'=1+1','last_name'=>'آزمایشی','personnel_code'=>'005005','national_code'=>'0012345678','username'=>'0012345678','role_title'=>'بازرس','zone_name'=>'شمال','is_active'=>1,'base_days'=>100,'base_through_jdate'=>'1405-06-31','adjustment_days'=>-2,'monthly_days'=>30,'current_month_updated_at'=>'2026-10-16','current_month_days'=>30,'current_month_absent'=>0,'seniority_days'=>128,'initialized'=>true],
    ['first_name'=>'نیروی','last_name'=>'بدون مبنا','personnel_code'=>'005006','national_code'=>null,'username'=>'0098765432','role_title'=>'ناظر','zone_name'=>'شرق','is_active'=>1,'base_days'=>null,'base_through_jdate'=>null,'adjustment_days'=>null,'monthly_days'=>0,'current_month_updated_at'=>null,'current_month_days'=>0,'current_month_absent'=>null,'seniority_days'=>null,'initialized'=>false]
  ],'1405-07');
}
$writer->output('test.xlsx','سنوات نیروها');
