import os,re,json,pathlib,collections,subprocess
p=pathlib.Path('.')
out=p/'audit-results';out.mkdir(exist_ok=True)
app=(p/'mobile/App.js').read_text(encoding='utf-8')
block=re.search(r'const screens=\[(.*?)\];return\s*<Stack.Navigator',app,re.S)
screens=[]
if block:
 screens=[dict(route=m.group(1),component=m.group(2),title=m.group(3),source='mobile/App.js',line=app.count('\n',0,block.start()+m.start())+1) for m in re.finditer(r"\['([^']+)',([A-Za-z0-9_]+),'([^']+)'\]",block.group(1))]
screens.insert(0,dict(route='Login',component='LoginScreen',title='ورود',source='mobile/App.js',line=app.count('\n',0,app.index('<Stack.Screen name="Login"'))+1))
for x in screens:
 name=x['component']
 hits=[str(f) for f in (p/'mobile/src').rglob(name+'.js')]
 x['source_component']=hits[0] if hits else 'not_resolved_from_name'
routeFile=p/'php/lib/routes.php';rt=routeFile.read_text(encoding='utf-8',errors='replace');lines=rt.splitlines()
hits=collections.Counter()
for pat in [r"\$router\s*->\s*(get|post|put|delete|patch)\s*\(",r'\b(?:Route|Router)::(get|post|put|delete|patch)\s*\(',r"\b(?:get|post|put|delete|patch)\s*\(\s*['\"]/",r"['\"](/api/[^'\"]+)['\"]"]:
 hits[pat]=len(re.findall(pat,rt,re.I))
samples=[dict(line=i+1,text=l[:300]) for i,l in enumerate(lines) if re.search(r"\b(?:get|post|put|delete|patch)\b|/api/|->route|routes\[",l,re.I)][:160]
web_html=[str(f) for f in (p/'php/app').rglob('*.html')]
panel=p/'php/tools/panel_source.jsx';paneltext=panel.read_text(encoding='utf-8',errors='replace')
ui={
 'php_app_html_pages':len(web_html),
 'web_html_paths':web_html,
 'panel_source_bytes':panel.stat().st_size,
 'panel_source_lines':len(paneltext.splitlines()),
 'panel_tab_candidates':len(re.findall(r'\b(?:tab|activeTab|setTab|sectionTab|subTab)\b',paneltext,re.I)),
 'panel_modal_candidates':len(re.findall(r'\b(?:Modal|modal|dialog|Dialog)\b',paneltext)),
 'panel_form_elements':len(re.findall(r'<(?:input|select|textarea|form)\b',paneltext,re.I)),
 'panel_table_tags':len(re.findall(r'<table\b',paneltext,re.I)),
 'panel_extracted_html_tables':len(re.findall(r'<table\b',paneltext,re.I)),
 'web_tab_dom_candidates':sum(len(re.findall(r'role=["\x27]tab["\x27]|data-tab=',(p/x).read_text(encoding='utf-8',errors='replace'),re.I)) for x in web_html)
}
route_data=dict(file='php/lib/routes.php',lines=len(lines),bytes=len(rt),pattern_hits=dict(hits),samples=samples)
for n,v in [('android_navigation_verified',screens),('backend_route_pattern_review',route_data),('web_ui_proxies',ui)]:
 (out/(n+'.json')).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf-8')
print('ADVANCED_AUDIT='+json.dumps(dict(android_registered_screens=len(screens),route_patterns=dict(hits),web_ui=ui),ensure_ascii=False)[:12000])
