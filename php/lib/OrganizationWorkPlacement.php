<?php
/** Pure, deterministic matching for the organization work-report template.
 * Never invent a location or a shift percentage; ambiguous staff remain unassigned.
 */
final class OrganizationWorkPlacement {
    public static function normalize($value): string {
        $s=strtr((string)$value,['ي'=>'ی','ك'=>'ک','‌'=>' ','۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٪'=>'%']);
        return trim(preg_replace('/\s+/u',' ',$s));
    }
    public static function suggest(array $slots,array $people): array {
        $groups=[];$assign=[];$remaining=[];
        foreach($slots as $slot){
            $id=(string)$slot['id'];
            if(isset($assign[$id])||array_key_exists($id,$assign))throw new InvalidArgumentException('Duplicate slot');
            $assign[$id]=null;
            $key=self::normalize($slot['location']??'').'|'.self::normalize($slot['role']??'');
            $groups[$key][]=$id;
        }
        $seen=[];
        foreach($people as $person){
            $id=(int)($person['id']??0);
            if($id<=0||isset($seen[$id]))throw new InvalidArgumentException('Invalid or duplicate person');
            $seen[$id]=true;
            $location=self::normalize($person['location']??'');
            $role=self::normalize($person['role']??'');
            $key=$location.'|'.$role;
            if($location!==''&&$role!==''&&!empty($groups[$key])){
                $slot=array_shift($groups[$key]);$assign[$slot]=$id;
            }else{$remaining[]=$id;}
        }
        return ['assignments'=>$assign,'unassigned'=>$remaining];
    }
    public static function validate(array $slots,array $people,array $assignments): array {
        $valid=[];$used=[];$result=[];
        foreach($people as $p){$id=(int)$p['id'];if($id<=0||isset($valid[$id]))throw new InvalidArgumentException('Invalid person');$valid[$id]=true;}
        foreach($slots as $s){$key=(string)$s['id'];if(array_key_exists($key,$result))throw new InvalidArgumentException('Duplicate slot');$id=$assignments[$key]??null;
            if($id!==null){if(!is_int($id)||!isset($valid[$id])||isset($used[$id]))throw new InvalidArgumentException('Invalid or duplicate assignment');$used[$id]=true;}
            $result[$key]=$id;
        }
        if(array_diff_key($assignments,$result))throw new InvalidArgumentException('Unknown slot');
        return ['assignments'=>$result,'unassigned'=>array_keys(array_diff_key($valid,$used))];
    }
}
