<?php
ini_set('display_errors','0');require __DIR__.'/../lib/Db.php';require __DIR__.'/../lib/Jwt.php';$C=require __DIR__.'/../config.php';
$h=$_SERVER['HTTP_AUTHORIZATION']??'';$q=(string)($_GET['access_token']??'');$raw='';if(preg_match('/Bearer\s+(.+)/i',$h,$m))$raw=trim($m[1]);elseif($q!=='')$raw=$q;else{http_response_code(401);exit;}
$p=Jwt::verify($raw,$C['jwt_secret']);if(!$p){http_response_code(401);exit;}
$rawPath=parse_url(trim((string)($_GET['path']??'')),PHP_URL_PATH);$rawPath='/'.ltrim($rawPath?:'','/');$ok=strpos($rawPath,'/uploads/line-locations/')===0||strpos($rawPath,'/uploads/stations/')===0;if(!$ok||strpos($rawPath,'..')!==false){http_response_code(404);exit;}
foreach([__DIR__.$rawPath,__DIR__.'/..'.$rawPath,__DIR__.'/../..'.$rawPath] as $f){if(is_file($f)){$mime=(new finfo(FILEINFO_MIME_TYPE))->file($f);if(strpos($mime,'image/')!==0){http_response_code(415);exit;}header('Content-Type:'.$mime);header('Cache-Control:private,max-age=3600');readfile($f);exit;}}
http_response_code(404);header('Content-Type:application/json;charset=utf-8');echo json_encode(['error'=>'تصویر یافت نشد'],JSON_UNESCAPED_UNICODE);
