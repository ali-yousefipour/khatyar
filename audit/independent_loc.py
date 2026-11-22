import json, pathlib, shutil, subprocess, collections
out=pathlib.Path('audit-results')
source=json.loads((out/'files.json').read_text(encoding='utf-8'))
allowed={'android','php_backend','web_php','backend_js','database'}
rows=[x for x in source if x['section'] in allowed and x['ext'] in {'.php','.js','.jsx','.ts','.tsx','.java','.kt','.cjs','.py','.sql','.html','.css','.sh','.ps1'}]
files=out/'independent_loc_file_list.txt'
files.write_text('\n'.join(x['path'] for x in rows)+'\n',encoding='utf-8')
result={'selected_files':len(rows),'classification':'section-based candidate; files considered code by extension','cloc_binary_found':bool(shutil.which('cloc')),'source_heuristic_sloc':sum(x['sloc_approx'] for x in rows),'source_physical_loc':sum(x['loc'] for x in rows)}
if shutil.which('cloc'):
 try:
  proc=subprocess.run(['cloc','--json','--quiet','--list-file='+str(files)],capture_output=True,text=True,timeout=130)
  result['cloc_exit_code']=proc.returncode
  if proc.returncode==0:
   payload,remaining=json.JSONDecoder().raw_decode(proc.stdout.lstrip())
   result['cloc_output_suffix']=proc.stdout.lstrip()[remaining:remaining+200]
   result['cloc_totals']=payload.get('SUM',{})
   result['cloc_by_language']={k:v for k,v in payload.items() if k not in ('SUM','header')}
  else:result['cloc_error']=proc.stderr[:500]
 except Exception as e:result['cloc_error']=str(e)
(out/'independent_loc_crosscheck.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print('CLOC_CROSSCHECK='+json.dumps(result,ensure_ascii=False)[:12000])
