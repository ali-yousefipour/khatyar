<?php
require_once __DIR__.'/../lib/WorkContracts.php';
function verify_contract($pass,$label){if(!$pass)throw new RuntimeException($label);}
$source=WorkContracts::defaultHtml();
foreach(['شرکت سعید توس عدل','۱۲) شرایط فسخ قرارداد','{{full_name}}','{{national_code}}','{{start_date}}','{{end_date}}','{{duration_label}}','{{bank_account}}','محل امضای کارگر'] as $field)
 verify_contract(strpos($source,$field)!==false,'Default contract missing: '.$field);
$method=new ReflectionMethod(WorkContracts::class,'render');
$render=$method->invoke(null,'<b>{{full_name}}</b> — {{start_date}}',['full_name'=>'آزمایش <script>alert(1)</script>','start_date'=>'1405-08-01']);
verify_contract(strpos($render,'<script>')===false,'Contract user data must not run HTML');
verify_contract(strpos($render,'&lt;script&gt;')!==false,'Escaping should preserve visible user data');
if(class_exists('ZipArchive') && class_exists('DOMDocument')){
 $tmp=tempnam(sys_get_temp_dir(),'wct');$zip=new ZipArchive();$zip->open($tmp,ZipArchive::OVERWRITE);
 $xml='<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>کد ملی: {{national_</w:t></w:r><w:r><w:t>code}}</w:t></w:r></w:p><w:p><w:r><w:t>{{full_name}}</w:t></w:r></w:p></w:body></w:document>';
 $zip->addFromString('word/document.xml',$xml);$zip->close();
 $method=new ReflectionMethod(WorkContracts::class,'docxReplace');
 $result=$method->invoke(null,file_get_contents($tmp),['national_code'=>'0012345678','full_name'=>'علی']);
 unlink($tmp);$out=tempnam(sys_get_temp_dir(),'wco');file_put_contents($out,$result);
 $read=new ZipArchive();verify_contract($read->open($out)===true,'DOCX remains ZIP');
 $body=$read->getFromName('word/document.xml');$read->close();unlink($out);
 $dom=new DOMDocument();verify_contract($dom->loadXML($body),'DOCX result remains XML');
 verify_contract(strpos($body,'0012345678')!==false && strpos($body,'علی')!==false,'Split Word tokens are substituted');
 verify_contract(strpos($body,'{{')===false,'No unresolved placeholders in fixture');
}
echo "PASS work contracts: supplied default clauses, safe snapshots, optional DOCX split-run replacement\n";
