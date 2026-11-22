/* Shared accessible navigation on legacy public pages.
   Uses capture phase to avoid double-toggle with the previous inline handlers. */
(() => {
  const trigger=document.getElementById('menuBtn');
  const menu=document.getElementById('menuContent');
  const header=document.getElementById('mainHeader');
  if(!trigger||!menu)return;
  trigger.setAttribute('type','button');
  trigger.setAttribute('aria-controls','menuContent');
  trigger.setAttribute('aria-expanded','false');
  trigger.setAttribute('aria-label','Open navigation menu');
  menu.setAttribute('aria-label','Mobile navigation');
  menu.setAttribute('role','navigation');
  const isOpen=()=>menu.classList.contains('show');
  function toggle(open,returnFocus=false){
    menu.classList.toggle('show',open);
    trigger.setAttribute('aria-expanded',String(open));
    trigger.setAttribute('aria-label',open?'Close navigation menu':'Open navigation menu');
    const icon=trigger.querySelector('i');
    if(icon){icon.classList.toggle('fa-bars',!open);icon.classList.toggle('fa-times',open)}
    if(open){menu.querySelector('a')?.focus({preventScroll:true})}
    else if(returnFocus)trigger.focus({preventScroll:true});
  }
  trigger.addEventListener('click',event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    toggle(!isOpen());
  },true);
  menu.addEventListener('click',event=>{
    if(event.target.closest('a'))toggle(false);
  },true);
  document.addEventListener('click',event=>{
    if(isOpen()&&!header.contains(event.target))toggle(false);
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&isOpen()){event.preventDefault();toggle(false,true)}
  },true);
  const breakpoint=matchMedia('(min-width: 1101px)');
  breakpoint.addEventListener?.('change',()=>{if(breakpoint.matches)toggle(false)});
})();
