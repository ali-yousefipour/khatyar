<?php
/* خطیار — Compatibility entrypoint + Jalali conversion shim for the schema-safe attendance report endpoint. */
/*
 * Some production builds do not load the legacy global Jalali helpers before
 * ShiftCalc/admin-attendance-report-fast-safe-v2.php. Define the compatible
 * functions here so the endpoint remains self-contained and predictable.
 */
if (!function_exists('jalali_to_gregorian')) {
  function jalali_to_gregorian($jy,$jm,$jd){
    $jy=(int)$jy-979; $jm=(int)$jm-1; $jd=(int)$jd-1;
    $jdn=365*$jy+intdiv($jy,33)*8+intdiv(($jy%33+3),4);
    $md=[31,31,31,31,31,31,30,30,30,30,30,29];
    for($i=0;$i<$jm;$i++) $jdn += $md[$i];
    $jdn += $jd;
    $g=$jdn+79;
    $gy=1600+400*intdiv($g,146097); $g%=146097; $leap=true;
    if($g>=36525){$g--; $gy+=100*intdiv($g,36524); $g%=36524; if($g>=365)$g++; else $leap=false;}
    $gy+=4*intdiv($g,1461); $g%=1461;
    if($g>=366){$leap=false; $g--; $gy+=intdiv($g,365); $g%=365;}
    $gd=[31,($leap?29:28),31,30,31,30,31,31,30,31,30,31];
    $gm=0;
    for(;$gm<12&&$g>=$gd[$gm];$gm++) $g-=$gd[$gm];
    return [$gy,$gm+1,$g+1];
  }
}
if (!function_exists('gregorian_to_jalali')) {
  function gregorian_to_jalali($gy,$gm,$gd){
    $gdm=[0,31,59,90,120,151,181,212,243,273,304,334];
    $gy2=(int)$gy-1600; $gm2=(int)$gm-1; $gd2=(int)$gd-1;
    $gdn=365*$gy2+intdiv($gy2+3,4)-intdiv($gy2+99,100)+intdiv($gy2+399,400)+$gdm[$gm2]+$gd2;
    if($gm2>1&&(((int)$gy%4===0&&(int)$gy%100!==0)||((int)$gy%400===0))) $gdn++;
    $jdn=$gdn-79;
    $jy=979+33*intdiv($jdn,12053); $jdn%=12053;
    $jy+=4*intdiv($jdn,1461); $jdn%=1461;
    if($jdn>=366){$jy+=intdiv($jdn-1,365); $jdn=($jdn-1)%365;}
    $jm=$jdn<186?1+intdiv($jdn,31):7+intdiv($jdn-186,30);
    $jd=1+($jdn<186?$jdn%31:($jdn-186)%30);
    return [$jy,$jm,$jd];
  }
}
require __DIR__ . '/admin-attendance-report-fast-safe-v2.php';
