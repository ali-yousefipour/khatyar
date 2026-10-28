<?php
require_once __DIR__.'/../lib/WorkContracts.php';
function ensureContract($ok,$message){if(!$ok)throw new RuntimeException($message);}
$src=file_get_contents(__DIR__.'/../lib/WorkContracts.php');
$ui=file_get_contents(__DIR__.'/../app/assets/work-contracts-admin.js');
foreach(["work_contract_audit","deleted_at","/api/admin/work-contracts/{id}","'updated'","'deleted'","docxHtml("] as $required)
  ensureContract(strpos($src,$required)!==false,'Missing contract feature: '.$required);
foreach(["data-action=\"edit\"","data-action=\"delete\"","async function saveEdit()","async function deleteContract("] as $required)
  ensureContract(strpos($ui,$required)!==false,'Missing contract interface: '.$required);
if(class_exists('ZipArchive')&&class_exists('DOMDocument')){
  $temp=tempnam(sys_get_temp_dir(),'wct');
  $zip=new ZipArchive();$zip->open($temp,ZipArchive::OVERWRITE);
  $xml='<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>قراردادکار\\n1)مشخصات طرفین:\\nفرزند: مهدی\\n7) حق السعی</w:t></w:r></w:p></w:body></w:document>';
  $zip->addFromString('word/document.xml',$xml);$zip->close();
  $method=new ReflectionMethod(WorkContracts::class,'docxHtml');
  $html=$method->invoke(null,file_get_contents($temp));unlink($temp);
  ensureContract(strpos($html,'<h1>')!==false,'Contract title must be a heading');
  ensureContract(strpos($html,'<h3>')!==false,'Numbered article must be a heading');
  ensureContract(strpos($html,'wc-page-break')!==false,'Second page break must be preserved');
  ensureContract(strpos($html,'\\n')===false,'No literal backslash-n tokens in HTML');
}
echo "PASS work-contract print structure, edit/delete and audit regression\n";
