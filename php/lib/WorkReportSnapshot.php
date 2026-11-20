<?php
/** Ephemeral, private, server-owned calculated organization report records. */
final class WorkReportSnapshot {
    private const TTL=900;
    private const MAX_BYTES=33554432;
    private string $directory;
    public function __construct(?string $directory=null){
        $this->directory=$directory??sys_get_temp_dir().'/khatyar-org-snapshot-'.hash('sha256',__DIR__);
        if(!is_dir($this->directory)&&!@mkdir($this->directory,0700,true)&&!is_dir($this->directory))throw new RuntimeException('Snapshot directory unavailable');
        if(is_link($this->directory)||!is_dir($this->directory)||(fileperms($this->directory)&0077)!==0)throw new RuntimeException('Unsafe snapshot directory');
    }
    private function path(string $token): string {
        if(!preg_match('/^[a-f0-9]{64}$/D',$token))throw new InvalidArgumentException('Invalid snapshot token');
        return $this->directory.'/'.$token.'.json';
    }
    public function save(int $owner,array $context,array $records): string {
        if($owner<=0)throw new InvalidArgumentException('Invalid snapshot owner');
        foreach(['year','month','finalized','forecast_remaining','include_surplus','template_id','template_version','policy_version'] as $key)
            if(!array_key_exists($key,$context))throw new InvalidArgumentException('Missing snapshot context');
        $seen=[];
        foreach($records as $record){
            $id=$record['user_id']??null;
            if(!is_int($id)||$id<=0||isset($seen[$id]))throw new InvalidArgumentException('Invalid snapshot personnel');
            $seen[$id]=true;
            if(!is_array($record['cells']??null)||count($record['cells'])!==10)throw new InvalidArgumentException('Invalid snapshot cells');
            foreach([7,8,9] as $col){
                if(!is_numeric($record['cells'][$col]??null)||!is_finite((float)$record['cells'][$col])||!is_string($record['comments'][$col]??null))throw new InvalidArgumentException('Invalid snapshot hours or comments');
            }
        }
        $token=bin2hex(random_bytes(32));$now=time();
        $payload=json_encode(['owner'=>$owner,'created'=>$now,'expires'=>$now+self::TTL,'context'=>$context,'records'=>$records],JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE|JSON_PRESERVE_ZERO_FRACTION);
        $json=json_encode(['sha256'=>hash('sha256',$payload),'payload'=>$payload],JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
        if(strlen($json)>self::MAX_BYTES)throw new RuntimeException('Snapshot too large');
        $tmp=tempnam($this->directory,'pending-');
        if($tmp===false)throw new RuntimeException('Cannot allocate snapshot');
        try{
            if(!chmod($tmp,0600)||file_put_contents($tmp,$json,LOCK_EX)!==strlen($json)||!rename($tmp,$this->path($token)))throw new RuntimeException('Cannot save snapshot');
        }finally{if(is_file($tmp))@unlink($tmp);}
        $this->cleanup();
        return $token;
    }
    public function load(int $owner,string $token,array $expected=[]): array {
        $path=$this->path($token);
        if(!is_file($path)||is_link($path)||filesize($path)>self::MAX_BYTES)throw new RuntimeException('Snapshot unavailable');
        $raw=file_get_contents($path);
        if($raw===false)throw new RuntimeException('Snapshot unavailable');
        $envelope=json_decode($raw,true,512,JSON_THROW_ON_ERROR);
        if(!is_string($envelope['payload']??null)||!is_string($envelope['sha256']??null)||!hash_equals($envelope['sha256'],hash('sha256',$envelope['payload'])))throw new RuntimeException('Snapshot integrity failure');
        $data=json_decode($envelope['payload'],true,512,JSON_THROW_ON_ERROR);
        if(($data['owner']??null)!==$owner||($data['expires']??0)<=time())throw new RuntimeException('Snapshot unavailable or expired');
        foreach($expected as $key=>$value)if(!array_key_exists($key,$data['context'])||$data['context'][$key]!==$value)throw new RuntimeException('Snapshot context changed');
        return $data;
    }
    public function cleanup(): void {
        foreach(glob($this->directory.'/*.json')?:[] as $path){
            if(!is_link($path)&&is_file($path)&&filemtime($path)<time()-self::TTL-60)@unlink($path);
        }
    }
}
