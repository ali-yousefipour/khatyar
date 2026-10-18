<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/lib/IranCalendar.php';
$expected=[
'01-01','01-02','01-03','01-04','01-12','01-13','01-24',
'03-03','03-06','03-14','03-15',
'04-03','04-04','04-14','04-15',
'05-13','05-21','05-22','05-30',
'06-08','08-22','10-02','10-16','11-04','11-22',
'12-09','12-19','12-20','12-29'];
$actual=[];
foreach(IranCalendar::events(1405) as $j=>$event){
    if(!empty($event['is_holiday']))$actual[]=substr($j,5);
}
sort($expected);sort($actual);
if($actual!==$expected){
    fwrite(STDERR,"Incorrect 1405 official holidays.\nExpected: ".implode(',',$expected)."\nActual: ".implode(',',$actual)."\n");
    exit(1);
}
if(!IranCalendar::isOfficialHoliday('1405-01-24') || IranCalendar::isOfficialHoliday('1405-07-05')){
    fwrite(STDERR,"Holiday day classification regression.\n");
    exit(1);
}
echo "1405 official holiday reference: ".count($actual)." Mashhad-applicable dates verified.\n";
