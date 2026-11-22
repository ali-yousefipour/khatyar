import pathlib,json,re,collections
ROOT=pathlib.Path('.');OUT=ROOT/'audit-results';OUT.mkdir(exist_ok=True)
tracked=[x for x in __import__('subprocess').check_output(['git','ls-files','-z']).decode().split('\0') if x]
sources=[x for x in tracked if (x.startswith('mobile/src/') or x=='mobile/App.js' or x.startswith('php/tools/') or x.startswith('php/app/')) and x.endswith(('.js','.jsx','.html')) and not any(t in x for t in ['/vendor/','panel.bundle.','_legacy_unused/']) ]
items=[];tab_states=[];web_modals=[];forms=[];wizards=[]
for path in sources:
 try:s=(ROOT/path).read_text(encoding='utf-8')
 except UnicodeError:continue
 area='android' if path.startswith('mobile/') else 'web'
 if area=='android':
  for m in re.finditer(r'<(Modal|BottomSheet|ActionSheet|Dialog)\b|Alert[.]alert\s*\(',s):
   items.append(dict(area=area,path=path,line=s.count('\n',0,m.start())+1,pattern=m.group(0),confidence='occurrence'))
  step_state=re.findall(r'''(?:const\s*\[\s*(\w*(?:step|stage|phase)\w*)\s*,|useState\s*\(\s*['"](intro|selfie|vehicles)['"])''',s,re.I)
  if step_state:
   values=sorted(set(re.findall(r'''(?:step|currentStep|wizardStep|stage)\s*===?\s*['"]([^'"]+)['"]''',s,re.I)))
   if len(values)>1:wizards.append(dict(area=area,path=path,steps=values,minimum_steps=len(values),confidence='candidate'))
 else:
  for m in re.finditer(r'''(?:const\s*\[\s*(\w*(?:[Mm]odal|[Dd]ialog|[Pp]opup)\w*)\s*,)|(?:\b(?:open|show|close)[A-Z]\w*(?:Modal|Dialog|Popup))''',s):
   web_modals.append(dict(path=path,line=s.count('\n',0,m.start())+1,identifier=m.group(1) or m.group(0),confidence='name_candidate'))
  for m in re.finditer(r'''(?:const\s*\[\s*(\w*(?:[Tt]ab|[Pp]ane)\w*)\s*,)|(?:data-tab\s*=)|(?:role=["']tab["'])''',s):
   tab_states.append(dict(path=path,line=s.count('\n',0,m.start())+1,identifier=m.group(1) or m.group(0),confidence='candidate'))
  for m in re.finditer(r'<(?:form|input|textarea|select)\b',s,re.I):
   forms.append(dict(path=path,line=s.count('\n',0,m.start())+1,tag=m.group(0)))
result={'source_files_scanned':len(sources),'android_modal_component_instances':len(items),'web_named_modal_candidates':len(web_modals),'web_tab_state_or_dom_candidates':len(tab_states),'web_form_input_occurrences':len(forms),'android_wizard_candidates_with_multiple_named_steps':len(wizards),'limitations':'heuristic patterns; not unique runtime UI; duplicates, nested JSX and dynamic permission states unresolved'}
for name,obj in [('ui_inventory_summary',result),('android_modal_occurrences_full',items),('web_modal_named_candidates',web_modals),('web_tab_candidates',tab_states),('web_form_field_occurrences',forms),('android_multi_step_candidates',wizards)]:
 (OUT/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf-8')
print('UI_CATALOG_SUMMARY='+json.dumps(result,ensure_ascii=False))
