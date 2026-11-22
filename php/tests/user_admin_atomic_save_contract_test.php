<?php
declare(strict_types=1);
$index=(string)file_get_contents(__DIR__.'/../app/index.php');
$panel=(string)file_get_contents(__DIR__.'/../tools/panel_source.jsx');
$start=strpos($index,'// Unified admin edit: core user fields, employment dates, and custom');
$end=$start===false?false:strpos($index,'$result = $originalHandler($params,$body,$user);',$start+120);
if($start===false||$end===false)throw new RuntimeException('Unified admin save handler not found');
$code=substr($index,$start,$end-$start);
foreach([
 "array_key_exists('custom_values',\$body)",
 '$pdo->beginTransaction()',
 '$result=$originalHandler($params,$body,$user)',
 '_save_custom_values($targetId,$custom,false)',
 "if(!empty(\$updates))Db::run",
 '$pdo->commit()',
 '$pdo->rollBack()',
 'information_schema.columns',
 'SELECT id FROM users WHERE id=?'
] as $contract){
  if(!str_contains($code,$contract))throw new RuntimeException('Atomic save contract missing: '.$contract);
}
$source=strpos($panel,"function Users(){");
if($source===false)throw new RuntimeException('Users editor not found');
$editor=substr($panel,$source,25000);
if(!str_contains($editor,"custom_values:customChanges")||
   !str_contains($editor,"customSaveRef.current('payload')"))
  throw new RuntimeException('Panel still submits user and custom values separately');
if(str_contains($editor,"const customSaved=await customSaveRef.current()"))
  throw new RuntimeException('Legacy second save request still active');
echo "PASS unified admin personnel update transaction contract\n";
