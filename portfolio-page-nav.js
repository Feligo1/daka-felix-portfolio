(() => {
  const button=document.querySelector('.mobile-nav-toggle');
  const nav=document.querySelector('#portfolioNav');
  if(!button||!nav)return;
  const close=(focus=false)=>{nav.classList.remove('open');button.setAttribute('aria-expanded','false');if(focus)button.focus({preventScroll:true})};
  button.addEventListener('click',()=>{const open=nav.classList.toggle('open');button.setAttribute('aria-expanded',String(open));if(open)nav.querySelector('a')?.focus({preventScroll:true})});
  nav.addEventListener('click',ev=>{if(ev.target.closest('a'))close()});
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&nav.classList.contains('open'))close(true)});
  document.addEventListener('click',ev=>{if(!button.contains(ev.target)&&!nav.contains(ev.target))close()});
  matchMedia('(min-width:651px)').addEventListener?.('change',ev=>{if(ev.matches)close()});
})();