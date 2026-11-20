<?php
/**
 * Imports only staff positioning from a prior organization work report.
 * No attendance amounts, payroll data or workbook formulas are persisted.
 */
final class WorkReportDefaultPlacement {
    public static function normalize($value): string {
        return trim(preg_replace('/\s+/u',' ',strtr((string)$value,[
            'ي'=>'ی','ك'=>'ک','‌'=>' ','۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9',
            '٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9'
        ]))??'');
    }
    public static function read(string $file,array $structure): array {
        if(!class_exists('ZipArchive')||!class_exists('DOMDocument'))throw new RuntimeException('XLSX extensions are unavailable');
        $zip=new ZipArchive();
        if($zip->open($file)!==true)throw new InvalidArgumentException('فایل اکسل قابل خواندن نیست');
        try{
            $path=$structure['sheet_path']??'';
            if(!preg_match('~^xl/worksheets/sheet[0-9]+\.xml$~D',$path))throw new InvalidArgumentException('مسیر شیت معتبر نیست');
            $xml=$zip->getFromName($path);
            if($xml===false||strlen($xml)>16000000)throw new InvalidArgumentException('شیت گزارش پیدا نشد یا بیش از حد بزرگ است');
            $shared=[];
            $str=$zip->getFromName('xl/sharedStrings.xml');
            if($str!==false){
                if(strlen($str)>16000000)throw new InvalidArgumentException('فهرست متن فایل بیش از حد بزرگ است');
                $doc=new DOMDocument();$doc->loadXML($str,LIBXML_NONET);
                foreach($doc->getElementsByTagNameNS('*','si') as $si){
                    $v='';foreach($si->getElementsByTagNameNS('*','t') as $t)$v.=$t->textContent;$shared[]=$v;
                }
            }
            $doc=new DOMDocument();if(!$doc->loadXML($xml,LIBXML_NONET))throw new InvalidArgumentException('ساختار اکسل نامعتبر است');
            $values=[];
            foreach($doc->getElementsByTagNameNS('*','c') as $cell){
                $ref=$cell->getAttribute('r');
                $v=$cell->getElementsByTagNameNS('*','v')->item(0)?->textContent??'';
                if($cell->getAttribute('t')==='s')$v=$shared[(int)$v]??'';
                if($cell->getAttribute('t')==='inlineStr'){
                    $v='';foreach($cell->getElementsByTagNameNS('*','t') as $t)$v.=$t->textContent;
                }
                $values[$ref]=self::normalize($v);
            }
            $columns=$structure['columns'];
            $rows=[];
            foreach($structure['slots'] as $slot){
                $row=(int)$slot['row'];$id=(string)$slot['id'];
                $first=$values[$columns['first_name'].$row]??'';
                $last=$values[$columns['last_name'].$row]??'';
                $code=$values[$columns['personnel_code'].$row]??'';
                if($code===''&&$first===''&&$last==='')continue;
                if($last==='')continue;
                $rows[]=['slot_id'=>$id,'personnel_code'=>$code,'first_name'=>$first,'last_name'=>$last];
            }
            return $rows;
        }finally{$zip->close();}
    }
    public static function apply(array $slots,array $people,array $automatic,array $saved): array {
        $byCode=[];$byName=[];
        foreach($people as $person){
            $code=self::normalize($person['personnel_code']??'');
            $name=self::normalize(($person['first_name']??'').' '.($person['last_name']??''));
            if($code!=='')$byCode[$code][]=(int)$person['id'];
            if($name!=='')$byName[$name][]=(int)$person['id'];
        }
        $slotIds=array_fill_keys(array_map(static fn($s)=>(string)$s['id'],$slots),true);
        $preferred=[];$used=[];$uncertain=[];
        foreach($saved as $entry){
            $slot=(string)$entry['slot_id'];
            if(!isset($slotIds[$slot]))continue;
            $code=self::normalize($entry['personnel_code']??'');
            $name=self::normalize(($entry['first_name']??'').' '.($entry['last_name']??''));
            $matches=$code!==''?($byCode[$code]??[]):($byName[$name]??[]);
            if(count($matches)!==1||isset($used[$matches[0]])){
                $uncertain[]=$entry;continue;
            }
            $preferred[$slot]=$matches[0];$used[$matches[0]]=true;
        }
        $assign=$automatic['assignments'];
        foreach($assign as $slot=>$person)if($person!==null&&isset($used[$person]))$assign[$slot]=null;
        foreach($preferred as $slot=>$person)$assign[$slot]=$person;
        // Keep unrelated automatic placements only when their slot is still vacant.
        $remaining=[];
        foreach($assign as $slot=>$person)if($person!==null&&!isset($preferred[$slot]))$remaining[$person]=$slot;
        foreach($automatic['assignments'] as $slot=>$person){
            if($person===null||isset($used[$person])||isset($remaining[$person]))continue;
            if(($assign[$slot]??null)===null){$assign[$slot]=$person;$remaining[$person]=$slot;}
        }
        $validated=OrganizationWorkPlacement::validate($slots,$people,$assign);
        return $validated+['unmatched'=>array_values(array_intersect($validated['unassigned'],$automatic['unmatched'])),'overflow'=>array_values(array_diff($validated['unassigned'],$automatic['unmatched'])),'manual_review'=>$uncertain,'reused_count'=>count($preferred)];
    }
}
