<?php
declare(strict_types=1);
date_default_timezone_set('Asia/Tehran');
class Http {
    public static function error(string $message,int $status=400): void { throw new RuntimeException($message,$status); }
}
require_once __DIR__.'/../lib/LeaveSubstituteCoverage.php';
$method=new ReflectionMethod(LeaveSubstituteCoverage::class,'day');
$cases=[
    ['1403-12-30','1403-12-30'],
    ['1404-12-30',null],
    ['1405-07-31',null],
    ['1405-06-31','1405-06-31'],
    ['1405/09/1','1405-09-01'],
    ['1405-09-31',null],
    ['1405-00-01',null],
    ['1405-13-01',null],
    ['1405-09-00',null],
];
foreach($cases as [$day,$expected]){
    $actual=$method->invoke(null,$day);
    if($actual!==$expected)throw new RuntimeException('Jalali replacement date validation failed: '.$day.' expected='.var_export($expected,true).' actual='.var_export($actual,true));
    echo 'PASS replacement date '.$day."\n";
}
$_GET=['dates'=>'1405-01-01,1405-03-01'];
try {
    LeaveSubstituteCoverage::status(1);
    throw new LogicException('Sparse multi-month calendar was accepted');
} catch(RuntimeException $e) {
    if($e->getCode()!==422)throw $e;
    echo "PASS distant sparse calendar range rejected before database scan\n";
}
echo "Substitute Jalali month and leap-year validation passed\n";
