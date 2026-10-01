    </div>
  </div>);
}

// تنظیمات صحت‌سنجی حضور
function PresenceSettings(){
  const [cfg,setCfg]=useState({enabled:false,slots:[],window_minutes:1,grace_minutes:15,alarm:true,audience:'all_required',server_push:true,random_enabled:false});
  const [nt,setNt]=useState(""); const [saved,setSaved]=useState(false);
  useEffect(()=>{ db.settings().then(s=>{ if(s.presence_check) setCfg({enabled:!!s.presence_check.enabled,slots:s.presence_check.slots||[],window_minutes:s.presence_check.window_minutes||1,grace_minutes:s.presence_check.grace_minutes||15,alarm:s.presence_check.alarm!==false,audience:s.presence_check.audience||'all_required',server_push:s.presence_check.server_push!==false,random_enabled:!!s.presence_check.random_enabled}); }).catch(()=>{}); },[]);
  const addSlot=()=>{ if(!/^\d{2}:\d{2}$/.test(nt)){alert("ساعت را به شکل HH:MM وارد کنید، مثل 08:30");return;} if(cfg.slots.includes(nt))return; setCfg({...cfg,slots:[...cfg.slots,nt].sort()}); setNt(""); setSaved(false); };
  const delSlot=(s)=>{ setCfg({...cfg,slots:cfg.slots.filter(x=>x!==s)}); setSaved(false); };
  const save=async()=>{ await db.saveSettings({presence_check:cfg}); setSaved(true); };
  return(<div>
    <label className="row" style={{gap:8,marginBottom:12}}><input type="checkbox" checked={cfg.enabled} onChange={e=>{setCfg({...cfg,enabled:e.target.checked});setSaved(false);}}/><b>فعال‌سازی صحت‌سنجی حضور</b></label>
    <p style={{fontSize:13,color:"var(--muted)",marginBottom:10}}>{cfg.random_enabled?'زمان‌های تصادفی بعد از ثبت ورود هر پرسنل ساخته می‌شوند و در هر ۴ ساعت ۳ نوبت صحت‌سنجی برای همان فرد ایجاد می‌شود.':'در هر بازهٔ ساعتی تعریف‌شده، برای کاربرانِ «مشمول صحت‌سنجی» پنجره‌ای در اپ باز می‌شود تا سلفی و عکس خودروهای خط ارسال کنند.'}</p>
    <label className="row" style={{gap:8,marginBottom:12}}>
      <input type="checkbox" checked={!!cfg.random_enabled} onChange={e=>{setCfg({...cfg,random_enabled:e.target.checked});setSaved(false);}}/>
      <b>🎲 زمان‌بندی تصادفی صحت‌سنجی</b>
    </label>
    <p style={{fontSize:12.5,color:"var(--muted)",marginBottom:12}}>
      در صورت فعال بودن، ساعت‌های دستی استفاده نمی‌شوند. پس از هر ثبت ورود، برای همان پرسنل به‌صورت مستقل و تصادفی، در هر بازهٔ ۴ ساعته ۳ نوبت صحت‌سنجی تعیین و در نرم‌افزار ذخیره می‌شود.
    </p>
    {!cfg.random_enabled&&<>
      <div className="label">بازه‌های ساعتی روزانه:</div>
      <div className="chiprow" style={{margin:"8px 0"}}>{cfg.slots.length?cfg.slots.map(s=><span key={s} className="chip">{s} <b onClick={()=>delSlot(s)}>×</b></span>):<span className="muted" style={{fontSize:12}}>هنوز بازه‌ای تعریف نشده.</span>}</div>
      <div className="row" style={{gap:8,marginBottom:12}}>
        <input className="input" style={{maxWidth:120}} placeholder="08:30" value={nt} onChange={e=>setNt(e.target.value)}/>
        <button className="btn g" onClick={addSlot}>+ افزودن بازه</button>
      </div>
    </>}
    <div className="row" style={{gap:14,flexWrap:"wrap"}}>
      <div><label className="label">مهلت گرفتن عکس (دقیقه)</label><input className="input" type="number" min="1" style={{maxWidth:90}} value={cfg.window_minutes} onChange={e=>{setCfg({...cfg,window_minutes:Math.max(1,+e.target.value||1)});setSaved(false);}}/></div>
      <div><label className="label">مهلت تا ثبت تخلف (دقیقه)</label><input className="input" type="number" min="1" style={{maxWidth:90}} value={cfg.grace_minutes} onChange={e=>{setCfg({...cfg,grace_minutes:Math.max(1,+e.target.value||1)});setSaved(false);}}/></div>
    </div>
    <div style={{marginTop:14,marginBottom:8}}>
      <label className="label">ارسال صحت‌سنجی برای چه کسانی انجام شود؟</label>
      <select className="input" value={cfg.audience||'all_required'} onChange={e=>{setCfg({...cfg,audience:e.target.value});setSaved(false);}} style={{maxWidth:360}}>
        <option value="all_required">همهٔ کاربران مشمول صحت‌سنجی</option>
        <option value="shift_only">فقط کاربران مشمول که در ساعت شیفت کاری حضور دارند</option>
      </select>
      <p style={{fontSize:12,color:"var(--muted)",marginTop:5}}>در حالت دوم، سیستم براساس شیفت فعال و تاریخ تخصیص شیفت، صحت‌سنجی و تخلف عدم ارسال را فقط برای افراد داخل بازهٔ شیفت محاسبه می‌کند.</p>
    </div>
    <label className="row" style={{gap:8,marginTop:10,marginBottom:4}}><input type="checkbox" checked={cfg.server_push!==false} onChange={e=>{setCfg({...cfg,server_push:e.target.checked});setSaved(false);}}/><b>ارسال Push از سمت سرور در شروع هر بازه</b></label>
    <p style={{fontSize:12,color:"var(--muted)",marginBottom:6}}>برای دریافت هشدار وقتی اپ باز نیست یا صفحه خاموش است، کرون هر دقیقهٔ <code>/api/cron/presence-alert</code> باید روی هاست فعال باشد.</p>
    <label className="row" style={{gap:8,marginTop:14,marginBottom:4}}><input type="checkbox" checked={cfg.alarm!==false} onChange={e=>{setCfg({...cfg,alarm:e.target.checked});setSaved(false);}}/><b>🔊 پخش صدای آلارم هنگام صحت‌سنجی (حتی با صفحهٔ خاموش)</b></label>
    <p style={{fontSize:12,color:"var(--muted)",marginBottom:6}}>هنگام باز شدن پنجرهٔ صحت‌سنجی، صدای آلارم و لرزش برای جلب توجه کاربر پخش می‌شود.</p>
    <div className="row" style={{gap:10,marginTop:14}}><button className="btn p" onClick={save}>ذخیرهٔ تنظیمات صحت‌سنجی</button>{saved&&<span style={{color:"var(--ok)",fontSize:13}}>✓ ذخیره شد</span>}</div>
  </div>);
}

// تنظیم چیدمان داشبورد به تفکیک نقشِ بیننده
function DashboardConfig(){
  // گروه‌های «پرکار/کم‌کار» اکنون به‌صورت پویا از روی فهرست واقعی سمت‌ها ساخته می‌شوند
  // تا با افزودن هر سمت جدید (مثلاً گشت موتوری، گشت خودرویی، بازرس مقیم)، بدون نیاز به
  // تغییر کد، به‌طور خودکار در همین تنظیمات هم قابل‌پیکربندی باشد.