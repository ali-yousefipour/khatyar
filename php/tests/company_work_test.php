<?php
date_default_timezone_set('Asia/Tehran');
const ADMIN=3;
function route(...$args){}
require_once __DIR__.'/../lib/CompanyWork.php';
function check($name,$condition){if(!$condition)throw new RuntimeException('FAIL '.$name);echo "PASS $name\n";}
function rejected($name,$fn){try{$fn();}catch(PayrollError $e){check($name,$e->getCode()===422);return;}throw new RuntimeException('Expected rejection: '.$name);}
require __DIR__.'/company_work_fixture.php';

$tmp=tempnam(sys_get_temp_dir(),'company-work-');
try{
  syntheticOrganization($tmp);$rows=CompanyWork::parse($tmp,1405,7);
  check('physical rows preserved across gaps',array_column($rows,'source_row')===[4,6]);
  check('merged role expanded across both grouping columns',$rows[0]['role']==='ناظر'&&$rows[1]['role']==='ناظر');
  check('hours numeric and HH:MM without zero fallback',$rows[0]['friday_hours']===0.0&&abs($rows[0]['overtime_hours']-7.55)<1e-9);
  rejected('period must match source title',fn()=>CompanyWork::parse($tmp,1405,8));
  syntheticOrganization($tmp,fn($s)=>str_replace('<is><t>07:33</t></is>','<f>1+1</f>',$s));rejected('uncached formulas rejected',fn()=>CompanyWork::parse($tmp,1405,7));
  syntheticOrganization($tmp,fn($s)=>'<!DOCTYPE x [<!ENTITY test "unsafe">]>'.$s);rejected('DTD rejected',fn()=>CompanyWork::parse($tmp,1405,7));
  $users=[['id'=>1,'personnel_code'=>'5','first_name'=>'آزمایشی','last_name'=>'یک'],['id'=>2,'personnel_code'=>'6','first_name'=>'آزمایشی','last_name'=>'دو']];
  $match=CompanyWork::matchRows($rows,$users);check('exact personnel and name match including leading zero',$match[0]['user_id']===1&&!$match[0]['errors']);
  $wrong=$rows;$wrong[0]['personnel_code']='99';$match=CompanyWork::matchRows($wrong,$users);check('name-only match is suggestion, never assignment',$match[0]['user_id']===null&&$match[0]['suggested_code']==='5');
  $wrong=$rows;$wrong[0]['last_name']='دیگر';$match=CompanyWork::matchRows($wrong,$users);check('name/code conflict blocked',$match[0]['user_id']===null&&count($match[0]['errors'])>0);
  $match=CompanyWork::matchRows([$rows[0],$rows[0]],$users);check('duplicate personnel rejected for every row',$match[0]['user_id']===null&&$match[1]['user_id']===null);
  $req=[['type'=>'annual','unit'=>'daily','from_jdate'=>'1405/06/30','to_jdate'=>'1405/07/02'],['type'=>'annual','unit'=>'hourly','the_date'=>'1405/07/03','from_time'=>'08:00','to_time'=>'15:33'],['type'=>'sick','unit'=>'daily','from_jdate'=>'1405/07/04','to_jdate'=>'1405/07/04']];
  $leave=CompanyWork::leaveDays(array_merge($req,[$req[0],$req[1]]),CompanyWork::date('1405/07/01'),CompanyWork::date('1405/07/30'));
  check('453 minutes, clipping month and deduplication',$leave['annual']===3&&$leave['sick']===1);
  $overlap=[['type'=>'annual','unit'=>'hourly','the_date'=>'1405/07/03','from_time'=>'08:00','to_time'=>'10:00'],['type'=>'annual','unit'=>'hourly','the_date'=>'1405/07/03','from_time'=>'09:00','to_time'=>'11:00']];
  $leave=CompanyWork::leaveDays($overlap,CompanyWork::date('1405/07/01'),CompanyWork::date('1405/07/30'));check('overlapping hourly intervals counted once',abs($leave['annual']-180/453)<1e-9);
  $report=['days'=>[['jdate'=>'1405-07-01','absent'=>1,'night'=>'01:00'],['jdate'=>'1405-07-15','absent'=>1,'night'=>'02:30'],['jdate'=>'1405-07-16','absent'=>1,'night'=>'00:00'],['jdate'=>'1405-07-17','absent'=>1,'night'=>'00:00']]];
  $metrics=CompanyWork::metrics(['employment_start_date'=>'1405/07/15','employment_end_date'=>null],$report,[],1405,7,CompanyWork::date('1405/07/16'));
  check('new hire eligible calendar days clipped',$metrics['days']===16);
  check('no absence before hire or today or future',$metrics['absence_days']===1);
  check('night hours from canonical daily report',$metrics['night_hours']===2.5);
  $r=array_merge($rows[0],['national_code'=>'0012345678','account'=>'0000123456','days'=>30,'leave_days'=>0.5,'absence_days'=>1,'sick_days'=>2,'married'=>'متاهل','children'=>1,'night_hours'=>2.5,'seniority_days'=>730,'morning'=>0.5,'afternoon'=>1/3,'night'=>1/6,'errors'=>[]]);
  $r['first_name']='=HYPERLINK("https://invalid")';
  $out=['rows'=>array_fill(0,120,$r),'year'=>1405,'month'=>7,'has_errors'=>false];CompanyWork::write($out,$tmp);
  $z=new ZipArchive();$z->open($tmp);$xml=CompanyWork::xml($z->getFromName('xl/worksheets/sheet1.xml'));$xp=CompanyWork::xpath($xml);
  check('dynamic output contains all 120 personnel',$xp->query('//s:sheetData/s:row')->length===124);
  check('effective days formula and cached value',$xp->evaluate('string(//s:c[@r="L4"]/s:f)')==='H4-J4-K4'&&$xp->evaluate('string(//s:c[@r="L4"]/s:v)')==='27');
  check('seniority formula references day column',$xp->evaluate('string(//s:c[@r="S4"]/s:f)')==='X4/365'&&$xp->evaluate('string(//s:c[@r="S4"]/s:v)')==='2');
  check('totals formula extends to final data row',$xp->evaluate('string(//s:c[@r="H124"]/s:f)')==='SUM(H4:H123)');
  check('footer merge moved',$xp->query('//s:mergeCell[@ref="A124:G124"]')->length===1);
  check('text formula injection prevented',$xp->query('//s:c[@r="B4"]/s:f')->length===0&&$xp->evaluate('string(//s:c[@r="B4"]/@t)')==='inlineStr');
  check('leading zeros preserved as text',$xp->evaluate('string(//s:c[@r="E4"]/s:is/s:t)')==='0012345678');
  check('RTL and frozen headers',$xp->evaluate('string(//s:sheetView/@rightToLeft)')==='1'&&$xp->evaluate('string(//s:pane/@ySplit)')==='3');
  $book=CompanyWork::xml($z->getFromName('xl/workbook.xml'));$bx=CompanyWork::xpath($book);check('print area includes all personnel and seniority',str_contains($bx->evaluate('string(//s:definedName[@name="_xlnm.Print_Area"])'),'$X$124'));$z->close();
  echo "Company work regression tests passed\n";
}finally{if(is_file($tmp))unlink($tmp);}
