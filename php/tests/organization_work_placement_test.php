<?php
require_once __DIR__.'/../lib/OrganizationWorkPlacement.php';
function checkPlacement($value){if(!$value)throw new RuntimeException('Placement regression');}
$slots=[['id'=>'3','location'=>'راه آهن','role'=>'ناظر خط'],['id'=>'4','location'=>'راه آهن','role'=>'ناظر خط']];
$people=[['id'=>1,'location'=>'راه آهن','role'=>'ناظر خط'],['id'=>2,'location'=>'راه آهن','role'=>'بازرس'],['id'=>3,'location'=>'راه آهن','role'=>'ناظر خط']];
$r=OrganizationWorkPlacement::suggest($slots,$people);
checkPlacement($r['assignments'][3]===1&&$r['assignments'][4]===3&&$r['unassigned']===[2]);
$r=OrganizationWorkPlacement::validate($slots,$people,[3=>2,4=>null]);
checkPlacement($r['unassigned']===[1,3]);
try{OrganizationWorkPlacement::validate($slots,$people,[3=>1,4=>1]);throw new RuntimeException('Duplicate accepted');}catch(InvalidArgumentException $e){}

$slots=[['id'=>'a','location'=>'راه آهن','role'=>'ناظر خط','rotation'=>'۱۵٪'],['id'=>'b','location'=>'راه آهن','role'=>'ناظر خط'],['id'=>'c','location'=>'فرودگاه','role'=>'ناظر خط']];
$people=[['id'=>1,'location'=>'راه‌آهن','role'=>'ناظر خط','rotation'=>'١٥%'],['id'=>2,'location'=>'راه آهن','role'=>'ناظر خط'],['id'=>3,'location'=>'راه آهن','role'=>'ناظر خط'],['id'=>4,'location'=>'نامشخص','role'=>'ناظر خط']];
$r=OrganizationWorkPlacement::suggest($slots,$people);
checkPlacement($r['assignments']['a']===1&&$r['assignments']['b']===2&&$r['overflow']===[3]&&$r['unmatched']===[4]);
checkPlacement(OrganizationWorkPlacement::normalize('كود ١٢')==='کود 12');
$r=OrganizationWorkPlacement::suggest([['id'=>'a','location'=>'فرودگاه','role'=>'ناظر خط']], [['id'=>5,'location'=>'فرودگاه شهید هاشمی نژاد','role'=>'ناظر خط']], ['location'=>['فرودگاه شهید هاشمی نژاد'=>'فرودگاه']]);
checkPlacement($r['assignments']['a']===5);
try{OrganizationWorkPlacement::validate($slots,$people,['bad'=>1]);throw new RuntimeException('Unknown slot accepted');}catch(InvalidArgumentException $e){}

$slots=[['id'=>'x','location'=>'شرکت','role'=>'بازرس','region'=>'۱'],['id'=>'y','location'=>'شرکت','role'=>'بازرس','region'=>'۲']];
$people=[['id'=>9,'location'=>'شرکت','role'=>'بازرس','region'=>'۲'],['id'=>7,'location'=>'شرکت','role'=>'بازرس','region'=>'۱'],['id'=>8,'location'=>'شرکت','role'=>'بازرس']];
$r=OrganizationWorkPlacement::suggest($slots,$people);
checkPlacement($r['assignments']===['x'=>7,'y'=>9]&&$r['unmatched']===[8]);
$r=OrganizationWorkPlacement::suggest($slots,[]);
checkPlacement($r['assignments']===['x'=>null,'y'=>null]&&$r['unassigned']===[]);
try{OrganizationWorkPlacement::suggest($slots,[$people[0],$people[0]]);throw new RuntimeException('Duplicate person accepted');}catch(InvalidArgumentException $e){}

$slots=[
 ['id'=>'a','location'=>'فرودگاه شهید هاشمی نژاد','role'=>'ناظر خط داخلی'],
 ['id'=>'b','location'=>'راه آهن','role'=>'اپراتور فاکتور سفر'],
 ['id'=>'c','location'=>'نظارت تصویری','role'=>'','combined'=>true],
 ['id'=>'d','location'=>'بازرس مناطق تاکسیرانی','role'=>'','combined'=>true],
 ['id'=>'e','location'=>'ناظر خطوط ثابت','role'=>'','combined'=>true],
 ['id'=>'f','location'=>'ناظر خطوط گردشی','role'=>'','combined'=>true],
 ['id'=>'g','location'=>'شیرازی','role'=>'ناظر خط (شیرازی)'],
];
$people=[
 ['id'=>11,'region'=>'منطقه فرودگاه','role'=>'ناظر خط مبادی','location'=>''],
 ['id'=>12,'region'=>'راه‌آهن','role'=>'اپراتور'],
 ['id'=>13,'region'=>'شرکت','role'=>'نظارت تصویری'],
 ['id'=>14,'region'=>'منطقه ۲','role'=>'بازرس'],
 ['id'=>15,'region'=>'منطقه ۳','role'=>'ناظر خط ثابت'],
 ['id'=>16,'region'=>'منطقه ۴','role'=>'ناظر خط گردشی'],
 ['id'=>17,'region'=>'شیرازی','role'=>'ناظر خط ثامن'],
 ['id'=>18,'region'=>'نامشخص','role'=>'ناظر خط'],
];
$r=OrganizationWorkPlacement::suggest($slots,$people);
checkPlacement($r['assignments']===['a'=>11,'b'=>12,'c'=>13,'d'=>14,'e'=>15,'f'=>16,'g'=>17]);
checkPlacement($r['unmatched']===[18]);

echo "OK\n";


$slots=[['id'=>'a','location'=>'شرکت','role'=>'کاربر خطوط'],['id'=>'b','location'=>'شرکت','role'=>'کاربر خطوط'],['id'=>'c','location'=>'شرکت','role'=>'نیروی اداری'],['id'=>'d','location'=>'فرودگاه','role'=>'اپراتور']];
$people=[['id'=>31,'region'=>'منطقه ۲','role'=>'نیروی اداری مقیم سازمان'],['id'=>32,'region'=>'','role'=>'نیروی اداری مقیم سازمان'],['id'=>33,'region'=>'فرودگاه','role'=>'نیروی اداری مقیم سازمان'],['id'=>34,'region'=>'شرکت','role'=>'نیروی اداری']];
$r=OrganizationWorkPlacement::suggest($slots,$people);
checkPlacement($r['assignments']===['a'=>31,'b'=>32,'c'=>34,'d'=>null]&&$r['overflow']===[33]);
