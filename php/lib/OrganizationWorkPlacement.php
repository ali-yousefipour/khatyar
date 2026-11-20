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
    private static function area($v,array $aliases=[]): string {
        $v=self::equivalent($v,$aliases);
        $v=preg_replace('/^(?:منطقه|محدوده|مبدا|مبدأ)\s+/u','',$v)??$v;
        $map=['فرودگاه شهید هاشمی نژاد'=>'فرودگاه','فرودگاه شهید هاشمی‌نژاد'=>'فرودگاه','ایستگاه راه آهن'=>'راه آهن','پایانه امام رضا'=>'پایانه مسافربری','پایانه مسافربری امام رضا'=>'پایانه مسافربری','باب‌الجواد'=>'باب الجواد','بابالجواد'=>'باب الجواد'];
        return $map[$v]??$v;
    }
    private static function role($v,array $aliases=[]): string {
        $v=self::equivalent($v,$aliases);
        $v=preg_replace('/\s*نوبت کاری\s*\d+\s*$/u','',$v)??$v;
        if(preg_match('/^اپراتور(?: فاکتور سفر)?(?: |$)/u',$v))return 'اپراتور';
        if(in_array($v,['ناظر خط مبادی','ناظر خط ثامن'],true))return 'ناظر خط';
        if(preg_match('/^ناظر خط(?: داخلی| خارجی| شیرازی| باب الجواد| طبرسی| نواب صفوی)?$/u',$v))return 'ناظر خط';
        if(preg_match('/^بازرس خط(?: |$)/u',$v))return 'بازرس خط';
        return $v;
    }
    private static function rotation($value): string {
        return preg_replace('/[^0-9]/','',self::normalize($value))??'';
    }
    private static function score(array $slot,array $person,array $aliases): ?int {
        $region=self::area($person['region']??'', $aliases['region']??[]);
        $location=self::area($person['location']??'', $aliases['location']??[]);
        $expected=self::area($slot['location']??'', $aliases['location']??[]);
        $requiredRegion=self::area($slot['region']??'', $aliases['region']??[]);
        if($requiredRegion!==''&&$requiredRegion!==$region)return null;
        $actualRole=self::role($person['role']??'', $aliases['role']??[]);
        if($actualRole==='')return null;
        $wantRotation=self::rotation($slot['rotation']??'');
        if($wantRotation!==''&&$wantRotation!==self::rotation($person['rotation']??''))return null;
        if(!empty($slot['combined'])){
            // Combined headings describe a duty category rather than a geographical location.
            $group=self::role($slot['location']??'', $aliases['role']??[]);
            $combinedRoles=[
                'ناظر خطوط ثابت'=>['ناظر خطوط ثابت','ناظر خط ثابت','ناظر ثابت'],
                'ناظر خطوط گردشی'=>['ناظر خطوط گردشی','ناظر خط گردشی','ناظر گردشی'],
                'بازرس مناطق تاکسیرانی'=>['بازرس مناطق تاکسیرانی','بازرس منطقه','بازرس'],
                'نظارت تصویری'=>['نظارت تصویری'],
            ];
            if(!in_array($actualRole,$combinedRoles[$group]??[$group],true))return null;
            return 40+($requiredRegion!==''?20:0)+($wantRotation!==''?10:0);
        }
        if($expected===''||($expected!==$region&&$expected!==$location))return null;
        $rawExpected=self::equivalent($slot['role']??'', $aliases['role']??[]);
        $rawActual=self::equivalent($person['role']??'', $aliases['role']??[]);
        $role=self::role($rawExpected);
        if($role===''||$role!==$actualRole)return null;
        // Explicit contradictory sublocations must never be matched.
        foreach(['داخلی','خارجی','داخل سالن'] as $qualifier){
            if(str_contains($rawActual,$qualifier)&&!str_contains($rawExpected,$qualifier))return null;
        }
        return 80+($requiredRegion!==''?20:0)+($wantRotation!==''?10:0)+($rawExpected===$rawActual?5:0)+($expected===$region?2:0);
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
            // Prefer a free slot; displace an earlier assignment only to increase coverage.
            foreach($options as $key){
                if(!isset($visited[$key])&&!isset($occupied[$key])){
                    $visited[$key]=true;$occupied[$key]=$id;$assign[$key]=$id;return true;
                }
            }
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
