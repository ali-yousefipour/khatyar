<?php
/** Validate a bounded, macro-free XLSX package before storing it. */
final class WorkReportTemplateArchive {
    public const MAX_BYTES=8388608;
    public static function inspect(string $file): array {
        $size=filesize($file);
        if(!$size||$size>self::MAX_BYTES)throw new InvalidArgumentException('Invalid XLSX size');
        $zip=new ZipArchive();
        if($zip->open($file,ZipArchive::CHECKCONS)!==true)throw new InvalidArgumentException('Invalid XLSX archive');
        try {
            if($zip->numFiles>2000)throw new InvalidArgumentException('Too many ZIP entries');
            $total=0;$names=[];
            for($i=0;$i<$zip->numFiles;$i++){
                $entry=$zip->statIndex($i);
                if(!$entry)throw new InvalidArgumentException('Unreadable ZIP entry');
                $name=$entry['name'];$lower=strtolower($name);
                if(isset($names[$lower])||preg_match('~(^/|\\\\|:|(^|/)\.\.(/|$))~',$name))throw new InvalidArgumentException('Unsafe ZIP path');
                $names[$lower]=true;$total+=$entry['size'];
                if($total>67108864||$entry['size']>16777216||($entry['size']>1048576&&$entry['size']>200*max(1,$entry['comp_size'])))throw new InvalidArgumentException('ZIP expansion limit');
                if(!preg_match('~^xl/printerSettings/printerSettings[0-9]+\.bin$~D',$name)&&preg_match('~(vbaproject|macrosheet|externallinks/|embeddings/|activex/|\.bin$|\.exe$|\.js$)~i',$name))throw new InvalidArgumentException('Unsupported active content');
                if(preg_match('~\.(xml|rels)$~i',$name)){
                    $xml=self::xml($zip,$name);
                    if(str_ends_with($lower,'.rels')){
                        foreach($xml->getElementsByTagNameNS('*','Relationship') as $rel){
                            if(strcasecmp($rel->getAttribute('TargetMode'),'External')===0)throw new InvalidArgumentException('External relationship');
                        }
                    }
                }
            }
            foreach(['[content_types].xml','_rels/.rels','xl/workbook.xml','xl/_rels/workbook.xml.rels'] as $required)if(!isset($names[$required]))throw new InvalidArgumentException('Incomplete XLSX');
            $types=self::xml($zip,'[Content_Types].xml');
            foreach($types->getElementsByTagNameNS('*','Override') as $node){
                if(preg_match('/macroEnabled|vba|macroSheet|activeX|oleObject/i',$node->getAttribute('ContentType')))throw new InvalidArgumentException('Active content');
            }
            $workbook=self::xml($zip,'xl/workbook.xml');
            $sheets=[];
            foreach($workbook->getElementsByTagNameNS('*','sheet') as $node)$sheets[]=$node->getAttribute('name');
            if(!$sheets)throw new InvalidArgumentException('No worksheets');
            return ['sheet_names'=>$sheets,'sha256'=>hash_file('sha256',$file),'size'=>$size];
        }finally{$zip->close();}
    }
    public static function xml(ZipArchive $zip,string $name): DOMDocument {
        $content=$zip->getFromName($name);
        if($content===false||preg_match('/<!DOCTYPE|<!ENTITY/i',$content))throw new InvalidArgumentException('Unsafe XML');
        $doc=new DOMDocument();
        if(!@$doc->loadXML($content,LIBXML_NONET|LIBXML_COMPACT))throw new InvalidArgumentException('Invalid XML');
        return $doc;
    }
}
