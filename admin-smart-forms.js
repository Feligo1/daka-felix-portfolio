/* Admin-only reusable suggestions. Actual permissions are enforced by Supabase RLS. */
import {supabase} from './supabase-client.js';

const fixedPhotoCategories=['Graduation','At Work','Personal','Events'];
const selectIds={
 'certificate:title':'certNamePreset',
 'certificate:issuer':'certIssuerPreset',
 'gallery:title':'galleryTitlePreset',
 'journal:title':'journalTitlePreset',
 'journal:topic':'journalTopic',
 'project:category':'projectCategory'
};
const fallback={
 'gallery:category':fixedPhotoCategories,
 'journal:topic':['Technology','Networking','Cybersecurity','Programming','Cloud Computing','IT Support','Project Updates','Artificial Intelligence','Database Systems','Web Development'],
 'project:category':['Software Development','Web Development','Cloud & AI','Networking','Cybersecurity','IT Support','Previous projects','Other']
};
let allOptions=[],canManage=false,loading=null;
const get=(selector)=>document.querySelector(selector);
const status=(text,error=false)=>{
 const node=get('#v2-options-status');
 if(node){node.textContent=text;node.setAttribute('role',error?'alert':'status');node.style.borderColor=error?'#c77c84':'#4a8073'}
};
const option=(text,value)=>new Option(text,value);
const slugify=text=>String(text||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,130).replace(/-+$/,'');
function getValues(group){
 const db=allOptions.filter(x=>x.section+':'+x.field_name===group&&x.is_active).map(x=>x.label);
 return [...new Set(db.length?db:(fallback[group]||[]))];
}
function setOptions(select,values,placeholder){
 if(!select)return;
 const previous=select.value;
 select.replaceChildren();
 if(placeholder)select.add(option(placeholder,''));
 for(const label of values)select.add(option(label,label));
 if([...select.options].some(x=>x.value===previous))select.value=previous;
}
function installOptions(){
 for(const [group,id] of Object.entries(selectIds)){
  const node=document.getElementById(id);
  if(!node)continue;
  if(id==='journalTopic'||id==='projectCategory'){
    const current=Array.from(node.options).filter(x=>x.value).map(x=>x.value);
    setOptions(node,[...new Set([...current,...getValues(group)])],null);
  }else{
    setOptions(node,getValues(group),'Choose a suggested '+(group.includes('issuer')?'issuer':'title')+' (optional)');
  }
 }
 const galleryCategory=document.getElementById('galleryCategory');
 if(galleryCategory){
  // These exact case-sensitive values match portfolio_gallery_category_check.
  const current=galleryCategory.value;
  setOptions(galleryCategory,fixedPhotoCategories,null);
  galleryCategory.value=fixedPhotoCategories.includes(current)?current:'Personal';
 }
}
function connectPreset(id,fieldSelector){
 const select=document.getElementById(id),field=get(fieldSelector);
 if(!select||!field)return;
 select.addEventListener('change',()=>{
  if(!select.value)return;
  field.value=select.value;
  field.dispatchEvent(new Event('input',{bubbles:true}));
  field.focus({preventScroll:true});
 });
}
connectPreset('certNamePreset','#certName');
connectPreset('certIssuerPreset','#certIssuer');
connectPreset('galleryTitlePreset','#v2-gallery-form [name="title"]');
connectPreset('journalTitlePreset','#v2-journal-form [name="title"]');

const journalForm=get('#v2-journal-form');
if(journalForm){
 const title=journalForm.elements.namedItem('title');
 const slug=journalForm.elements.namedItem('slug');
 title?.addEventListener('input',()=>{
  const isEditing=Boolean(journalForm.elements.namedItem('record_id')?.value);
  if(!isEditing&&!slug.dataset.manuallyEdited)slug.value=slugify(title.value);
 });
 slug?.addEventListener('input',()=>{slug.dataset.manuallyEdited='1'});
 journalForm.addEventListener('reset',()=>{delete slug.dataset.manuallyEdited});
}
// Project titles generate stable links while allowing manual overrides.
const projectForm=get('#v2-showcase-form');
if(projectForm){
 const projectTitle=projectForm.elements.namedItem('title');
 const projectSlug=projectForm.elements.namedItem('slug');
 projectTitle?.addEventListener('input',()=>{
  const editing=Boolean(projectForm.elements.namedItem('record_id')?.value);
  if(!editing&&!projectSlug.dataset.manuallyEdited)projectSlug.value=slugify(projectTitle.value);
 });
 projectSlug?.addEventListener('input',()=>{projectSlug.dataset.manuallyEdited='1'});
 projectForm.addEventListener('reset',()=>{delete projectSlug.dataset.manuallyEdited});
}
get('#journalExcerptHelper')?.addEventListener('click',()=>{
 const form=get('#v2-journal-form'),body=form?.elements.namedItem('body')?.value?.trim(),
 excerpt=form?.elements.namedItem('summary');
 if(!excerpt)return;
 if(!body){const n=get('#v2-journal-status');if(n)n.textContent='Write some article content before generating an excerpt.';return}
 if(excerpt.value.trim()&&!window.confirm('Replace the existing excerpt with a suggestion from your article?'))return;
 excerpt.value=body.replace(/\s+/g,' ').slice(0,190).trim();
 excerpt.focus();
});

async function checkAuthorized(){
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return false;
 const {data:role,error:roleError}=await supabase.from('portfolio_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 return !roleError&&!!role;
}
async function refreshSuggestions(){
 if(!canManage)return;
 const {data,error}=await supabase.from('portfolio_form_options')
 .select('id,section,field_name,label,is_active,sort_order')
 .order('sort_order',{ascending:true}).order('label',{ascending:true});
 if(error){status('Suggestions are unavailable: '+error.message,true);installOptions();return}
 allOptions=data||[];
 installOptions();
 renderManagedOptions();
}
function renderManagedOptions(){
 const list=get('#adminOptionList'),group=get('#adminOptionGroup')?.value;
 if(!list)return;
 list.replaceChildren();
 const entries=allOptions.filter(x=>x.section+':'+x.field_name===group&&x.is_active);
 if(!entries.length){
  const p=document.createElement('p');p.textContent='No suggestions yet. Add one above.';list.append(p);return;
 }
 for(const record of entries){
  const row=document.createElement('div');row.className='v2-row';
  const strong=document.createElement('strong');strong.textContent=record.label;
  const remove=document.createElement('button');remove.type='button';remove.textContent='Remove suggestion';remove.className='preset-delete';
  remove.addEventListener('click',async()=>{
    if(!window.confirm('Remove this saved suggestion? Existing published content will not change.'))return;
    remove.disabled=true;
    const {error}=await supabase.from('portfolio_form_options').update({is_active:false}).eq('id',record.id);
    if(error){status('Could not remove suggestion: '+error.message,true);remove.disabled=false;return}
    status('Suggestion removed. Existing content remains unchanged.');
    await refreshSuggestions();
  });
  row.append(strong,remove);list.append(row);
 }
}
get('#adminOptionGroup')?.addEventListener('change',renderManagedOptions);
get('#adminOptionForm')?.addEventListener('submit',async event=>{
 event.preventDefault();
 if(!canManage){status('Sign in as an authorized administrator.',true);return}
 const form=event.currentTarget,submit=form.querySelector('[type="submit"]');
 const [section,field_name]=get('#adminOptionGroup').value.split(':');
 const label=get('#adminOptionValue').value.trim().slice(0,160);
 if(!label){status('Enter a suggestion.',true);return}
 submit.disabled=true;
 try{
   const existing=allOptions.find(x=>x.section===section&&x.field_name===field_name&&x.label.toLowerCase()===label.toLowerCase());
   if(existing){
     if(!existing.is_active){
       const {error}=await supabase.from('portfolio_form_options').update({is_active:true}).eq('id',existing.id);
       if(error)throw error;
       status('Suggestion restored.');
     }else status('That suggestion already exists.');
   }else{
     const {error}=await supabase.from('portfolio_form_options').insert({section,field_name,label});
     if(error)throw error;
     status('Suggestion saved.');
   }
   get('#adminOptionValue').value='';
   await refreshSuggestions();
 }catch(error){
   status(error.code==='23505'?'That suggestion already exists.':'Unable to save suggestion: '+error.message,true);
 }finally{submit.disabled=false}
});
async function start(){
 if(loading)return loading;
 loading=(async()=>{
  canManage=await checkAuthorized();
  if(canManage){await refreshSuggestions();status('Choose a group to review or add suggestions.')}
  else installOptions();
 })();
 try{await loading}finally{loading=null}
}

let localCertificatePreviewUrl=null;
function resetLocalCertificatePreview(){
 if(localCertificatePreviewUrl){URL.revokeObjectURL(localCertificatePreviewUrl);localCertificatePreviewUrl=null}
 const box=get('#certLocalPreview');
 box?.replaceChildren();
}
get('#certImageFile')?.addEventListener('change',event=>{
 resetLocalCertificatePreview();
 const file=event.currentTarget.files?.[0],box=get('#certLocalPreview');
 if(!file||!box)return;
 const name=document.createElement('p');name.className='cert-local-file-name';name.textContent='Selected: '+file.name;
 box.append(name);
 if(file.size>20*1024*1024){
  const warn=document.createElement('p');warn.className='cert-local-file-error';warn.textContent='This file is above the 20 MB upload limit.';box.append(warn);return;
 }
 const image=/^image\/(jpeg|png|webp|gif)$/.test(file.type);
 const pdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name);
 if(image||pdf){
  localCertificatePreviewUrl=URL.createObjectURL(file);
  const preview=image?document.createElement('img'):document.createElement('iframe');
  preview.src=localCertificatePreviewUrl;
  if(image)preview.alt='Selected certificate before upload';
  else preview.title='Selected PDF preview before upload';
  box.append(preview);
 }else{
  const p=document.createElement('p');p.textContent='Word documents can be opened or previewed from the published certificate viewer after uploading.';box.append(p);
 }
});
get('#addCertForm')?.addEventListener('reset',resetLocalCertificatePreview);

installOptions();
start();
supabase.auth.onAuthStateChange((event)=>{
 if(event==='SIGNED_IN'||event==='INITIAL_SESSION')queueMicrotask(start);
 if(event==='SIGNED_OUT'){canManage=false;allOptions=[];installOptions();get('#adminOptionList')?.replaceChildren();status('Sign in to manage suggestions.')}
});
