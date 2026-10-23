<?php
function syntheticOrganization($path,$mutate=null){
  $ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  $data=['A1'=>'کارکرد مهر 1405','C2'=>'سمت','E2'=>'نام','F2'=>'نام خانوادگی','G2'=>'شماره پرسنلی','H3'=>'ساعت جمعه کاری','I3'=>'ساعت تعطیل کاری','J3'=>'اضافه کاری','B4'=>'ناظر','E4'=>'آزمایشی','F4'=>'یک','G4'=>'0005','H4'=>'0','I4'=>'1.5','J4'=>'07:33','E6'=>'آزمایشی','F6'=>'دو','G6'=>'0006','H6'=>'2','I6'=>'0','J6'=>'3'];
  $xml='<worksheet xmlns="'.$ns.'"><sheetData>';
  foreach([1,2,3,4,6] as $n){$xml.='<row r="'.$n.'">';foreach($data as $ref=>$value)if((int)preg_replace('/\D/','',$ref)===$n)$xml.='<c r="'.$ref.'" t="inlineStr"><is><t>'.htmlspecialchars($value,ENT_XML1|ENT_QUOTES,'UTF-8').'</t></is></c>';$xml.='</row>';}
  $xml.='</sheetData><mergeCells count="1"><mergeCell ref="B4:C6"/></mergeCells></worksheet>';
  if($mutate)$xml=$mutate($xml);
  $z=new ZipArchive();$z->open($path,ZipArchive::CREATE|ZipArchive::OVERWRITE);
  $z->addFromString('xl/workbook.xml','<workbook xmlns="'.$ns.'" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Source" sheetId="1" r:id="rId5"/></sheets></workbook>');
  $z->addFromString('xl/_rels/workbook.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId5" Target="worksheets/custom.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/></Relationships>');
  $z->addFromString('xl/worksheets/custom.xml',$xml);$z->close();
}
