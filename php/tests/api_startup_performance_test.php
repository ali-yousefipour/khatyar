<?php
// Regression: routine calls to every site/app API must not execute contract
// schema migrations or forms route wrapping.
$entry=file_get_contents(__DIR__.'/../app/index.php');
$contracts=file_get_contents(__DIR__.'/../lib/WorkContracts.php');
$forms=file_get_contents(__DIR__.'/../lib/KhatyarFormsSchema.php');
function checkPerf($ok,$message){if(!$ok)throw new RuntimeException($message);}
checkPerf(strpos($entry,"if (strpos(\$path,'/api/admin/work-contracts')===0)")!==false,'Contracts must load only on matching request');
checkPerf(strpos($entry,"if (preg_match('~^/api/(?:admin/")!==false,'Forms route adapter must be restricted to forms requests');
checkPerf(strpos($contracts,"work_contract_schema_ready_v2")!==false,'Contract schema must have a durable ready marker');
$check=strpos($contracts,"if((string)(\$marker['value']??'')==='verified')");
$ddl=strpos($contracts,'CREATE TABLE IF NOT EXISTS work_contract_templates');
checkPerf($check!==false&&$ddl!==false&&$check<$ddl,'Contract schema ready guard must be before DDL');
checkPerf(strpos($forms,"forms_schema_ready_v2")!==false,'Forms migration marker must remain active');
echo "PASS no repeated contract DDL and forms migration on general API requests\n";
