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
    if(!page.querySelector('.khatyar-scene-detail')){
      const scene=document.createElement('div');
      scene.className='khatyar-scene-detail';
      scene.setAttribute('aria-hidden','true');
      for(const t of ['مدیریت یکپارچه ناوگان','پایش و نظارت لحظه‌ای','گزارش‌های مدیریتی پیشرفته']){
        const pill=document.createElement('span');pill.textContent=t;scene.append(pill);
      }
      page.append(scene);
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
