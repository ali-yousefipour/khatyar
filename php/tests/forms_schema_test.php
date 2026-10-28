<?php
// Regression: schema drift must be repaired before form list/create reads.
class Db {
  public static $tables=['custom_forms'=>true,'form_submissions'=>true];
  public static $columns=[
    'custom_forms'=>['id'=>true,'title'=>true,'schema'=>true,'is_active'=>true],
    'form_submissions'=>['id'=>true,'form_id'=>true,'user_id'=>true,'driver_id'=>true,'answers'=>true,'created_at'=>true],
  ];
  public static $indexes=[];
  public static $queries=[];
  public static $fail=false;
  public static $settings=[];
  public static function one($sql,$args=[]) {
    if(strpos($sql,'FROM app_settings')!==false)return isset(self::$settings[$args[0]])?['value'=>self::$settings[$args[0]]]:null;
    if(strpos($sql,'information_schema.TABLES')!==false)return ['n'=>isset(self::$tables[$args[0]])?1:0];
    if(strpos($sql,'information_schema.STATISTICS')!==false)return ['n'=>isset(self::$indexes[$args[0]][$args[1]])?1:0];
    if(strpos($sql,'IS_NULLABLE')!==false)return ['n'=>'YES'];
    throw new RuntimeException('Unexpected SQL: '.$sql);
  }
  public static function all($sql,$args=[]) {
    if(strpos($sql,'information_schema.COLUMNS')===false)throw new RuntimeException('Unexpected columns SQL');
    return array_map(static fn($name)=>['name'=>$name],array_keys(self::$columns[$args[0]]??[]));
  }
  public static function run($sql,$args=[]) {
    if(self::$fail)throw new RuntimeException('Mock SQL permission denied');
    self::$queries[]=$sql;
    if(strpos($sql,'INSERT INTO app_settings')!==false)self::$settings[$args[0]]=$args[1];
    if(preg_match('/ALTER TABLE (custom_forms|form_submissions) ADD COLUMN `(\w+)`/',$sql,$m))self::$columns[$m[1]][$m[2]]=true;
    if(strpos($sql,'MODIFY COLUMN user_id')!==false)self::$columns['form_submissions']['user_id']=true;
    if(strpos($sql,'ADD UNIQUE KEY public_slug_uq')!==false)self::$indexes['custom_forms']['public_slug_uq']=true;
  }
}
class Http {
  public static function error($message,$code){throw new RuntimeException("HTTP $code: ".$message);}
}
require_once __DIR__.'/../lib/KhatyarFormsSchema.php';
KhatyarFormsSchema::ensure();
foreach(['public_enabled','public_slug'] as $c)if(!isset(Db::$columns['custom_forms'][$c]))throw new RuntimeException('Missing '.$c);
foreach(['is_public','submitter_name','submitter_mobile'] as $c)if(!isset(Db::$columns['form_submissions'][$c]))throw new RuntimeException('Missing '.$c);
$count=count(Db::$queries);
KhatyarFormsSchema::ensure();
if(count(Db::$queries)!==$count)throw new RuntimeException('Schema check is not idempotent');
if($count<5)throw new RuntimeException('Expected actual migration of old database');
if((Db::$settings['forms_schema_ready_v2']??'')!=='verified')throw new RuntimeException('Migration marker must be persisted after successful verification');
$indexSource=file_get_contents(__DIR__.'/../app/index.php');
if(strpos($indexSource,'KhatyarFormsSchema::ensure()')===false)throw new RuntimeException('API handler missing forms schema enforcement');
echo "PASS forms: old schema migration, required columns, idempotence, authenticated/public route guard\n";
