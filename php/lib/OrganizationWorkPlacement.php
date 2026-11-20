<?php
/** Pure matching; never infer an unknown location, role or rotation. */
final class OrganizationWorkPlacement {
    public static function normalize($value): string {
        $s=strtr((string)$value,['ي'=>'ی','ى'=>'ی','ك'=>'ک','‌'=>' ','‍'=>' ','۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9','٪'=>'%']);
        return trim(preg_replace('/[\s\p{P}]+/u',' ',$s)??'');
    }
    private static function equivalent($value, array $aliases): string {
        $key=self::normalize($value);
        foreach($aliases as $alias=>$canonical){
            if(self::normalize($alias)===$key)return self::normalize($canonical);
        }
        return $key;
    }
    private static function score(array $slot,array $person,array $aliases): ?int {
        $score=0;
        foreach(['location'=>40,'role'=>40,'region'=>20,'rotation'=>10] as $field=>$weight){
            $expected=self::equivalent($slot[$field]??'', $aliases[$field]??[]);
            $actual=self::equivalent($person[$field]??'', $aliases[$field]??[]);
            if($expected===''){
                if(($field==='location'||$field==='role')&&empty($slot['combined']))return null;
                continue;
            }
            if($expected!==$actual)return null;
            $score+=$weight;
        }
        if(!empty($slot['combined'])){
            $location=self::equivalent($slot['location']??'', $aliases['location']??[]);
            if($location==='')return null;
        }
        return $score>0?$score:null;
    }
    public static function suggest(array $slots,array $people,array $aliases=[]): array {
        $result=self::validate($slots,$people,[]);
        $assign=$result['assignments'];
        $candidates=[];$unmatched=[];$overflow=[];
        foreach($people as $person){
            $id=(int)$person['id'];$best=null;$options=[];
            foreach($slots as $slot){
                $score=self::score($slot,$person,$aliases);
                if($score===null)continue;
                if($best===null||$score>$best){$best=$score;$options=[];}
                if($score===$best)$options[]=(string)$slot['id'];
            }
            if(!$options){$unmatched[]=$id;continue;}
            $candidates[]=['id'=>$id,'score'=>$best,'slots'=>$options];
        }
        usort($candidates,static fn($a,$b)=>count($a['slots'])<=>count($b['slots']) ?: $b['score']<=>$a['score'] ?: $a['id']<=>$b['id']);
        $occupied=[];$byPerson=[];
        $augment=function($id,$options,&$visited)use(&$augment,&$occupied,&$assign,&$byPerson){
            foreach($options as $key){
                if(isset($visited[$key]))continue;
                $visited[$key]=true;
                if(!isset($occupied[$key])||$augment($occupied[$key],$byPerson[$occupied[$key]],$visited)){
                    $occupied[$key]=$id;$assign[$key]=$id;return true;
                }
            }
            return false;
        };
        foreach($candidates as $c)$byPerson[$c['id']]=$c['slots'];
        foreach($candidates as $c){$visited=[];if(!$augment($c['id'],$c['slots'],$visited))$overflow[]=$c['id'];}
        $validated=self::validate($slots,$people,$assign);
        return $validated+['unmatched'=>$unmatched,'overflow'=>$overflow];
    }
    public static function validate(array $slots,array $people,array $assignments): array {
        $valid=[];$used=[];$result=[];
        foreach($people as $p){
            $id=$p['id']??null;
            if(!is_int($id)||$id<=0||isset($valid[$id]))throw new InvalidArgumentException('Invalid or duplicate person');
            $valid[$id]=true;
        }
        foreach($slots as $s){
            $key=(string)($s['id']??'');
            if($key===''||array_key_exists($key,$result))throw new InvalidArgumentException('Invalid or duplicate slot');
            $id=$assignments[$key]??null;
            if($id!==null){
                if(!is_int($id)||!isset($valid[$id])||isset($used[$id]))throw new InvalidArgumentException('Invalid or duplicate assignment');
                $used[$id]=true;
            }
            $result[$key]=$id;
        }
        if(array_diff_key($assignments,$result))throw new InvalidArgumentException('Unknown slot');
        return ['assignments'=>$result,'unassigned'=>array_keys(array_diff_key($valid,$used))];
    }
}
