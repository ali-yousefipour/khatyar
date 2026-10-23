const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {spawn,execFileSync}=require('node:child_process');
const php=process.env.PHP_BIN||'php',args=JSON.parse(process.env.PHP_TEST_ARGS||'[]');
const fixture=path.join(__dirname,'company_work_http_fixture.php');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'company-multipart-')),input=path.join(temp,'organization.xlsx');
async function freePort(){const s=net.createServer();await new Promise((r,j)=>s.once('error',j).listen(0,'127.0.0.1',r));const port=s.address().port;await new Promise(r=>s.close(r));return port;}
(async()=>{
  let server;
  try{
    execFileSync(php,[...args,fixture,'fixture',input]);
    const port=await freePort(),base='http://127.0.0.1:'+port;
    server=spawn(php,[...args,'-S','127.0.0.1:'+port,fixture],{stdio:['ignore','pipe','pipe']});
    let ready=false,logs='';server.stderr.on('data',d=>logs+=d.toString());
    for(let i=0;i<60;i++){try{await fetch(base+'/ready');ready=true;break;}catch{}await new Promise(r=>setTimeout(r,50));}
    assert(ready,'test PHP server started: '+logs);
    const send=async({year='1405',month='7',mode='preview',file=true}={})=>{
      const form=new FormData();if(year!==null)form.append('year',year);form.append('month',month);form.append('mode',mode);
      if(file)form.append('file',new Blob([fs.readFileSync(input)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'organization.xlsx');
      const res=await fetch(base+'/api/admin/company-work/import',{method:'POST',body:form});return {status:res.status,data:await res.json()};
    };
    const valid=await send();assert.equal(valid.status,200,JSON.stringify(valid.data));assert.equal(valid.data.rows.length,2);assert.equal(valid.data.rows[0].user_id,1);assert.equal(valid.data.rows[1].user_id,2);assert(!valid.data.rows[0].errors.length);assert(valid.data.sha256);
    const wrongMonth=await send({month:'8'});assert.equal(wrongMonth.status,422);assert(wrongMonth.data.error.includes('عنوان فایل سازمان'));
    const missingYear=await send({year:null});assert.equal(missingYear.status,422);assert(missingYear.data.error.includes('سال و ماه همراه فایل'));
    const wrongMode=await send({mode:'invalid'});assert.equal(wrongMode.status,422);assert(wrongMode.data.error.includes('نوع عملیات'));
    const noFile=await send({file:false});assert.equal(noFile.status,422);assert(noFile.data.error.includes('فایل سازمان'));
    console.log('PASS real multipart HTTP: canonical Http::body, uploaded file, Mehr 1405 period, preview mode, matched identities and validation failures');
  }finally{
    if(server&&server.exitCode===null){server.kill();await new Promise(r=>server.once('exit',r));}
    fs.rmSync(temp,{recursive:true,force:true});
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
