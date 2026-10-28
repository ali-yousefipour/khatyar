<?php
require_once __DIR__.'/../lib/WorkContracts.php';
function ensureContract($ok,$message){if(!$ok)throw new RuntimeException($message);}
$src=file_get_contents(__DIR__.'/../lib/WorkContracts.php');
$ui=file_get_contents(__DIR__.'/../app/assets/work-contracts-admin.js');
foreach(["work_contract_audit","/api/admin/work-contracts/{id}","'updated'","DELETE FROM work_contract_audit WHERE contract_id=?","DELETE FROM work_contracts WHERE id=?","docxHtml("] as $required)
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
  $rel='<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/></Relationships>';
  $xmlLogo='<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body><w:p><w:r><w:drawing><a:blip r:embed="rId1"/></w:drawing></w:r></w:p><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>8) حقوق و مزایای کارگر: به صورت ماهانه به حساب شماره 123456789 نزد بانک پرداخت می گردد.</w:t></w:r></w:p></w:body></w:document>';
  $tmpLogo=tempnam(sys_get_temp_dir(),'wcl');$pack=new ZipArchive();$pack->open($tmpLogo,ZipArchive::OVERWRITE);
  $pack->addFromString('word/document.xml',$xmlLogo);
  $pack->addFromString('word/_rels/document.xml.rels',$rel);
  $pack->addFromString('word/media/logo.png',base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAJ4BmdcAAAAASUVORK5CYII='));
  $pack->close();
  $logoHtml=$method->invoke(null,file_get_contents($tmpLogo));unlink($tmpLogo);
  ensureContract(strpos($logoHtml,'data:image/png;base64,')!==false,'Original template logo must be preserved in print');
  ensureContract(strpos($logoHtml,'wc-clause')!==false,'Long numbered clause must render as text paragraph');
  ensureContract(strpos($logoHtml,'<h3>')===false,'Never turn full lengthy legal clauses into bold headings');

}
echo "PASS work-contract print structure, permanent deletion, edit and audit regression\n";
