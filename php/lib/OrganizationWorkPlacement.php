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
    public static function isSenior($role): bool {
        $role=self::normalize($role);
        return (bool)preg_match('/^سر\s*بازرس(?:\s|$)/u',$role);
    }
    public static function rowColor($role): ?string {
        if(self::isSenior($role))return 'FFC6EFCE';
        if(self::normalize($role)==='نیروی اداری ارشد')return 'FFBDD7EE';
        return null;
    }
    public static function comparePeople(array $a,array $b): int {
        // Persian alphabet: Unicode order alone does not place پ چ ژ گ correctly.
        $alphabet=preg_split('//u','آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی',-1,PREG_SPLIT_NO_EMPTY);
        $map=[];foreach($alphabet as $i=>$letter)$map[$letter]=sprintf('%03d',$i+1);
        $key=static function($value)use($map){
            $out='';foreach(preg_split('//u',self::normalize($value),-1,PREG_SPLIT_NO_EMPTY)?:[] as $c)$out.=$map[$c]??('999'.$c);
            return $out;
        };
        return strcmp($key($a['last_name']??''),$key($b['last_name']??'')) ?: strcmp($key($a['first_name']??''),$key($b['first_name']??'')) ?: (int)($a['id']??0)<=>(int)($b['id']??0);
    }
    private static function score(array $slot,array $person,array $aliases): ?int {
        $region=self::area($person['region']??'', $aliases['region']??[]);
        $location=self::area($person['location']??'', $aliases['location']??[]);
        $expected=self::area($slot['location']??'', $aliases['location']??[]);
        $requiredRegion=self::area($slot['region']??'', $aliases['region']??[]);
        if($requiredRegion!==''&&$requiredRegion!==$region)return null;
        $actualRole=self::role($person['role']??'', $aliases['role']??[]);
        if($actualRole==='')return null;
        // Explicit organization reporting rule: resident administrative staff belong
        // to the line-user group, regardless of their personal zone.
        if($actualRole==='نیروی اداری مقیم سازمان'){
            $groupRole=self::equivalent(!empty($slot['combined'])?($slot['location']??''):($slot['role']??''),$aliases['role']??[]);
            return $groupRole==='کاربر خطوط'?150:null;
        }
        // Explicit organization mapping takes precedence over geographical slots.
        $targetGroup=null;
        $rawRole=self::equivalent($person['role']??'', $aliases['role']??[]);
        $slotRole=self::normalize(!empty($slot['combined'])?($slot['location']??''):($slot['role']??''));
        $shift=(string)($person['rotation']??'');
        $site=$location!==''?$location:$region;
        $targetArea=null;$targetRole=null;
        if(in_array($rawRole,['سربازرس ارشد','سر بازرس ارشد','نیروی اداری ارشد'],true)){
            return in_array($slotRole,['ناظر خطوط گردشی','ناظرین خطوط گردشی','ناظران خطوط گردشی'],true)?160:null;
        }
        if(self::isSenior($rawRole)){
            $seniorAreas=['مبادی ورودی'=>'فرودگاه','مبادی'=>'فرودگاه','ثامن'=>'باب الجواد','غرب'=>'نواب صفوی','مرکزی'=>'شیرازی','مرکز'=>'شیرازی','شرق'=>'طبرسی'];
            if(isset($seniorAreas[$region])){
                $targetArea=$seniorAreas[$region];$targetRole=$targetArea==='فرودگاه'?'بازرس مقیم':'بازرس خط';
            }
        }elseif(in_array($rawRole,['گشت خودرویی','بازرس خودرویی','بازرسین خودرویی','بازرسان خودرویی'],true)){
            return in_array($slotRole,['بازرس مناطق تاکسیرانی','بازرسین مناطق تاکسیرانی','بازرسان مناطق تاکسیرانی'],true)?150:null;
        }elseif(preg_match('/^بازرس مقیم(?:\s|$)/u',$rawRole)&&in_array($site,['فرودگاه','راه آهن','پایانه مسافربری'],true)){
            $targetArea=$site;
            if($site==='فرودگاه'){
                if($shift==='morning')$targetRole='بازرس مقیم';
                elseif(in_array($shift,['afternoon','night','10','15'],true))$targetRole='ناظر خط خارجی';
                else return null;
            }else $targetRole='بازرس مقیم';
        }elseif($actualRole==='ناظر خط'&&$site==='فرودگاه'&&in_array($shift,['10','15'],true)){
            $targetArea='فرودگاه';$targetRole=$shift==='15'?'ناظر خط داخلی':'ناظر خط خارجی';
        }elseif($actualRole==='اپراتور'&&$site==='فرودگاه'){
            if(!in_array($shift,['10','15'],true)||$expected!=='فرودگاه'||self::role($slotRole)!=='اپراتور')return null;
            $required=self::rotation($slot['rotation']??'');
            if($required===''){
                if(preg_match('/(?:^| )15(?: |$)/u',$slotRole))$required='15';
                elseif(preg_match('/(?:^| )10(?: |$)/u',$slotRole))$required='10';
            }
            if($required!==''&&$required!==$shift)return null;
            $inside=str_contains($slotRole,'داخلی')||str_contains($slotRole,'داخل سالن');
            $outside=str_contains($slotRole,'خارجی');
            if(($inside&&$shift!=='15')||($outside&&$shift!=='10'))return null;
            if(!$inside&&!$outside&&$required==='')return null;
            return 160;
        }elseif($actualRole==='اپراتور'&&$site==='پایانه مسافربری'&&$shift==='morning'){
            if($expected!==$site||self::role($slotRole)!=='اپراتور'||self::rotation($slot['rotation']??'')!=='')return null;
            if(str_contains($slotRole,'خارجی')||preg_match('/(?:^| )(?:10|15)(?: |$)/u',$slotRole))return null;
            return str_contains($slotRole,'داخل سالن')?170:($slotRole==='اپراتور فاکتور سفر'?160:null);
        }
        if($targetArea!==null){
            if($expected!==$targetArea)return null;
            if($targetRole==='بازرس مقیم')return preg_match('/^بازرس مقیم(?:\s|$)/u',$slotRole)?160:null;
            if($targetRole==='بازرس خط')return self::role($slotRole)==='بازرس خط'?160:null;
            return $slotRole===$targetRole?160:null;
        }
        if(in_array($rawRole,['گشت موتوری','گشت های موتوری','گشت موتور سوار','گشت موتورسوار'],true)){
            $targetGroup='ناظر خطوط گردشی';
        }elseif(in_array($rawRole,['ناظر خط','ناظر خطوط','ناظر خط ثابت','ناظر خطوط ثابت'],true)
            &&in_array($region,['شرق','غرب','مرکزی','مرکز'],true)){
            $targetGroup='ناظر خطوط ثابت';
        }
        if($targetGroup!==null){
            $group=self::normalize(!empty($slot['combined'])?($slot['location']??''):($slot['role']??''));
            return $group===$targetGroup?150:null;
        }
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
        $personMap=[];foreach($people as $p)$personMap[$p['id']]=$p;
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
        usort($candidates,static fn($a,$b)=>count($a['slots'])<=>count($b['slots']) ?: $b['score']<=>$a['score'] ?: self::comparePeople($personMap[$a['id']],$personMap[$b['id']]));
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
        // Sort within an identical template group, without changing compatible groups.
        $groups=[];foreach($slots as $slot){$group=$slot['group_id']??json_encode([$slot['location']??'',$slot['role']??'',$slot['region']??'',$slot['rotation']??'',$slot['combined']??false]);$groups[$group][]=(string)$slot['id'];}
        foreach($groups as $keys){
            $ids=[];foreach($keys as $key)if($assign[$key]!==null)$ids[]=$assign[$key];
            usort($ids,static fn($a,$b)=>self::comparePeople($personMap[$a],$personMap[$b]));
            foreach($keys as $i=>$key)$assign[$key]=$ids[$i]??null;
        }
        foreach([&$overflow,&$unmatched] as &$ids)usort($ids,static fn($a,$b)=>self::comparePeople($personMap[$a],$personMap[$b]));unset($ids);
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
