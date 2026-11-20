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

$slots=[
 ['id'=>'fixed1','location'=>'ناظر خطوط ثابت','role'=>'','combined'=>true],
 ['id'=>'fixed2','location'=>'ناظر خطوط ثابت','role'=>'','combined'=>true],
 ['id'=>'fixed3','location'=>'ناظر خطوط ثابت','role'=>'','combined'=>true],
 ['id'=>'mobile','location'=>'ناظر خطوط گردشی','role'=>'','combined'=>true],
 ['id'=>'airport','location'=>'فرودگاه','role'=>'ناظر خط'],
];
$people=[
 ['id'=>41,'region'=>'منطقه شرق','role'=>'ناظر خط'],
 ['id'=>42,'region'=>'غرب','role'=>'ناظر خط'],
 ['id'=>43,'region'=>'منطقه مرکزی','role'=>'ناظر خط'],
 ['id'=>44,'region'=>'شرق','role'=>'گشت موتوری'],
 ['id'=>45,'region'=>'فرودگاه','role'=>'ناظر خط مبادی'],
 ['id'=>46,'region'=>'غرب','role'=>'گشت موتوری'],
 ['id'=>47,'region'=>'مرکزی','role'=>'گشت خودرویی'],
 ['id'=>48,'region'=>'نامشخص','role'=>'ناظر خط'],
];
$r=OrganizationWorkPlacement::suggest($slots,$people);
checkPlacement($r['assignments']===['fixed1'=>41,'fixed2'=>42,'fixed3'=>43,'mobile'=>44,'airport'=>45]);
checkPlacement($r['overflow']===[46]&&$r['unmatched']===[47,48]);
echo "Regional fixed and motorcycle mobile placement OK\n";

$slots=[
 ['id'=>'a','location'=>'فرودگاه شهید هاشمی نژاد','role'=>'بازرس مقیم خط'],
 ['id'=>'b','location'=>'فرودگاه','role'=>'بازرس مقیم خط'],
 ['id'=>'c','location'=>'فرودگاه','role'=>'ناظر خط خارجی'],
 ['id'=>'d','location'=>'فرودگاه','role'=>'ناظر خط خارجی'],
 ['id'=>'e','location'=>'فرودگاه','role'=>'ناظر خط داخلی'],
 ['id'=>'f','location'=>'پایانه مسافربری','role'=>'اپراتور فاکتور سفر'],
 ['id'=>'g','location'=>'راه آهن','role'=>'بازرس مقیم خط'],
 ['id'=>'h','location'=>'باب الجواد','role'=>'بازرس خط'],
 ['id'=>'i','location'=>'بازرسین مناطق تاکسیرانی','role'=>'','combined'=>true],
];
$people=[
 ['id'=>51,'region'=>'مبادی ورودی','role'=>'سربازرس'],
 ['id'=>52,'region'=>'فرودگاه','role'=>'بازرس مقیم','rotation'=>'morning'],
 ['id'=>53,'region'=>'فرودگاه','role'=>'بازرس مقیم','rotation'=>'night'],
 ['id'=>54,'region'=>'فرودگاه','role'=>'ناظر خط','rotation'=>'10'],
 ['id'=>55,'region'=>'فرودگاه','role'=>'ناظر خط','rotation'=>'15'],
 ['id'=>56,'region'=>'پایانه مسافربری','role'=>'اپراتور','rotation'=>'morning'],
 ['id'=>57,'region'=>'راه آهن','role'=>'بازرس مقیم'],
 ['id'=>58,'region'=>'ثامن','role'=>'سر بازرس'],
 ['id'=>59,'region'=>'غرب','role'=>'گشت خودرویی'],
];
$r=OrganizationWorkPlacement::suggest($slots,$people);
checkPlacement(count($r['unassigned'])===0);
checkPlacement($r['assignments']['e']===55&&$r['assignments']['f']===56&&$r['assignments']['g']===57&&$r['assignments']['h']===58&&$r['assignments']['i']===59);
checkPlacement(OrganizationWorkPlacement::isSenior('سر بازرس منطقه')&&!OrganizationWorkPlacement::isSenior('بازرس مقیم'));
$r=OrganizationWorkPlacement::suggest([['id'=>'1','location'=>'راه آهن','role'=>'ناظر خط'],['id'=>'2','location'=>'راه آهن','role'=>'ناظر خط']],[
 ['id'=>62,'location'=>'راه آهن','role'=>'ناظر خط','last_name'=>'تقی زاده'],
 ['id'=>63,'location'=>'راه آهن','role'=>'ناظر خط','last_name'=>'پورمحمدی']
]);
checkPlacement($r['assignments'][1]===63&&$r['assignments'][2]===62);

$slots=[
 ['id'=>'in','location'=>'فرودگاه','role'=>'اپراتور فاکتور سفر داخلی نوبت کاری ۱۵٪','rotation'=>'15'],
 ['id'=>'out','location'=>'فرودگاه','role'=>'اپراتور فاکتور سفر خارجی نوبت کاری ۱۰٪','rotation'=>'10'],
 ['id'=>'hall','location'=>'پایانه مسافربری','role'=>'اپراتور فاکتور سفر داخل سالن'],
 ['id'=>'ordinary','location'=>'پایانه مسافربری','role'=>'اپراتور فاکتور سفر'],
 ['id'=>'rail1','location'=>'راه آهن','role'=>'بازرس مقیم خط'],
 ['id'=>'rail2','location'=>'راه آهن','role'=>'بازرس مقیم خط'],
];
$people=[
 ['id'=>71,'region'=>'فرودگاه','role'=>'اپراتور','rotation'=>'15'],
 ['id'=>72,'region'=>'فرودگاه','role'=>'اپراتور','rotation'=>'10'],
 ['id'=>73,'region'=>'پایانه مسافربری','role'=>'اپراتور','rotation'=>'morning'],
 ['id'=>74,'region'=>'راه آهن','role'=>'بازرس مقیم','rotation'=>'morning','last_name'=>'تقی زاده'],
 ['id'=>75,'region'=>'راه آهن','role'=>'بازرس مقیم','rotation'=>'afternoon','last_name'=>'احمدی'],
 ['id'=>76,'region'=>'فرودگاه','role'=>'اپراتور','rotation'=>''],
];
$r=OrganizationWorkPlacement::suggest($slots,$people);
checkPlacement($r['assignments']===['in'=>71,'out'=>72,'hall'=>73,'ordinary'=>null,'rail1'=>75,'rail2'=>74]);
checkPlacement($r['unmatched']===[76]);
echo "Airport operators, terminal hall and railway inspectors OK\n";

$slots=[
 ['id'=>'mobile1','location'=>'ناظر خطوط گردشی','role'=>'','combined'=>true],
 ['id'=>'mobile2','location'=>'ناظر خطوط گردشی','role'=>'','combined'=>true],
 ['id'=>'mobile3','location'=>'ناظر خطوط گردشی','role'=>'','combined'=>true],
 ['id'=>'east','location'=>'طبرسی','role'=>'بازرس خط'],
];
$people=[
 ['id'=>81,'region'=>'شرق','role'=>'سربازرس ارشد','last_name'=>'تقی زاده'],
 ['id'=>82,'region'=>'شرکت','role'=>'نیروی اداری ارشد','last_name'=>'احمدی'],
 ['id'=>83,'region'=>'غرب','role'=>'گشت موتوری','last_name'=>'پورمحمدی'],
 ['id'=>84,'region'=>'شرق','role'=>'سربازرس'],
];
$r=OrganizationWorkPlacement::suggest($slots,$people);
checkPlacement($r['assignments']===['mobile1'=>82,'mobile2'=>83,'mobile3'=>81,'east'=>84]);
checkPlacement(OrganizationWorkPlacement::rowColor('سربازرس ارشد')==='FFC6EFCE');
checkPlacement(OrganizationWorkPlacement::rowColor('سر بازرس')==='FFC6EFCE');
checkPlacement(OrganizationWorkPlacement::rowColor('نیروی اداری ارشد')==='FFBDD7EE');
checkPlacement(OrganizationWorkPlacement::rowColor('گشت موتوری')===null);
echo "Senior staff placement and colors OK\n";

$slots=[
 ['id'=>'and','location'=>'اندرزگو','role'=>'بازرس خط'],
 ['id'=>'jaw','location'=>'باب‌الجواد','role'=>'بازرس خط']
];
$people=[
 ['id'=>91,'region'=>'ثامن','role'=>'سربازرس'],
 ['id'=>92,'location'=>'خط اندرزگو','role'=>'بازرس خط']
];
$r=OrganizationWorkPlacement::suggest($slots,$people);
checkPlacement(array_values($r['assignments'])===[91,92]||array_values($r['assignments'])===[92,91]);
$r=OrganizationWorkPlacement::suggest([['id'=>'jaw','location'=>'باب الجواد','role'=>'بازرس خط']], [['id'=>93,'location'=>'اندرزگو','role'=>'بازرس خط']]);
checkPlacement($r['assignments']['jaw']===93);
echo "Andarzgoo and Bab-al-Javad alias OK\n";

$slots=[
 ['id'=>'preferred','location'=>'فرودگاه','role'=>'اپراتور'],
 ['id'=>'alternative','location'=>'مرکز','role'=>'اپراتور']
];
$people=[
 ['id'=>201,'region'=>'فرودگاه','location'=>'مرکز','role'=>'اپراتور','last_name'=>'احمدی'],
 ['id'=>202,'region'=>'فرودگاه','role'=>'اپراتور','last_name'=>'زارعی'],
];
$r=OrganizationWorkPlacement::suggest($slots,$people);
checkPlacement($r['assignments']===['preferred'=>202,'alternative'=>201]);
checkPlacement($r['overflow']===[]&&$r['unmatched']===[]);
echo "Fallback position preserves full placement coverage OK\\n";
