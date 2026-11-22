import os,re,json,subprocess,collections,pathlib,hashlib
P=pathlib.Path('.'); paths=subprocess.check_output(['git','ls-files','-z']).decode().strip('\0').split('\0')
exts=collections.Counter();sections=collections.Counter();sha=collections.defaultdict(list);sums=collections.defaultdict(lambda:collections.Counter());files=[]
code={'.php','.js','.jsx','.ts','.tsx','.java','.kt','.cjs','.py','.sql','.html','.css','.sh','.ps1'}
text=code|{'.json','.md','.xml','.yml','.yaml','.txt'}
def kind(p):
 if p.startswith('web/mobile/') or p.startswith('web/php/') or p.startswith('web/backend/') or p.startswith('web/web/'):return 'mirrored'
 if '/vendor/' in p or '/node_modules/' in p or '/_legacy_unused/' in p or '.bundle.' in p or '.min.' in p:return 'generated_or_vendor'
 if re.search(r'(^|/)(test|tests|__tests__)/|[.]test[.]|[.]spec[.]',p,re.I):return 'test'
 if p.startswith('mobile/'):return 'android'
 if p.startswith('php/lib/'):return 'php_backend'
 if p.startswith('php/'):return 'web_php'
 if p.startswith('backend/'):return 'backend_js'
 if p.startswith('db/') or p.endswith('.sql'):return 'database'
 return 'other'
for path in paths:
 p=P/path; ext=p.suffix.lower();exts[ext or '(none)']+=1; k=kind(path);sections[k]+=1
 try:raw=p.read_bytes()
 except OSError:continue
 sha[hashlib.sha256(raw).hexdigest()].append(path)
 if ext not in text or b'\0' in raw:continue
 try:s=raw.decode('utf-8-sig')
 except UnicodeError:continue
 lines=s.splitlines();empty=sum(not x.strip() for x in lines);comment=sum(bool(re.match(r'\s*(//|/\*|\*|#|--|<!--)',x)) for x in lines if x.strip());sloc=max(0,len(lines)-empty-comment)
 row=dict(path=path,section=k,ext=ext,loc=len(lines),sloc_approx=sloc,blank=empty,comment_lines_approx=comment)
 files.append(row)
 if ext in code:
  sums[k].update(files=1,loc=len(lines),sloc_approx=sloc,blanks=empty,comment_lines_approx=comment)
app=(P/'mobile/App.js').read_text(errors='replace')
nav=[dict(name=m.group(1),component=m.group(2),line=app.count('\n',0,m.start())+1) for m in re.finditer(r'<(?:Stack|Tab|Drawer)[.]Screen\s+name=["\x27]([^"\x27]+)["\x27]\s+component=\{([\w.]+)',app)]
screen=[p for p in paths if p.startswith('mobile/src/screens/') and p.endswith(('.js','.jsx','.ts','.tsx'))]
modals=[];wizards=[];api=[];tables=set()
for row in files:
 path=row['path'];p=P/path
 if row['ext'] not in code:continue
 if not (path.startswith('mobile/src/') or path.startswith('php/')):continue
 if row['section'] in ('mirrored','generated_or_vendor','test'):continue
 s=p.read_text(errors='replace')
 if path.startswith('mobile/src/'):
  for m in re.finditer(r'<Modal\b|<BottomSheet\b|<Dialog\b|Alert[.]alert\s*\(',s):modals.append([path,s.count('\n',0,m.start())+1,m.group(0)])
  labels=sorted(set(re.findall(r'''step\s*===?\s*['"]([^'"]+)['"]''',s)))
  if len(labels)>1:wizards.append(dict(path=path,steps=labels))
 if path.startswith('php/'):
  api.extend(re.findall(r'''['"](/(?:api|admin|my|auth|session)/[^'"\s]{1,100})['"]''',s))
  tables.update(x.lower() for x in re.findall(r'\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z][A-Za-z0-9_]*)',s,re.I))
summary=dict(commit=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),files=len(paths),directories=len(set('/'.join(p.split('/')[:i]) for p in paths for i in range(1,len(p.split('/'))))),by_extension=dict(exts),by_section=dict(sections),code_totals={k:dict(v) for k,v in sums.items()},duplicate_group_count=sum(len(v)>1 for v in sha.values()),unique_content_count=len(sha),screen_files=len(screen),navigation_registrations=len(nav),mobile_modal_occurrences=len(modals),wizard_candidates=len(wizards),api_path_candidates=len(set(api)),table_name_candidates=len(tables),note='SLOC is heuristic; not cloc and not human-verified. Route strings are not registered endpoints.')
out=P/'audit-results';out.mkdir(exist_ok=True)
for name,data in [('summary',summary),('files',files),('navigation',nav),('screen_paths',screen),('modal_occurrences',modals),('wizard_candidates',wizards),('api_candidates',sorted(set(api))),('table_candidates',sorted(tables)),('duplicates',[v for v in sha.values() if len(v)>1])]:
 (out/(name+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print('KHATYAR_AUDIT_SUMMARY='+json.dumps(summary,ensure_ascii=False))
print('KHATYAR_AUDIT_NAV='+json.dumps(nav,ensure_ascii=False))
