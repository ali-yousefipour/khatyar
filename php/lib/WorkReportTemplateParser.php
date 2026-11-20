<?php
require_once __DIR__.'/WorkReportTemplateArchive.php';
require_once __DIR__.'/OrganizationWorkPlacement.php';
/** Extract explicit, reviewed column mappings from an original XLSX package. */
final class WorkReportTemplateParser {
    public static function parse(string $file,array $mapping): array {
        $info=WorkReportTemplateArchive::inspect($file);
        $columns=$mapping['columns']??[];
        foreach(['location','role','first_name','last_name','personnel_code','friday','holiday','overtime','ordinal'] as $key)
            if(!isset($columns[$key]))throw new InvalidArgumentException('Missing column: '.$key);
        foreach($columns as $col)if(!is_string($col)||!preg_match('/^[A-Z]{1,3}$/D',$col))throw new InvalidArgumentException('Invalid column');
        if(count(array_unique($columns))!==count($columns))throw new InvalidArgumentException('Duplicate columns');
        $start=filter_var($mapping['first_row']??null,FILTER_VALIDATE_INT);
        $end=filter_var($mapping['last_row']??null,FILTER_VALIDATE_INT);
        if(!$start||!$end||$start<2||$end<$start||$end>100000||$end-$start>=5000)throw new InvalidArgumentException('Invalid row range');
        $name=$mapping['sheet']??'';
        $zip=new ZipArchive();
        if($zip->open($file)!==true)throw new RuntimeException('Cannot open workbook');
        try{
            $book=WorkReportTemplateArchive::xml($zip,'xl/workbook.xml');
            $rels=WorkReportTemplateArchive::xml($zip,'xl/_rels/workbook.xml.rels');
            $rid=null;
            foreach($book->getElementsByTagNameNS('*','sheet') as $node)if($node->getAttribute('name')===$name)$rid=$node->getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
            if(!$rid)throw new InvalidArgumentException('Unknown sheet');
            $path=null;
            foreach($rels->getElementsByTagNameNS('*','Relationship') as $rel)if($rel->getAttribute('Id')===$rid&&str_ends_with($rel->getAttribute('Type'),'/worksheet')){
                $target=$rel->getAttribute('Target');
                $path=str_starts_with($target,'/')?ltrim($target,'/'):'xl/'.$target;
            }
            if(!$path||!preg_match('~^xl/worksheets/[A-Za-z0-9_.-]+\.xml$~D',$path))throw new InvalidArgumentException('Invalid worksheet relationship');
            $shared=[];
            if($zip->locateName('xl/sharedStrings.xml')!==false){
                $strings=WorkReportTemplateArchive::xml($zip,'xl/sharedStrings.xml');
                foreach($strings->getElementsByTagNameNS('*','si') as $si){$v='';foreach($si->getElementsByTagNameNS('*','t') as $text)$v.=$text->textContent;$shared[]=$v;}
            }
            $doc=WorkReportTemplateArchive::xml($zip,$path);$values=[];$formulas=[];$styles=[];$merges=[];$rows=[];
            foreach($doc->getElementsByTagNameNS('*','row') as $row)$rows[(int)$row->getAttribute('r')]=true;
            foreach($doc->getElementsByTagNameNS('*','c') as $cell){
                $ref=$cell->getAttribute('r');$type=$cell->getAttribute('t');
                $v=$cell->getElementsByTagNameNS('*','v')->item(0)?->textContent??'';
                if($type==='s')$v=$shared[(int)$v]??'';
                if($type==='inlineStr'){$v='';foreach($cell->getElementsByTagNameNS('*','t') as $text)$v.=$text->textContent;}
                $values[$ref]=$v;$styles[$ref]=$cell->getAttribute('s');
                $f=$cell->getElementsByTagNameNS('*','f')->item(0);if($f)$formulas[$ref]=$f->textContent;
            }
            foreach($doc->getElementsByTagNameNS('*','mergeCell') as $merge)$merges[]=$merge->getAttribute('ref');
            $read=static function(string $col,int $row)use($values,$merges): string {
                $ref=$col.$row;
                foreach($merges as $range){
                    if(!preg_match('/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/D',$range,$m))continue;
                    $index=static function($s){$n=0;foreach(str_split($s) as $c)$n=$n*26+ord($c)-64;return $n;};
                    if($row>=(int)$m[2]&&$row<=(int)$m[4]&&$index($col)>=$index($m[1])&&$index($col)<=$index($m[3]))return (string)($values[$m[1].$m[2]]??'');
                }
                return (string)($values[$ref]??'');
            };
            $slots=[];$groups=[];
            for($row=$start;$row<=$end;$row++){
                if(!isset($rows[$row]))continue;
                $num=OrganizationWorkPlacement::normalize($read($columns['ordinal'],$row));
                if(!preg_match('/^\d+$/D',$num))continue;
                foreach(['first_name','last_name','personnel_code','friday','holiday','overtime'] as $key)if(isset($formulas[$columns[$key].$row]))throw new InvalidArgumentException('Formula in personnel slot');
                $location=$read($columns['location'],$row);$role=$read($columns['role'],$row);
                if($location===''||$role==='')throw new InvalidArgumentException('Missing group information at row '.$row);
                $rotation='';
                if(preg_match('/(?:نوبت[\s‌-]*کاری).*?([0-9۰-۹٠-٩]+)\s*[%٪]/u',$role,$match))$rotation=OrganizationWorkPlacement::normalize($match[1]);
                $region=isset($columns['region'])?$read($columns['region'],$row):'';
                $group=hash('sha256',json_encode([$region,$location,$role,$rotation],JSON_THROW_ON_ERROR));
                $slots[]=['id'=>(string)$row,'row'=>$row,'location'=>$location,'role'=>$role,'region'=>$region,'rotation'=>$rotation,'group_id'=>$group];
                if(!isset($groups[$group]))$groups[$group]=['location'=>$location,'role'=>$role,'region'=>$region,'capacity'=>0];
                $groups[$group]['capacity']++;
            }
            if(!$slots)throw new InvalidArgumentException('No personnel slots found');
            $defined=[];foreach($book->getElementsByTagNameNS('*','definedName') as $node)$defined[]=['name'=>$node->getAttribute('name'),'value'=>$node->textContent];
            $page=[];foreach(['pageSetup','pageMargins','printOptions'] as $tag){$n=$doc->getElementsByTagNameNS('*',$tag)->item(0);if($n)$page[$tag]=$doc->saveXML($n);}
            return ['sheet'=>$name,'sheet_path'=>$path,'sheet_names'=>$info['sheet_names'],'sha256'=>$info['sha256'],'columns'=>$columns,'slots'=>$slots,'groups'=>array_values($groups),'merges'=>$merges,'formulas'=>$formulas,'defined_names'=>$defined,'print'=>$page];
        }finally{$zip->close();}
    }
}
