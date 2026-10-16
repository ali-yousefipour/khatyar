const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const source=fs.readFileSync(path.join(__dirname,'../plugins/khatyar-radio-native/RadioSfxPlayer.java'),'utf8');
assert.ok(!source.includes('setStreamVolume'),'effects must not override user volume');
assert.ok(source.includes('newSingleThreadExecutor'),'effects cannot overlap each other');
const methods=source.slice(source.indexOf('  private static byte[] buildPcm('),source.lastIndexOf('}'));
const test=`public class RadioSfxTest {private static final int SAMPLE_RATE=8000;
${methods}
public static void main(String[] args){
String[] kinds={"receive_leadin","receive_tail","ptt_press","talk_start","roger","eot","release_click"};
int[] durations={70,85,60,60,90,110,25};
for(int index=0;index<kinds.length;index++){
byte[] bytes=buildPcm(kinds[index]);if(bytes.length!=durations[index]*16)throw new AssertionError("duration "+kinds[index]);
int peak=0;long energy=0,sum=0;for(int offset=0;offset<bytes.length;offset+=2){short sample=(short)((bytes[offset]&255)|((bytes[offset+1]&255)<<8));peak=Math.max(peak,Math.abs((int)sample));energy+=(long)sample*sample;sum+=sample;}
if(peak>8192||peak<100||energy==0)throw new AssertionError("peak/energy "+kinds[index]);
if(Math.abs(sum/(bytes.length/2))>300)throw new AssertionError("DC offset "+kinds[index]);
if(bytes[0]!=0||bytes[1]!=0)throw new AssertionError("click-free attack "+kinds[index]);
}
if(buildPcm("unknown").length!=0)throw new AssertionError("unknown effect");
System.out.println("Radio SFX: seven PCM profiles, duration, headroom, energy, DC and smooth attack passed");
}}
`;
const temporaryRoot=fs.realpathSync(os.tmpdir());
const directory=fs.mkdtempSync(path.join(temporaryRoot,'khatyar-radio-sfx-'));
try{
  const filename=path.join(directory,'RadioSfxTest.java');fs.writeFileSync(filename,test);
  for(const [command,args] of [['javac',['-encoding','UTF-8',filename]],['java',['-cp',directory,'RadioSfxTest']]]){
    const result=spawnSync(command,args,{encoding:'utf8'});if(result.error)throw result.error;assert.equal(result.status,0,result.stderr||result.stdout);if(result.stdout)process.stdout.write(result.stdout);
  }
}finally{const resolved=fs.realpathSync(directory);assert.equal(path.dirname(resolved),temporaryRoot,'temporary cleanup must remain inside its root');assert.ok(path.basename(resolved).startsWith('khatyar-radio-sfx-'));fs.rmSync(resolved,{recursive:true,force:true});}
