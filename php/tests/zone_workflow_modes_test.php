<?php
declare(strict_types=1);
class Http {static function error($message,$status){throw new RuntimeException($message,$status);}}
class Db {
  public static array $people=[
    1=>['id'=>1,'is_active'=>1,'role_title'=>'سربازرس'],
    2=>['id'=>2,'is_active'=>1,'role_title'=>'بازرس'],
    3=>['id'=>3,'is_active'=>1,'role_title'=>'سربازرس ارشد'],
    4=>['id'=>4,'is_active'=>1,'role_title'=>'رییس اداره بازرسی'],
    5=>['id'=>5,'is_active'=>1,'role_title'=>'نیروی اداری'],
    6=>['id'=>6,'is_active'=>0,'role_title'=>'بازرس'],
    7=>['id'=>7,'is_active'=>1,'role_title'=>'بازرس'],
    8=>['id'=>8,'is_active'=>1,'role_title'=>'معاونت بازرسی','first_name'=>'معاون'],
    9=>['id'=>9,'is_active'=>1,'role_title'=>'بازرس گشت خودرویی','first_name'=>'علی','last_name'=>'نمونه'],
  ];
  public static array $workflow=[];
  public static array $writes=[];
  public static function run($sql,$args=[]){
    self::$writes[]=['sql'=>$sql,'args'=>$args];
    if(str_contains($sql,'INSERT INTO zone_workflows')){
      self::$workflow[(int)$args[0]]=['zone_id'=>(int)$args[0],'mode'=>$args[1],
        'admin_reviewer_id'=>$args[2],'to_chief'=>$args[3],'to_head'=>$args[4]];
    }
    return null;
  }
  public static function one($sql,$args=[]){
    if(str_contains($sql,'FROM zone_workflows'))return self::$workflow[(int)$args[0]]??null;
    if(str_contains($sql,'FROM users u LEFT JOIN roles r') || str_contains($sql,'FROM users u JOIN roles r'))return self::$people[(int)$args[0]]??null;
    return null;
  }
  public static function all($sql,$args=[]){
    if(str_contains($sql,'FROM users u JOIN roles r'))
      return array_values(array_filter(self::$people,fn($u)=>!empty($u['is_active'])));
    return [];
  }
}
require_once __DIR__.'/../lib/OrgChart.php';
require_once __DIR__.'/../lib/ZoneWorkflow.php';
function checkMode(bool $ok,string $why){if(!$ok)throw new RuntimeException($why);}
function invalid($payload){try{ZoneWorkflow::validate($payload);}catch(RuntimeException $e){checkMode($e->getCode()===422,'Expected 422');return;}throw new RuntimeException('Invalid workflow unexpectedly accepted');}
invalid([]);
invalid(['workflow_mode'=>'administrative','to_chief'=>false,'to_head'=>false]);
invalid(['workflow_mode'=>'inspection','senior_user_id'=>1,'inspector_ids'=>[]]);
invalid(['workflow_mode'=>'inspection','senior_user_id'=>3,'inspector_ids'=>[2]]);
invalid(['workflow_mode'=>'inspection','senior_user_id'=>1,'inspector_ids'=>[6]]);
invalid(['workflow_mode'=>'administrative','admin_reviewer_id'=>6,'to_chief'=>false,'to_head'=>false]);
invalid(['workflow_mode'=>'inspection','senior_user_id'=>1,'inspector_ids'=>[8]]);
$vehicleInspector=ZoneWorkflow::validate(['workflow_mode'=>'inspection','senior_user_id'=>1,'inspector_ids'=>[9]]);
checkMode($vehicleInspector['inspector_ids']===[9],'Vehicle patrol inspector is eligible');
try{
  ZoneWorkflow::validate(['workflow_mode'=>'inspection','senior_user_id'=>1,'inspector_ids'=>[8]]);
  throw new RuntimeException('Invalid office supervisor accepted');
}catch(RuntimeException $e){
  checkMode($e->getCode()===422 && str_contains($e->getMessage(),'شناسه 8'),'Invalid inspector response identifies the actual user');
}
$inspection=ZoneWorkflow::validate(['workflow_mode'=>'inspection','senior_user_id'=>1,'inspector_ids'=>[2,7]]);
checkMode($inspection['mode']==='inspection'&&$inspection['to_chief']&&$inspection['to_head'],'Inspection chain mandatory role stages');
$office=ZoneWorkflow::validate(['workflow_mode'=>'administrative','admin_reviewer_id'=>5,'to_chief'=>false,'to_head'=>true]);
checkMode($office['mode']==='administrative'&&!$office['to_chief']&&$office['to_head'],'Administrative toggles preserved');
checkMode(count(Db::$writes)===0,'Existing workflow schema is read without DDL');
ZoneWorkflow::write(202,$office,1);
checkMode(ZoneWorkflow::chain(202)===[5,4],'Saved administrative workflow keeps reviewer and head, skipping chief');
checkMode((int)Db::$workflow[202]['to_chief']===0,'Disabled chief persisted as zero');
Db::$workflow[101]=['zone_id'=>101,'mode'=>'administrative','admin_reviewer_id'=>5,'to_chief'=>0,'to_head'=>1];
checkMode(ZoneWorkflow::chain(101)===[5,4],'Configured administrative reviewer forwards to head without chief');
Db::$workflow[101]['to_head']=0;Db::$workflow[101]['to_chief']=1;
checkMode(ZoneWorkflow::chain(101)===[5,3],'Optional chief without head');
Db::$workflow[101]['admin_reviewer_id']=null;
checkMode(ZoneWorkflow::chain(101)===[3],'Chief-only administrative approval');
checkMode(ZoneWorkflow::config(999)===null,'No implicit workflow for unconfigured region');
echo "PASS explicit region workflow configuration and admin review chains\n";
