<?php
require_once __DIR__.'/../lib/UserProfileAttachments.php';
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
echo "Private personnel attachment validation passed\n";
