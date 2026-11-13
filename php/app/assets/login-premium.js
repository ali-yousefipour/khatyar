/* Public visual enhancement for the existing React login. No authentication changes. */
(function(){
  'use strict';
  function enhance(){
    const page=document.querySelector('.login-page');
    if(!page)return;
    const brand=page.querySelector('.login-brand');
    const card=page.querySelector('.login-card');
    if(!brand||!card)return;
    const img=brand.querySelector('img');
    if(img && !img.dataset.khatyarPublicLogo){
      img.dataset.khatyarPublicLogo='1';
      img.src='/khatyar-transparent.png';
      img.alt='لوگوی رسمی خطیار';
    }
    // Visual method tabs mirror the method enforced by the server.
    // Inactive choices are informational, not fake working login controls.
    const method=card.querySelector('.login-method');
    if(method && !card.querySelector('.khatyar-method-tabs')){
      const activeLabel=(method.querySelector('strong')?.textContent||'').trim();
      const isPassword=activeLabel.includes('کلمه عبور')||activeLabel.includes('رمز عبور');
      const tabs=document.createElement('div');
      tabs.className='khatyar-method-tabs';
      tabs.setAttribute('role','group');
      tabs.setAttribute('aria-label','روش ورود تنظیم‌شده توسط سامانه');
      const options=[
        {label:'ورود با رمز عبور',active:isPassword,icon:'lock'},
        {label:'ورود با رمز یک‌بارمصرف',active:!isPassword,icon:'phone'}
      ];
      for(const option of options){
        const item=document.createElement('span');
        item.className='khatyar-auth-tab'+(option.active?' selected':' unavailable');
        item.setAttribute('aria-current',option.active?'true':'false');
        if(!option.active)item.title='این روش ورود در تنظیمات سامانه فعال نیست';
        item.textContent=option.label;
        tabs.append(item);
      }
      method.before(tabs);
    }
    // Approved Canva layout places the brand and heading ABOVE the auth card.
    // Keep the original React login form and every authentication callback untouched.
    if(!page.querySelector('.kh-login-intro')){
      const intro=document.createElement('div');
      intro.className='kh-login-intro';
      intro.innerHTML='<a href="/" class="kh-login-intro-logo" aria-label="صفحه نخست خطیار"><img src="/khatyar-transparent.png" width="165" height="215" alt="خطیار؛ سامانه مدیریت هوشمند تاکسیرانی"></a><h1>ورود به سامانه خطیار</h1><p>پلتفرم هوشمند مدیریت ناوگان تاکسیرانی برای سازمان‌ها، شرکت‌ها و مراکز عملیات شهری</p>';
      page.append(intro);
    }
    if(!card.querySelector('.login-support')){
      const links=document.createElement('nav');
      links.className='login-support';
      links.setAttribute('aria-label','پیوندهای راهنما');
      const home=document.createElement('a');home.href='/';home.textContent='بازگشت به صفحه نخست';
      const contact=document.createElement('a');contact.href='/contact';contact.textContent='پشتیبانی و تماس با ما';
      links.append(home,contact);
      const note=document.createElement('p');note.className='login-support-label';
      note.textContent='ورود فقط برای کاربران مجاز سازمانی امکان‌پذیر است.';
      card.append(links,note);
    }
  }
  function ready(){
    const root=document.getElementById('root');
    if(!root)return;
    enhance();
    const observer=new MutationObserver(enhance);
    observer.observe(root,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
  else ready();
})();
