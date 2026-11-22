/* One accessible mobile navigation controller, shared by all public pages. */
(() => {
 const header=document.getElementById('mainHeader');
 const trigger=document.getElementById('menuBtn');
 const menu=document.getElementById('menuContent');
 if(!header||!trigger||!menu)return;
 const glyph=trigger.querySelector('.menu-glyph');
 // Older inline scripts expect a Font Awesome i element; keep compatibility without displaying a second icon.
 if(!trigger.querySelector('i')) {
   const compatIcon=document.createElement('i');
   compatIcon.className='fas fa-bars legacy-menu-icon';
   compatIcon.setAttribute('aria-hidden','true');
   compatIcon.hidden=true;
   trigger.append(compatIcon);
 }
 trigger.setAttribute('type','button');
 trigger.setAttribute('aria-controls','menuContent');
 trigger.setAttribute('aria-expanded','false');
 menu.setAttribute('role','navigation');
 menu.setAttribute('aria-label','Mobile navigation');
 const isOpen=()=>menu.classList.contains('show');
 function toggle(open,returnFocus=false){
   menu.classList.toggle('show',open);
   trigger.setAttribute('aria-expanded',String(open));
   trigger.setAttribute('aria-label',open?'Close navigation menu':'Open navigation menu');
   if(glyph)glyph.textContent=open?'×':'☰';
   const i=trigger.querySelector('i');
   i?.classList.toggle('fa-bars',!open);
   i?.classList.toggle('fa-times',open);
   if(open)menu.querySelector('a')?.focus({preventScroll:true});
   else if(returnFocus)trigger.focus({preventScroll:true});
 }
 // Capture click events so older page-level click handlers do not double-toggle the menu.
 trigger.addEventListener('click',event=>{
   event.preventDefault();event.stopImmediatePropagation();toggle(!isOpen());
 },true);
 menu.addEventListener('click',event=>{if(event.target.closest('a'))toggle(false)},true);
 document.addEventListener('click',event=>{
   if(isOpen()&&!header.contains(event.target))toggle(false);
 },true);
 document.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&isOpen()){event.preventDefault();toggle(false,true)}
 },true);
 const desktop=matchMedia('(min-width:1101px)');
 desktop.addEventListener?.('change',()=>{if(desktop.matches)toggle(false)});
})();