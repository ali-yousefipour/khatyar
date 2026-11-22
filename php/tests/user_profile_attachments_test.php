<?php
final class Db {
  public static function one(string $sql,array $params=[]): array {
    if(str_contains($sql,'information_schema.tables'))return ['n'=>1];
    throw new RuntimeException('Unexpected DB query: '.$sql);
  }
  public static function all(string $sql,array $params=[]): array {
    if(str_contains($sql,'FROM user_profile_attachments WHERE user_id=?'))return [['field_id'=>7]];
    throw new RuntimeException('Unexpected DB query: '.$sql);
  }
}
require_once __DIR__.'/../lib/UserProfileAttachments.php';
require_once __DIR__.'/../lib/UserProfileFormValues.php';
function checkAttachment(string $label,bool $okay): void {
  if(!$okay)throw new RuntimeException('FAIL '.$label);
  echo "PASS ".$label."\n";
}
function rejectAttachment(string $label,callable $action): void {
  try{$action();}catch(InvalidArgumentException $expected){checkAttachment($label,true);return;}
  throw new RuntimeException('FAIL '.$label);
}
$pdf="%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n";
$meta=UserProfileAttachments::inspect($pdf,"پرونده.pdf","file");
checkAttachment('PDF magic and detected MIME validated',$meta['mime_type']==='application/pdf'&&$meta['extension']==='pdf');
checkAttachment('original Persian filename preserved safely',$meta['original_name']==='پرونده.pdf');
$traversal=UserProfileAttachments::inspect($pdf,'../بایگانی\\فرم.pdf','file');
checkAttachment('path separators sanitized without losing Persian text',
  $traversal['original_name']==='.._بایگانی_فرم.pdf');
$controls=UserProfileAttachments::inspect($pdf,"نسخه\nنهایی.pdf",'file');
checkAttachment('control characters in filename sanitized',$controls['original_name']==='نسخه_نهایی.pdf');
rejectAttachment('PDF rejected for image-only field',fn()=>UserProfileAttachments::inspect($pdf,'cover.pdf','image'));
rejectAttachment('HTML rejected even with misleading pdf extension',fn()=>UserProfileAttachments::inspect('<html><script>alert(1)</script></html>','fake.pdf','file'));
rejectAttachment('SVG rejected as an untrusted active document',fn()=>UserProfileAttachments::inspect('<svg xmlns="http://www.w3.org/2000/svg"></svg>','fake.png','image'));
rejectAttachment('oversized upload rejected before disk write',fn()=>UserProfileAttachments::inspect(str_repeat('A',8388609),'huge.pdf','file'));
$png=base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==',true);
if(is_string($png)){
  $image=UserProfileAttachments::inspect($png,'profile.png','image');
  checkAttachment('single-pixel PNG accepted only as a private image',$image['mime_type']==='image/png');
}
$requiredSchema=['sections'=>[['key'=>'documents','fields'=>[
  ['key'=>'cf_7','type'=>'image','binding'=>'custom','custom_field_id'=>7,'required'=>true],
  ['key'=>'cf_8','type'=>'file','binding'=>'custom','custom_field_id'=>8,'required'=>false]
]]]];
$hydrated=UserProfileAttachments::effectiveValues(17,$requiredSchema,[]);
checkAttachment('existing private image counts as populated required field',($hydrated['cf_7']??null)==='1');
checkAttachment('absent private PDF never masquerades as uploaded',array_key_exists('cf_8',$hydrated)&&$hydrated['cf_8']===null);
$planned=UserProfileFormValues::plan($requiredSchema,[],$hydrated,true,['id'=>17,'role_id'=>3]);
checkAttachment('unrelated profile changes are not blocked by uploaded required image',$planned['custom']===[]);
$missing=$hydrated;$missing['cf_7']=null;
rejectAttachment('missing required private image rejected',fn()=>UserProfileFormValues::plan($requiredSchema,[],$missing,true,['id'=>17,'role_id'=>3]));
echo "Private personnel attachment validation passed\n";
