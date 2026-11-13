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
