<?php
require_once __DIR__.'/../lib/UserProfileForms.php';
$method=(new ReflectionClass(UserProfileForms::class))->getMethod('normalizeStartSchema');
$schema=['sections'=>[
  ['title'=>'کارگزینی','fields'=>[
    ['binding'=>'system','key'=>'employment_start_date','label'=>'شروع همکاری','type'=>'date'],
    ['binding'=>'system','key'=>'employment_end_date','label'=>'پایان همکاری','type'=>'date']]],
  ['title'=>'تکمیلی','fields'=>[
    ['binding'=>'system','key'=>'seniority_start','label'=>'شروع سنوات','type'=>'date']]]]];
$normalized=$method->invoke(null,$schema);
$dates=[];
foreach($normalized['sections'] as $section)foreach($section['fields'] as $field)
  if(in_array($field['key'],['employment_start_date','seniority_start'],true))$dates[]=$field;
if(count($dates)!==1||$dates[0]['key']!=='seniority_start'||$dates[0]['label']!=='شروع سنوات')
  throw new RuntimeException('Legacy personnel form did not normalize to one seniority start field');
if($schema['sections'][0]['fields'][0]['key']!=='employment_start_date')
  throw new RuntimeException('Published source schema was unexpectedly mutated');
echo "Canonical personnel form compatibility test passed.\n";
