import {supabase} from './supabase-client.js';
const tables={showcase:{table:'portfolio_projects',title:'Project',fields:['title','slug','summary','description','category','technologies','github_url','demo_url','display_order','is_featured'],bucket:'portfolio-project-media',media:'cover_url'},gallery:{table:'portfolio_gallery',title:'Gallery photo',fields:['title','category','caption','alt_text','event_date'],bucket:'portfolio-gallery',media:'media_url'},journal:{table:'portfolio_journal',title:'Journal article',fields:['title','slug','summary','body','category'],bucket:'portfolio-journal-media',media:'cover_url'},recommendations:{table:'portfolio_recommendations',title:'Recommendation',fields:['person_name','job_title','organization','quote'],bucket:null,media:null}};
const E=(tag,text='',attrs={})=>{const n=document.createElement(tag);n.textContent=String(text??'');Object.entries(attrs).forEach(([k,v])=>{if(v!=null)n.setAttribute(k,String(v))});return n};
let authorized=false;
function explainFeedback(error){
 const text=String(error?.message||error||'An unexpected error occurred.');
 if(/portfolio_gallery_category_check|violates check constraint.*category/i.test(text))return 'Choose Graduation, At Work, Personal or Events for this photo.';
 if(/bucket not found|bucket does not exist/i.test(text))return 'Storage bucket unavailable. Open Storage Health to identify it. Details: '+text;
 if(/row.level security|permission denied|not authorized|unauthorized|403|401/i.test(text))return 'Permission denied. Use an approved admin account and sign in again. Details: '+text;
 if(/relation .*does not exist|42P01|could not find the table/i.test(text))return 'The database table is unavailable. Check Storage Health and database setup. Details: '+text;
 if(/413|payload too large/i.test(text))return 'Your file exceeds the upload limit for this section.';
 return text;
}
const msg=(section,text,err=false)=>{
 const n=document.querySelector('#v2-'+section+'-status');
 if(n){n.textContent=err?explainFeedback(text):text;n.style.borderColor=err?'#c87983':'#477a76';n.setAttribute('role',err?'alert':'status')}
};
async function check(){const{data:{user},error}=await supabase.auth.getUser();if(error||!user)throw Error('Sign in to manage portfolio content.');const{data:role,error:roleError}=await supabase.from('portfolio_admins').select('user_id').eq('user_id',user.id).maybeSingle();if(roleError||!role)throw Error('Your account is not authorized to manage portfolio content.');authorized=true}
async function upload(section,file){if(!file)return null;const cfg=tables[section];if(!cfg.bucket)throw Error('This section does not support uploads.');const image=/^image\/(jpeg|png|webp|gif)$/.test(file.type);const video=['showcase','gallery'].includes(section)&&/^video\/(mp4|webm)$/.test(file.type);if(!image&&!video)throw Error('Unsupported media type. Use JPG, PNG, WebP or GIF'+(section==='showcase'?', MP4 or WebM.':'.'));const max=video?20:10;if(file.size>max*1024*1024)throw Error('File too large (limit '+max+' MB).');const extension=(file.type.split('/')[1]||'bin').replace('jpeg','jpg');const path='published/'+crypto.randomUUID()+'.'+extension;const {error}=await supabase.storage.from(cfg.bucket).upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});if(error)throw error;return supabase.storage.from(cfg.bucket).getPublicUrl(path).data.publicUrl}

async function removeManagedUpload(bucket,url){
 if(!bucket||!url)return null;
 try{
  const parsed=new URL(url);
  if(parsed.origin!==new URL('https://pthcviwhcsluovdekjub.supabase.co').origin)return null;
  const prefix='/storage/v1/object/public/'+bucket+'/';
  if(!parsed.pathname.startsWith(prefix))return null;
  const objectPath=decodeURIComponent(parsed.pathname.slice(prefix.length));
  if(!/^published\/[0-9a-f-]{36}\.(?:jpg|png|webp|gif|mp4|webm)$/i.test(objectPath))return null;
  const{error}=await supabase.storage.from(bucket).remove([objectPath]);
  return error?.message||null;
 }catch(error){return error.message}
}

function validateUrl(value){if(!value)return null;const url=new URL(value);if(url.protocol!=='https:')throw Error('Use an HTTPS URL.');return url.toString()}
function payload(section,form){const cfg=tables[section];const data={};for(const key of cfg.fields){const element=form.elements.namedItem(key);if(!element)continue;const value=element.value.trim();data[key]=key==='technologies'?value.split(',').map(x=>x.trim()).filter(Boolean):key==='display_order'?(Number.parseInt(value,10)||0):key==='is_featured'?element.checked:(['github_url','demo_url'].includes(key)?validateUrl(value):value)}if(section==='showcase'||section==='journal'){data.slug=data.slug.toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');if(!data.slug)throw Error('Enter a valid URL slug.')}if(section==='gallery'){
 const choices=['Graduation','At Work','Personal','Events'];
 const normalized=String(data.category||'').trim().toLowerCase();
 const canonical=choices.find(x=>x.toLowerCase()===normalized);
 if(!canonical)throw Error('Select a valid photo category: Graduation, At Work, Personal or Events.');
 data.category=canonical;
 if(!data.event_date)data.event_date=null;
}
data.is_published=!!form.elements.namedItem('is_published')?.checked;if(section==='recommendations'){data.permission_confirmed=!!form.elements.namedItem('permission_confirmed')?.checked;if(data.is_published&&!data.permission_confirmed)throw Error('Confirm permission before publishing the recommendation.')}return data}
function setForm(section,data){const form=document.querySelector('#v2-'+section+'-form');form.reset();for(const key of tables[section].fields){const f=form.elements.namedItem(key);if(f){if(f.type==='checkbox')f.checked=!!data[key];else if(section==='gallery'&&key==='category'){f.value=['Graduation','At Work','Personal','Events'].includes(data.category)?data.category:'Personal'}
else if(f.tagName==='SELECT' && section!=='gallery'){
 const selected=String(data[key]??'');
 if(selected && !Array.from(f.options).some(x=>x.value===selected))f.add(new Option(selected,selected));
 f.value=selected||f.value;
 }else f.value=Array.isArray(data[key])?data[key].join(', '):(data[key]??'')}}if(section==='gallery'){
 const link=form.elements.namedItem('external_video');
 if(link)link.value=data.media_type==='external_video'?(data.media_url||''):'';
}
form.elements.namedItem('record_id').value=data.id||'';form.elements.namedItem('is_published').checked=!!data.is_published;if(section==='recommendations')form.elements.namedItem('permission_confirmed').checked=!!data.permission_confirmed;form.querySelector('button[type=submit]').textContent=data.id?'Save changes':'Save new '+tables[section].title.toLowerCase();form.scrollIntoView({behavior:'smooth',block:'start'})}
async function refresh(section){if(!authorized)return;const cfg=tables[section],box=document.querySelector('#v2-'+section+'-list');box.replaceChildren(E('p','Loading…'));const{data,error}=await supabase.from(cfg.table).select('*').order('created_at',{ascending:false}).limit(100);if(error){box.replaceChildren(E('p','Could not load data: '+error.message));return}box.replaceChildren();if(!data.length){box.append(E('p','No entries yet. Create the first one.'));return}for(const item of data){const row=E('div','',{class:'v2-row'}),info=E('div'),actions=E('div','',{class:'v2-row-actions'});info.append(E('strong',item.title||item.person_name||'Untitled'),E('small',(item.is_published?'Published':'Draft')+' · '+new Date(item.created_at).toLocaleDateString()));const edit=E('button','Edit',{type:'button'});edit.addEventListener('click',()=>setForm(section,item));const remove=E('button','Delete',{type:'button'});remove.addEventListener('click',async()=>{if(!confirm('Delete this '+cfg.title.toLowerCase()+'? This cannot be undone.'))return;remove.disabled=true;let oldMedia=[];
if(section==='showcase'){
 const{data:child,error:childError}=await supabase.from('portfolio_project_media').select('media_url,media_type').eq('project_id',item.id);
 if(childError){msg(section,childError.message,true);remove.disabled=false;return}
 oldMedia=child.filter(x=>x.media_type!=='external_video').map(x=>x.media_url);
}
const{error}=await supabase.from(cfg.table).delete().eq('id',item.id);
if(error){msg(section,error.message,true);remove.disabled=false}else{
 const warnings=[];
 if(cfg.media&&item[cfg.media]){const issue=await removeManagedUpload(cfg.bucket,item[cfg.media]);if(issue)warnings.push(issue)}
 for(const url of oldMedia){const issue=await removeManagedUpload('portfolio-project-media',url);if(issue)warnings.push(issue)}
 msg(section,warnings.length?'Record deleted; some media needs cleanup: '+warnings.join('; '):'Entry and managed media deleted.',!!warnings.length);
 await refresh(section);
}});actions.append(edit,remove);row.append(info,actions);box.append(row)}}
async function submit(section,event){
 event.preventDefault();
 const cfg=tables[section],form=event.currentTarget,button=form.querySelector('button[type=submit]');
 button.disabled=true;
 let newUpload=null;
 try{
  await check();
  msg(section,'Saving changes…');
  const data=payload(section,form),id=form.elements.namedItem('record_id').value;
  const file=form.elements.namedItem('media_file')?.files?.[0];
  const external=section==='gallery'?form.elements.namedItem('external_video')?.value.trim():null;
  if(section==='gallery'&&file&&external)throw Error('Select either a file or a YouTube video link, not both.');
  if(section==='gallery'&&external){
   const url=new URL(external);
   if(url.protocol!=='https:'||url.hostname!=='www.youtube.com'||!/^\/embed\/[A-Za-z0-9_-]{11}$/.test(url.pathname))
    throw Error('Use a secure YouTube embed link (https://www.youtube.com/embed/VIDEO_ID).');
   data.media_url=url.origin+url.pathname;
   data.media_type='external_video';
  }
  if(section==='gallery'&&!id&&!file&&!external){
   if(data.is_published)throw Error('Upload a picture or provide a video before publishing.');
   data.media_url='';
   data.media_type='image';
  }
  if(section==='gallery'&&id&&!file&&!external){
   const{data:existing,error:existingError}=await supabase.from('portfolio_gallery')
    .select('media_url,media_type').eq('id',id).single();
   if(existingError)throw existingError;
   if(data.is_published&&!existing?.media_url)throw Error('Add a picture or video before publishing this story.');
   data.media_type=existing?.media_type||'image';
  }
  if(file){
   if(!data.is_published)throw Error('Public media uploads require a published entry. Save a draft without media, then publish with a file.');
   if(!cfg.media)throw Error('Media upload is unsupported for this section.');
   newUpload=await upload(section,file);
   data[cfg.media]=newUpload;
   if(section==='showcase')data.cover_alt=data.title;
   if(section==='gallery')data.media_type=file.type.startsWith('video/')?'video':'image';
  }
  const query=id?supabase.from(cfg.table).update(data).eq('id',id):supabase.from(cfg.table).insert(data);
  const{error}=await query;
  if(error)throw error;
  form.reset();form.elements.namedItem('record_id').value='';
  button.textContent='Save new '+cfg.title.toLowerCase();
  msg(section,id?'Changes saved.':'New entry saved.');
  await refresh(section);
  if(section==='showcase')await refreshProjectOptions();
 }catch(err){
  if(newUpload)await removeManagedUpload(cfg.bucket,newUpload);
  msg(section,err,true);
 }finally{button.disabled=false}
}

async function refreshOverview(){
 try{
 await check();
 const mapping={projects:'portfolio_projects',gallery:'portfolio_gallery',journal:'portfolio_journal',recommendations:'portfolio_recommendations'};
 const counts=await Promise.all(Object.entries(mapping).map(async([key,table])=>{
   let q=supabase.from(table).select('id',{head:true,count:'exact'}).eq('is_published',true);
   if(key==='recommendations')q=q.eq('permission_confirmed',true);
   const{count,error}=await q;return {key,count,error}
 }));
 let failures=0;
 for(const c of counts){const node=document.getElementById('v2-count-'+c.key);if(node)node.textContent=c.error?'—':String(c.count??0);if(c.error)failures++}
 const status=document.getElementById('v2-overview-status');
 if(status)status.textContent=failures?failures+' content area(s) unavailable. Check the admin account and database permissions.':'Published content counts loaded.';
 }catch(err){const status=document.getElementById('v2-overview-status');if(status)status.textContent=err.message}
}
document.getElementById('v2-overview-refresh')?.addEventListener('click',refreshOverview);


const editableSettings=['hero_title','hero_nickname','hero_description','specialty_tags','contact_email','contact_phone','contact_github','contact_linkedin','contact_facebook','contact_whatsapp'];
async function loadSiteSettings(){
 try{
 await check();
 const form=document.getElementById('v2-settings-form');if(!form)return;
 const{data,error}=await supabase.from('site_settings').select('setting_key,setting_value').in('setting_key',editableSettings);
 if(error)throw error;
 const map=Object.fromEntries((data||[]).map(row=>[row.setting_key,row.setting_value]));
 for(const key of editableSettings){
   const field=form.elements.namedItem(key);if(!field)continue;
   const value=map[key]??'';
   if(key==='specialty_tags'){
     try{const arr=JSON.parse(value);field.value=Array.isArray(arr)?arr.join(', '):String(value)}catch{field.value=String(value)}
   }else field.value=String(value);
 }
 msg('settings','Current website settings loaded.');
 }catch(error){msg('settings','Could not load settings: '+error.message,true)}
}
document.getElementById('v2-settings-form')?.addEventListener('submit',async event=>{
 event.preventDefault();
 const form=event.currentTarget,button=form.querySelector('button[type=submit]');
 button.disabled=true;msg('settings','Saving…');
 try{
  await check();
  for(const key of editableSettings){
   const field=form.elements.namedItem(key);if(!field)continue;
   let value=field.value.trim();
   if(key==='hero_title'&&!value)throw Error('Professional name cannot be empty.');
   if(key==='specialty_tags')value=JSON.stringify(value.split(',').map(x=>x.trim()).filter(Boolean));
   if(key.startsWith('contact_')&&!['contact_email','contact_phone'].includes(key)&&value)value=validateUrl(value);
   const{data,error}=await supabase.from('site_settings').update({setting_value:value}).eq('setting_key',key).select('setting_key');
   if(error)throw error;
   if(!data?.length){
    const{error:insertError}=await supabase.from('site_settings').insert({setting_key:key,setting_value:value});
    if(insertError)throw insertError;
   }
  }
  msg('settings','Website settings saved. Refresh the public site to see changes.');
 }catch(error){msg('settings','Settings update failed: '+error.message,true)}
 finally{button.disabled=false}
});

async function diagnostics(){const box=document.querySelector('#v2-storage-status');box.replaceChildren(E('p','Checking schema and bucket access…'));try{await check()}catch(e){box.replaceChildren(E('p',e.message));return}const buckets=['portfolio-images','portfolio-certificate-files','portfolio-documents','portfolio-project-media','portfolio-gallery','portfolio-journal-media'];box.replaceChildren();for(const name of buckets){const row=E('div','',{class:'v2-row'}),label=E('strong',name),status=E('small','Checking…');row.append(label,status);box.append(row);const {error}=await supabase.storage.from(name).list('',{limit:1});status.textContent=error?'Cannot verify: '+error.message:'Accessible (list permission verified)'}for(const section of Object.keys(tables)){const {error}=await supabase.from(tables[section].table).select('*',{count:'exact',head:true});const row=E('div','',{class:'v2-row'});row.append(E('strong',tables[section].table),E('small',error?'Not ready: '+error.message:'Accessible'));box.append(row)}box.append(E('p','Checks confirm read/list access only. A successful upload and owner-only authorization test are still required before production.',{class:'v2-notice'}))}

async function activate(section){if(!document.getElementById('v2-'+section+'-form')&&section!=='storage')return;try{await check();if(section==='storage')await diagnostics();else {await refresh(section);if(section==='showcase'){await refreshProjectOptions();await refreshProjectMedia()}}}catch(e){msg(section,e.message,true)}}

async function refreshProjectOptions(){
 if(!authorized)return;
 const sel=document.querySelector('#v2-media-project');if(!sel)return;
 const previous=sel.value;
 const{data,error}=await supabase.from('portfolio_projects').select('id,title,is_published').order('title');
 sel.replaceChildren(E('option','Choose a published project',{value:''}));
 if(error){msg('showcase',error.message,true);return}
 for(const p of data??[]){if(!p.is_published)continue;sel.append(E('option',p.title,{value:p.id}))}
 if(previous&&[...sel.options].some(o=>o.value===previous))sel.value=previous;
}
async function refreshProjectMedia(){
 if(!authorized)return;
 const id=document.querySelector('#v2-media-project')?.value,root=document.querySelector('#v2-media-list');
 if(!root)return;root.replaceChildren();
 if(!id){root.append(E('p','Choose a published project to manage its media.'));return}
 const {data,error}=await supabase.from('portfolio_project_media').select('*').eq('project_id',id).order('sort_order');
 if(error){root.append(E('p',error.message));return}
 if(!data?.length){root.append(E('p','No demonstration media uploaded for this project.'));return}
 for(const m of data){
 const row=E('div','',{class:'v2-row'}),info=E('div'),actions=E('div','',{class:'v2-row-actions'});
 info.append(E('strong',m.caption||m.media_type),E('small',m.media_type+' · '+m.media_url.slice(0,80)));
 const edit=E('button','Edit details',{type:'button'});
 edit.addEventListener('click',async()=>{
   const caption=prompt('Media caption:',m.caption||'');if(caption===null)return;
   const alt=prompt('Image description:',m.alt_text||'');if(alt===null)return;
   const order=prompt('Display order:',String(m.sort_order??0));if(order===null)return;
   const sort_order=Number.parseInt(order,10);
   if(!Number.isInteger(sort_order)){msg('showcase','Enter a valid numeric display order.',true);return}
   edit.disabled=true;
   const{error}=await supabase.from('portfolio_project_media').update({caption:caption.trim().slice(0,200),alt_text:alt.trim().slice(0,300),sort_order}).eq('id',m.id);
   if(error){msg('showcase',error.message,true);edit.disabled=false}
   else {msg('showcase','Media details updated.');await refreshProjectMedia()}
 });
 const del=E('button','Delete',{type:'button'});
 del.addEventListener('click',async()=>{
   if(!confirm('Delete this media entry?'))return;
   del.disabled=true;
   const{error}=await supabase.from('portfolio_project_media').delete().eq('id',m.id);
   if(error){msg('showcase',error.message,true);del.disabled=false}
   else{
    const issue=m.media_type==='external_video'?null:await removeManagedUpload('portfolio-project-media',m.media_url);
    msg('showcase',issue?'Media record deleted; storage cleanup failed: '+issue:'Media record and managed file deleted.',!!issue);
    await refreshProjectMedia();
   }
 });
 actions.append(edit,del);row.append(info,actions);root.append(row)
}
}
document.querySelector('#v2-media-project')?.addEventListener('change',refreshProjectMedia);
document.querySelector('#v2-project-media-form')?.addEventListener('submit',async event=>{
 event.preventDefault();
 const form=event.currentTarget,button=form.querySelector('button[type=submit]');
 button.disabled=true;let uploadedUrl=null;
 try{
  await check();
  const projectId=form.elements.namedItem('project_id').value,
    caption=form.elements.namedItem('caption').value.trim(),
    alt=form.elements.namedItem('alt_text').value.trim(),
    file=form.elements.namedItem('media_file').files[0],
    external=form.elements.namedItem('external_video').value.trim();
  if(!projectId)throw Error('Choose a published project.');
  if(!!file===!!external)throw Error('Provide either one media file or one YouTube embed URL.');
  let media_url,media_type;
  if(file){
   uploadedUrl=await upload('showcase',file);
   media_url=uploadedUrl;
   media_type=file.type.startsWith('video/')?'video':'image';
  }else{
   const url=new URL(external);
   if(url.protocol!=='https:'||url.hostname!=='www.youtube.com'||!/^\/embed\/[A-Za-z0-9_-]{11}$/.test(url.pathname))
    throw Error('Use an HTTPS YouTube embed URL (youtube.com/embed/VIDEO_ID).');
   media_url=url.origin+url.pathname;
   media_type='external_video';
  }
  const{error}=await supabase.from('portfolio_project_media').insert({
    project_id:projectId,caption,alt_text:alt,media_url,media_type
  });
  if(error)throw error;
  form.elements.namedItem('media_file').value='';
  form.elements.namedItem('external_video').value='';
  msg('showcase','Project media saved.');
  await refreshProjectMedia();
 }catch(err){
  if(uploadedUrl)await removeManagedUpload('portfolio-project-media',uploadedUrl);
  msg('showcase',err,true);
 }finally{button.disabled=false}
});

for(const section of Object.keys(tables)){const form=document.querySelector('#v2-'+section+'-form');if(!form)continue;form.addEventListener('submit',e=>submit(section,e));document.querySelector('#v2-'+section+'-reset')?.addEventListener('click',()=>setForm(section,{}))}
document.querySelector('#v2-storage-check')?.addEventListener('click',diagnostics);
document.querySelectorAll('.tab-btn[data-tab]').forEach(b=>b.addEventListener('click',()=>{const tab=b.dataset.tab;if(tab in tables||tab==='storage')activate(tab);if(tab==='overview')refreshOverview();if(tab==='settings')loadSiteSettings()}));
supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN')queueMicrotask(refreshOverview);authorized=false;if(event==='SIGNED_OUT')for(const section of Object.keys(tables))document.querySelector('#v2-'+section+'-list')?.replaceChildren(E('p','Sign in to view records.'))});
