<?php
final class WorkReportReadScope {
  private static int $depth=0;
  private static array $values=[];
  private static int $totalsDepth=0;
  public static function active(): bool {return self::$depth>0;}
  public static function totalsOnly(): bool {return self::$totalsDepth>0;}
  public static function totals(callable $fn){self::$totalsDepth++;try{return self::run($fn);}finally{self::$totalsDepth--;}}
  public static function run(callable $fn){
    self::$depth++;
    try{return $fn();}finally{if(--self::$depth===0)self::$values=[];}
  }
  public static function remember(string $key,callable $fn){
    if(!self::$depth)return $fn();
    if(!array_key_exists($key,self::$values))self::$values[$key]=$fn();
    return self::$values[$key];
  }
}
