<?php
class RadioTestResponse extends RuntimeException {public $data;function __construct($data,$code){parent::__construct('response',$code);$this->data=$data;}}
function rj($data,$code=200){throw new RadioTestResponse($data,$code);}function j($data,$code=200){rj($data,$code);}function re($message,$code=400){rj(['error'=>$message],$code);}function e($message,$code=400){re($message,$code);}
function ec($channel,$user){if(!in_array($channel,$user['channels'],true))re('forbidden',403);return ['current_speaker_id'=>null,'lock_until'=>null];}
function requireListenAll($user){if(empty($user['all']))re('forbidden',403);}
function radio_audio_url($id,$user){return '/audio/'.$id;}function audio_url($id){return '/audio/'.$id;}
class Db {
  static $queries=[];
  static function one($sql,$parameters=[]){self::$queries[]=[$sql,$parameters];if(str_contains($sql,'MAX'))return ['last_message_id'=>isset($parameters[0])?$parameters[0]*100:300];return ['id'=>2,'is_active'=>1];}
  static function all($sql,$parameters=[]){self::$queries[]=[$sql,$parameters];return [['id'=>201,'channel_id'=>2,'sender_id'=>8,'sender_name'=>'test','duration_ms'=>1000]];}
  static function run($sql,$parameters=[]){self::$queries[]=[$sql,$parameters];}
}
$source=file_get_contents(__DIR__.'/../app/radio-api-v2.php');$admin=file_get_contents(__DIR__.'/../app/radio-admin-api.php');$count=0;
function check($condition,$message){global $count;$count++;if(!$condition)throw new RuntimeException($message);}
function executeOp($source,$operation,$query,$user){
  $_GET=$query;$op=$operation;$method='GET';$u=$user;$me=$user;
  $line=null;foreach(explode("\n",$source) as $candidate)if(str_starts_with($candidate,"if(\$op==='".$operation."'&&\$method==='GET')")){$line=$candidate;break;}
  if($line===null)throw new RuntimeException('route missing');
  try{eval($line);}catch(RadioTestResponse $response){return $response;}
  throw new RuntimeException('no response');
}
$user=['id'=>9,'channels'=>[2],'all'=>true];
$result=executeOp($source,'poll',['channel_id'=>2,'after'=>1,'initialize'=>1],$user);check($result->getCode()===200 && $result->data['messages']===[],'initialization cannot return history');check($result->data['last_message_id']===200,'channel-scoped high water');
$last=end(Db::$queries);check($last[1]===[2],'cursor query bound to authorized channel');
$before=count(Db::$queries);$result=executeOp($source,'poll',['channel_id'=>1,'initialize'=>1],$user);check($result->getCode()===403 && count(Db::$queries)===$before,'initialize does not bypass membership');
$result=executeOp($source,'poll',['channel_id'=>2,'after'=>200],$user);check($result->data['messages'][0]['id']===201,'normal live polling retained');$query=array_values(array_filter(Db::$queries,fn($entry)=>str_contains($entry[0],'AND id>?')));check(end($query)[1]===[2,200],'normal polling uses caller cursor');
$result=executeOp($source,'poll-all',['initialize'=>1],$user);check($result->data['messages']===[] && $result->data['last_message_id']===300,'all-channel live baseline');
$user['all']=false;$before=count(Db::$queries);$result=executeOp($source,'poll-all',['initialize'=>1],$user);check($result->getCode()===403 && count(Db::$queries)===$before,'listen-all authorization preserved');
$result=executeOp($admin,'monitor',['channel_id'=>2,'initialize'=>1],$user);check($result->data['messages']===[] && $result->data['last_message_id']===200,'admin live baseline excludes archive');
echo 'Radio live API: '.$count.' assertions passed'.PHP_EOL;
