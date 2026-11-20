<?php
require_once __DIR__.'/WorkReportTemplateArchive.php';
require_once __DIR__.'/OrganizationWorkPlacement.php';

/** Edits only the selected worksheet and its note parts on a private copy. */
final class WorkReportTemplateExporter {
    private const S='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    private const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    private const P='http://schemas.openxmlformats.org/package/2006/relationships';
    private const C='http://schemas.openxmlformats.org/package/2006/content-types';
    private const V='urn:schemas-microsoft-com:vml';
    private const X='urn:schemas-microsoft-com:office:excel';
    private const O='urn:schemas-microsoft-com:office:office';
    private const FIELDS=['first_name'=>4,'last_name'=>5,'personnel_code'=>6,'friday'=>7,'holiday'=>8,'overtime'=>9];

    private static function element(DOMDocument $d,string $ns,string $name,?string $value=null): DOMElement {
        $e=$d->createElementNS($ns,$name);
        if($value!==null)$e->appendChild($d->createTextNode($value));
        return $e;
    }
    private static function document(string $xml): DOMDocument {
        $d=new DOMDocument('1.0','UTF-8');
        if(!$d->loadXML($xml,LIBXML_NONET)||$d->doctype)throw new RuntimeException('Invalid workbook XML');
        return $d;
    }
    private static function col(string $letters): int {
        if(!preg_match('/^[A-Z]{1,3}$/D',$letters))throw new InvalidArgumentException('Invalid column');
        $n=0;foreach(str_split($letters) as $c)$n=$n*26+ord($c)-64;
        if($n>16384)throw new InvalidArgumentException('Invalid column');
        return $n;
    }
    private static function column(int $n): string {
        $s='';while($n>0){$n--;$s=chr(65+$n%26).$s;$n=intdiv($n,26);}return $s;
    }
    private static function setCell(DOMDocument $d,DOMElement $row,string $column,$value,bool $numeric=false): void {
        $ref=$column.$row->getAttribute('r');$cell=null;$before=null;
        foreach($row->childNodes as $node){
            if(!$node instanceof DOMElement||$node->localName!=='c')continue;
            if($node->getAttribute('r')===$ref){$cell=$node;break;}
            $other=preg_replace('/[0-9]+$/','',$node->getAttribute('r'));
            if(self::col($other)>self::col($column)){$before=$node;break;}
        }
        if(!$cell){$cell=self::element($d,self::S,'c');$cell->setAttribute('r',$ref);$row->insertBefore($cell,$before);}
        if($cell->getElementsByTagNameNS(self::S,'f')->length)throw new InvalidArgumentException('Formula in target '.$ref);
        foreach(iterator_to_array($cell->childNodes) as $n)if($n instanceof DOMElement&&in_array($n->localName,['v','is'],true))$cell->removeChild($n);
        $cell->removeAttribute('t');
        if($value===null)return;
        if($numeric){if(!is_numeric($value)||!is_finite((float)$value))throw new InvalidArgumentException('Invalid hours');$cell->appendChild(self::element($d,self::S,'v',number_format((float)$value,6,'.','')));}
        else{$cell->setAttribute('t','inlineStr');$is=self::element($d,self::S,'is');$t=self::element($d,self::S,'t',(string)$value);$t->setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');$is->appendChild($t);$cell->appendChild($is);}
    }
    private static function note(string $s): string {
        return strtr($s,['0'=>'۰','1'=>'۱','2'=>'۲','3'=>'۳','4'=>'۴','5'=>'۵','6'=>'۶','7'=>'۷','8'=>'۸','9'=>'۹']);
    }
    private static function protectedCell(string $col,int $row,array $merges): bool {
        foreach($merges as $range){
            if(!preg_match('/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/D',$range,$m))continue;
            if($row>=(int)$m[2]&&$row<=(int)$m[4]&&self::col($col)>=self::col($m[1])&&self::col($col)<=self::col($m[3]))return true;
        }
        return false;
    }
    private static function resolve(string $base,string $target): string {
        $parts=str_starts_with($target,'/')?[]:explode('/',dirname($base));
        foreach(explode('/',ltrim($target,'/')) as $x){
            if($x==='..'){if(!$parts)throw new InvalidArgumentException('Unsafe relationship');array_pop($parts);}
            elseif($x!==''&&$x!=='.')$parts[]=$x;
        }
        $path=implode('/',$parts);
        if(!preg_match('~^[A-Za-z0-9_./-]+$~D',$path))throw new InvalidArgumentException('Invalid relationship target');
        return $path;
    }
    private static function put(ZipArchive $zip,string $path,DOMDocument $doc): void {
        $xml=$doc->saveXML();
        if($xml===false||!$zip->addFromString($path,$xml))throw new RuntimeException('Cannot write workbook part');
    }
    private static function notes(ZipArchive $zip,DOMDocument $sheet,string $path,array $replace,array $notes,DOMDocument $types): void {
        $rp=dirname($path).'/_rels/'.basename($path).'.rels';
        $rels=$zip->locateName($rp)!==false?WorkReportTemplateArchive::xml($zip,$rp):self::document('<Relationships xmlns="'.self::P.'"/>');
        $find=function(string $type)use($rels){foreach($rels->getElementsByTagNameNS(self::P,'Relationship') as $r)if($r->getAttribute('Type')===self::R.'/'.$type)return $r;return null;};
        $commentRel=$find('comments');$vmlRel=null;
        $legacy=$sheet->getElementsByTagNameNS(self::S,'legacyDrawing')->item(0);
        if($legacy){foreach($rels->getElementsByTagNameNS(self::P,'Relationship') as $r)if($r->getAttribute('Id')===$legacy->getAttributeNS(self::R,'id'))$vmlRel=$r;if(!$vmlRel||$vmlRel->getAttribute('Type')!==self::R.'/vmlDrawing')throw new InvalidArgumentException('Invalid legacy drawing');}
        if(!$notes&&!$commentRel)return;
        $add=function(string $type,string $target)use($rels): DOMElement {
            $ids=[];foreach($rels->getElementsByTagNameNS(self::P,'Relationship') as $r)$ids[$r->getAttribute('Id')]=true;
            $i=1;while(isset($ids['rId'.$i]))$i++;
            $r=self::element($rels,self::P,'Relationship');$r->setAttribute('Id','rId'.$i);$r->setAttribute('Type',self::R.'/'.$type);$r->setAttribute('Target',$target);$rels->documentElement->appendChild($r);return $r;
        };
        $suffix=bin2hex(random_bytes(8));
        if(!$commentRel)$commentRel=$add('comments','../comments-work-'.$suffix.'.xml');
        if(!$vmlRel)$vmlRel=$add('vmlDrawing','../drawings/work-'.$suffix.'.vml');
        $cp=self::resolve($path,$commentRel->getAttribute('Target'));$vp=self::resolve($path,$vmlRel->getAttribute('Target'));
        $comments=$zip->locateName($cp)!==false?WorkReportTemplateArchive::xml($zip,$cp):self::document('<comments xmlns="'.self::S.'"><authors/><commentList/></comments>');
        $authors=$comments->getElementsByTagNameNS(self::S,'authors')->item(0);$list=$comments->getElementsByTagNameNS(self::S,'commentList')->item(0);
        if(!$authors||!$list)throw new InvalidArgumentException('Invalid comment part');
        $author=$authors->getElementsByTagNameNS(self::S,'author')->length;
        $authors->appendChild(self::element($comments,self::S,'author','خطیار'));
        foreach(iterator_to_array($list->getElementsByTagNameNS(self::S,'comment')) as $n)if(isset($replace[$n->getAttribute('ref')]))$n->parentNode->removeChild($n);
        $vml=$zip->locateName($vp)!==false?WorkReportTemplateArchive::xml($zip,$vp):self::document('<xml xmlns:v="'.self::V.'" xmlns:o="'.self::O.'" xmlns:x="'.self::X.'"><o:shapelayout v:ext="edit"><o:idmap v:ext="edit" data="1"/></o:shapelayout></xml>');
        $shapeIds=[];$typeFound=false;
        foreach($vml->getElementsByTagNameNS(self::V,'shapetype') as $n)if($n->getAttribute('id')==='_x0000_t202')$typeFound=true;
        if(!$typeFound){$t=self::element($vml,self::V,'v:shapetype');$t->setAttribute('id','_x0000_t202');$t->setAttribute('coordsize','21600,21600');$t->setAttributeNS(self::O,'o:spt','202');$t->setAttribute('path','m,l,21600r21600,l21600,xe');$vml->documentElement->appendChild($t);}
        foreach(iterator_to_array($vml->getElementsByTagNameNS(self::V,'shape')) as $shape){
            $shapeIds[$shape->getAttribute('id')]=true;
            $client=$shape->getElementsByTagNameNS(self::X,'ClientData')->item(0);
            if(!$client||$client->getAttribute('ObjectType')!=='Note')continue;
            $rr=$client->getElementsByTagNameNS(self::X,'Row')->item(0);$cc=$client->getElementsByTagNameNS(self::X,'Column')->item(0);
            if($rr&&$cc&&isset($replace[self::column((int)$cc->textContent+1).((int)$rr->textContent+1)]))$shape->parentNode->removeChild($shape);
        }
        $i=1024;
        foreach($notes as $ref=>$body){
            if(!preg_match('/^([A-Z]+)(\d+)$/D',$ref,$m))throw new InvalidArgumentException('Invalid note reference');
            $n=self::element($comments,self::S,'comment');$n->setAttribute('ref',$ref);$n->setAttribute('authorId',(string)$author);
            $text=self::element($comments,self::S,'text');$t=self::element($comments,self::S,'t',self::note($body));$t->setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');$text->appendChild($t);$n->appendChild($text);$list->appendChild($n);
            while(isset($shapeIds['_x0000_s'.(++$i)])){}$id='_x0000_s'.$i;$shapeIds[$id]=true;
            $shape=self::element($vml,self::V,'v:shape');$shape->setAttribute('id',$id);$shape->setAttribute('type','#_x0000_t202');
            $wrapped=0;foreach(explode("\n",$body) as $line)$wrapped+=max(1,(int)ceil(mb_strlen($line,'UTF-8')/48));
            $shape->setAttribute('style','position:absolute;visibility:hidden;width:420pt;height:'.min(570,max(135,20*$wrapped+30)).'pt;z-index:1');
            $shape->setAttribute('fillcolor','#ffffe1');$shape->setAttributeNS(self::O,'o:insetmode','auto');
            $box=self::element($vml,self::V,'v:textbox');$div=$vml->createElement('div');$div->setAttribute('style','text-align:right;direction:rtl');$box->appendChild($div);$shape->appendChild($box);
            $cd=self::element($vml,self::X,'x:ClientData');$cd->setAttribute('ObjectType','Note');
            foreach(['MoveWithCells'=>null,'SizeWithCells'=>null,'AutoFill'=>'False','Row'=>(string)((int)$m[2]-1),'Column'=>(string)(self::col($m[1])-1)] as $key=>$value)$cd->appendChild(self::element($vml,self::X,'x:'.$key,$value));
            $shape->appendChild($cd);$vml->documentElement->appendChild($shape);
        }
        if(!$legacy){
            $legacy=self::element($sheet,self::S,'legacyDrawing');$legacy->setAttributeNS(self::R,'r:id',$vmlRel->getAttribute('Id'));
            $before=null;foreach($sheet->documentElement->childNodes as $n)if($n instanceof DOMElement&&in_array($n->localName,['legacyDrawingHF','picture','oleObjects','controls','webPublishItems','tableParts','extLst'],true)){$before=$n;break;}
            $sheet->documentElement->insertBefore($legacy,$before);
        }
        $has=false;foreach($types->getElementsByTagNameNS(self::C,'Override') as $n)if($n->getAttribute('PartName')==='/'.$cp)$has=true;
        if(!$has){$n=self::element($types,self::C,'Override');$n->setAttribute('PartName','/'.$cp);$n->setAttribute('ContentType','application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml');$types->documentElement->appendChild($n);}
        $has=false;foreach($types->getElementsByTagNameNS(self::C,'Default') as $n)if(strtolower($n->getAttribute('Extension'))==='vml')$has=true;
        if(!$has){$n=self::element($types,self::C,'Default');$n->setAttribute('Extension','vml');$n->setAttribute('ContentType','application/vnd.openxmlformats-officedocument.vmlDrawing');$types->documentElement->appendChild($n);}
        self::put($zip,$cp,$comments);self::put($zip,$vp,$vml);self::put($zip,$rp,$rels);
    }
    public static function export(string $templateFile,array $structure,array $records,array $placement,array $context): string {
        $meta=WorkReportTemplateArchive::inspect($templateFile);
        if(!hash_equals($structure['sha256'],$meta['sha256']))throw new InvalidArgumentException('Template hash mismatch');
        $people=[];$byId=[];
        foreach($records as $r){$id=$r['user_id'];if(isset($byId[$id]))throw new InvalidArgumentException('Duplicate personnel');$byId[$id]=$r;$people[]=['id'=>$id];}
        $checked=OrganizationWorkPlacement::validate($structure['slots'],$people,$placement['assignments']);
        $remaining=$checked['unassigned'];$unmatched=array_values(array_intersect($remaining,$placement['unmatched']??[]));$overflow=array_values(array_diff($remaining,$unmatched));
        $tmp=tempnam(sys_get_temp_dir(),'kh-work-export-');
        if($tmp===false)throw new RuntimeException('Temporary file unavailable');
        $zip=new ZipArchive();$open=false;$success=false;
        try{
            if(!chmod($tmp,0600)||!copy($templateFile,$tmp)||$zip->open($tmp)!==true)throw new RuntimeException('Cannot copy workbook');
            $open=true;$path=$structure['sheet_path'];$sheet=WorkReportTemplateArchive::xml($zip,$path);
            $types=WorkReportTemplateArchive::xml($zip,'[Content_Types].xml');
            $data=$sheet->getElementsByTagNameNS(self::S,'sheetData')->item(0);if(!$data)throw new InvalidArgumentException('Missing worksheet data');
            $rows=[];$max=0;foreach($data->getElementsByTagNameNS(self::S,'row') as $row){$n=(int)$row->getAttribute('r');$rows[$n]=$row;$max=max($max,$n);}
            $replace=[];$notes=[];$counts=[];$totals=[7=>0,8=>0,9=>0];$used=[];
            $addTotals=static function(array $r)use(&$totals,&$used){$id=$r['user_id'];if(isset($used[$id]))throw new LogicException('Duplicate output');$used[$id]=true;foreach([7,8,9] as $c)$totals[$c]+=(int)round($r['cells'][$c]*1000000);};
            foreach($structure['slots'] as $slot){
                $n=(int)$slot['row'];$row=$rows[$n]??null;if(!$row)throw new InvalidArgumentException('Missing slot row');
                $id=$checked['assignments'][$slot['id']];$r=$id===null?null:$byId[$id];
                $group=$slot['group_id'];if(!isset($counts[$group]))$counts[$group]=[$slot['location'],$slot['role'],0,0];$counts[$group][2]++;if($r)$counts[$group][3]++;
                foreach(self::FIELDS as $key=>$c){$col=$structure['columns'][$key];if(self::protectedCell($col,$n,$structure['merges']))throw new InvalidArgumentException('Merged target cell');$ref=$col.$n;$replace[$ref]=true;self::setCell($sheet,$row,$col,$r['cells'][$c]??null,$c>=7);if($r&&$c>=7)$notes[$ref]=$r['comments'][$c];}
                if($r)$addTotals($r);
            }
            // Append below existing content: no shifts of formulas, drawings or merge ranges.
            $append=function(array $values,array $comment=[])use($sheet,$data,&$max,&$notes){
                if(++$max>1048576)throw new RuntimeException('Worksheet row limit');
                $row=self::element($sheet,self::S,'row');$row->setAttribute('r',(string)$max);$data->appendChild($row);
                foreach($values as $i=>$v)self::setCell($sheet,$row,self::column($i+1),$v,is_int($v)||is_float($v));
                foreach($comment as $i=>$v)$notes[self::column($i+1).$max]=$v;
            };
            foreach(['فهرست نیروهای مازاد بر ظرفیت قالب'=>$overflow,'فهرست نیروهای بدون تطبیق سازمانی'=>$unmatched] as $title=>$ids){
                $reason=$title==='فهرست نیروهای مازاد بر ظرفیت قالب'?'عدم تخصیص جایگاه منطبق در چینش نهایی':'عدم وجود جایگاه منطبق با مشخصات سازمانی';
                $append([$title]);$append(['نام','نام خانوادگی','شماره پرسنلی','منطقه','محل خدمت','سمت','جمعه‌کاری','تعطیل‌کاری','اضافه‌کاری','علت']);
                foreach($ids as $id){$r=$byId[$id];$p=$r['placement']??[];$append([$r['cells'][4],$r['cells'][5],(string)$r['cells'][6],$p['region']??'',$p['location']??'',$p['role']??'',(float)$r['cells'][7],(float)$r['cells'][8],(float)$r['cells'][9],$reason],[6=>$r['comments'][7],7=>$r['comments'][8],8=>$r['comments'][9]]);$addTotals($r);}
            }
            $append(['گزارش کسری ظرفیت']);$append(['محل خدمت','سمت','ظرفیت','تخصیص‌یافته','خالی']);
            foreach($counts as $c)$append([$c[0],$c[1],$c[2],$c[3],$c[2]-$c[3]]);
            $expected=[7=>0,8=>0,9=>0];foreach($records as $r)foreach([7,8,9] as $c)$expected[$c]+=(int)round($r['cells'][$c]*1000000);
            if(count($used)!==count($records)||$expected!==$totals)throw new LogicException('Hours reconciliation failed');
            $append(['مجموع کل ساعات',null,null,null,null,null,$totals[7]/1000000,$totals[8]/1000000,$totals[9]/1000000]);
            $dimension=$sheet->getElementsByTagNameNS(self::S,'dimension')->item(0);
            if($dimension){$ref=$dimension->getAttribute('ref');$parts=explode(':',$ref);$last=end($parts);preg_match('/^([A-Z]+)/',$last,$m);$endCol=self::column(max(10,self::col($m[1]??'A')));$dimension->setAttribute('ref',$parts[0].':'.$endCol.$max);}
            self::notes($zip,$sheet,$path,$replace,$notes,$types);
            self::put($zip,$path,$sheet);self::put($zip,'[Content_Types].xml',$types);
            if(!$zip->close())throw new RuntimeException('Cannot finalize workbook');$open=false;
            WorkReportTemplateArchive::inspect($tmp);$success=true;return $tmp;
        }finally{if($open)$zip->close();if(!$success)@unlink($tmp);}
    }
}
